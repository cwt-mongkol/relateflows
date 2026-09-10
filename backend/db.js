import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AsyncLocalStorage } from 'async_hooks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString && !process.env.DB_HOST && !process.env.DB_USER && !process.env.DB_PASSWORD && !process.env.DB_NAME) {
  console.error('FATAL: Database not configured. Set DATABASE_URL or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME environment variables.');
  process.exit(1);
}

const poolConfig = connectionString
  ? { connectionString }
  : {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT || '5432'),
    };

poolConfig.max = parseInt(process.env.DB_POOL_MAX || '50');
poolConfig.idleTimeoutMillis = parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000');
poolConfig.connectionTimeoutMillis = parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '10000');

const realPool = new Pool(poolConfig);

export const tenantStorage = new AsyncLocalStorage();

// Auto-scope: automatically add WHERE tenant_id to queries when tenant context is active
const TENANT_SCOPED_TABLES = new Set([
  'deals', 'contacts', 'activities', 'tasks', 'workflows',
  'tb_products', 'tb_appointments', 'tb_categories', 'customer_tags',
  'social_channels', 'user_channel_access', 'allocation_history',
  'google_calendar_tokens', 'custom_objects', 'custom_fields',
  'custom_records', 'metrics', 'tenant_settings', 'lead_tags',
  'audit_log', 'companies',
  'cs_admin_schedules', 'cs_admin_time_logs', 'cs_chat_sessions', 'cs_chat_messages',
  'sales_rep_allocation_status',
  'pipeline_stages', 'leads', 'messages',
  'workflow_executions', 'notifications',
  'pipelines', 'lead_scoring_rules',
  'webhook_subscriptions', 'webhook_deliveries', 'api_keys',
]);

function scopeQuery(text, params, tenantId) {
  if (!tenantId) return { text, params };
  // Skip queries that already explicitly reference tenant_id in WHERE
  if (/\bWHERE\b/i.test(text) && /\btenant_id\b/i.test(text)) return { text, params };

  const upper = text.trim().toUpperCase();
  // Only scope SELECT, UPDATE, DELETE on known tenant tables
  const isDML = upper.startsWith('SELECT') || upper.startsWith('UPDATE') || upper.startsWith('DELETE');
  if (!isDML) return { text, params };

  const tableMatch = text.match(/\bFROM\s+(\w+)/i) || text.match(/\bUPDATE\s+(\w+)/i) || text.match(/\bDELETE\s+FROM\s+(\w+)/i);
  if (!tableMatch || !TENANT_SCOPED_TABLES.has(tableMatch[1].toLowerCase())) return { text, params };

  // Insert WHERE before ORDER BY / LIMIT / OFFSET / GROUP BY / RETURNING if present
  // (RETURNING matters for UPDATE ... WHERE ... RETURNING, common on PATCH routes — appending
  // "AND tenant_id = $N" after the RETURNING column list would otherwise produce invalid SQL)
  const INSERT_POINT_RE = /\bORDER\s+BY\b|\bLIMIT\b|\bOFFSET\b|\bGROUP\s+BY\b|\bRETURNING\b/i;
  const hasWhere = /\bWHERE\b/i.test(text);
  if (hasWhere) {
    // Add AND tenant_id before ORDER BY/LIMIT/RETURNING/etc
    const insertPoint = text.search(INSERT_POINT_RE);
    const newParams = [...params, tenantId];
    const paramIdx = newParams.length;
    const clause = ` AND tenant_id = $${paramIdx} `;
    if (insertPoint >= 0) {
      const text2 = text.slice(0, insertPoint) + clause + text.slice(insertPoint);
      return { text: text2, params: newParams };
    }
    return { text: `${text}${clause}`, params: newParams };
  }
  const clause = ' WHERE tenant_id = $';
  const insertPoint = text.search(INSERT_POINT_RE);
  const newParams = [...params, tenantId];
  const paramIdx = newParams.length;
  if (insertPoint >= 0) {
    const text2 = text.slice(0, insertPoint) + `${clause}${paramIdx} ` + text.slice(insertPoint);
    return { text: text2, params: newParams };
  }
  return { text: `${text}${clause}${paramIdx}`, params: newParams };
}

const pool = new Proxy(realPool, {
  get(target, prop) {
    if (prop === 'query') {
      const fn = async (queryText, queryParams, callback) => {
        const store = tenantStorage.getStore();
        const client = store?.client || target;
        const tenantId = store?.tenantId || '';
        const scoped = scopeQuery(queryText, queryParams || [], tenantId);
        const cb = typeof queryParams === 'function' ? queryParams : callback;
        const args = cb ? [scoped.text, scoped.params, cb] : [scoped.text, scoped.params];
        return client.query.apply(client, args);
      };
      // Preserve property access for pool.query (e.g. pool.query.bind(...))
      fn.bind = target.query.bind.bind(target.query);
      return fn;
    }
    const val = target[prop];
    return typeof val === 'function' ? val.bind(target) : val;
  }
});

const SCHEMA_VERSION = 4;

async function getAppliedVersion() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_versions (
        id SERIAL PRIMARY KEY,
        version INT NOT NULL,
        applied_at TIMESTAMP DEFAULT NOW()
      )
    `);
    const result = await pool.query('SELECT MAX(version) AS v FROM schema_versions');
    return result.rows[0]?.v || 0;
  } catch {
    return 0;
  }
}

async function applyMigrations(currentVersion) {
  if (currentVersion < 1) {
    console.log('Applying schema version 1...');
    const sqlPath = path.join(__dirname, 'init.sql');
    const initSql = fs.readFileSync(sqlPath, 'utf8');
    const statements = initSql.split(';').map(s => {
      const lines = s.split('\n').filter(l => !l.trim().startsWith('--'));
      return lines.join('\n').trim();
    }).filter(s => s.length > 0);

    for (const stmt of statements) {
      try {
        await pool.query(stmt);
      } catch (err) {
        if (err.code === '42P07' || err.code === '42710' || err.message?.includes('already exists')) {
          continue;
        }
        if (err.message?.includes('already exists') || err.message?.includes('duplicate')) {
          continue;
        }
        throw err;
      }
    }
    await pool.query('INSERT INTO schema_versions (version) VALUES (1)');
    console.log('Schema version 1 applied.');
  }

  if (currentVersion < 2) {
    console.log('Applying schema version 2 (RLS for missing tables)...');
    const rlsStatements = [
      "ALTER TABLE metrics ENABLE ROW LEVEL SECURITY",
      "ALTER TABLE custom_objects ENABLE ROW LEVEL SECURITY",
      "ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY",
      "ALTER TABLE custom_records ENABLE ROW LEVEL SECURITY",
      "ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY",
      `DROP POLICY IF EXISTS tenant_isolation ON metrics`,
      `CREATE POLICY tenant_isolation ON metrics FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar)`,
      `DROP POLICY IF EXISTS tenant_isolation ON custom_objects`,
      `CREATE POLICY tenant_isolation ON custom_objects FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar)`,
      `DROP POLICY IF EXISTS tenant_isolation ON custom_fields`,
      `CREATE POLICY tenant_isolation ON custom_fields FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar)`,
      `DROP POLICY IF EXISTS tenant_isolation ON custom_records`,
      `CREATE POLICY tenant_isolation ON custom_records FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar)`,
      `DROP POLICY IF EXISTS tenant_isolation ON tenant_settings`,
      `CREATE POLICY tenant_isolation ON tenant_settings FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar)`,
    ];
    for (const stmt of rlsStatements) {
      try {
        await pool.query(stmt);
      } catch (err) {
        if (err.message?.includes('already exists')) continue;
        console.warn('RLS migration warning:', err.message);
      }
    }
    await pool.query('INSERT INTO schema_versions (version) VALUES (2)');
    console.log('Schema version 2 applied.');
  }

  if (currentVersion < 3) {
    console.log('Applying schema version 3 (nullable lead_id in tb_products)...');
    try {
      await pool.query('ALTER TABLE tb_products ALTER COLUMN lead_id DROP NOT NULL');
      await pool.query('INSERT INTO schema_versions (version) VALUES (3)');
      console.log('Schema version 3 applied.');
    } catch (err) {
      console.warn('Migration v3 warning:', err.message);
    }
  }

  if (currentVersion < 5) {
    console.log('Applying schema version 5 (chatbot tables)...');
    const chatStatements = [
      `CREATE TABLE IF NOT EXISTS chat_sessions (
          id VARCHAR(50) PRIMARY KEY,
          tenant_id VARCHAR(50) REFERENCES tenant_companies(id) ON DELETE CASCADE,
          user_id VARCHAR(50) NOT NULL,
          title VARCHAR(255) DEFAULT 'New Chat',
          mode VARCHAR(20) DEFAULT 'tenant' CHECK (mode IN ('tenant', 'global')),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_chat_sessions_tenant ON chat_sessions(tenant_id)`,
      `CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id)`,
      `CREATE TABLE IF NOT EXISTS chat_messages (
          id VARCHAR(50) PRIMARY KEY,
          session_id VARCHAR(50) NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
          tenant_id VARCHAR(50) REFERENCES tenant_companies(id) ON DELETE CASCADE,
          role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
          content TEXT NOT NULL,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id)`,
      `CREATE INDEX IF NOT EXISTS idx_chat_messages_tenant ON chat_messages(tenant_id)`,
      `CREATE TABLE IF NOT EXISTS knowledge_chunks (
          id SERIAL PRIMARY KEY,
          tenant_id VARCHAR(50) REFERENCES tenant_companies(id) ON DELETE CASCADE,
          source_type VARCHAR(50) NOT NULL,
          source_id VARCHAR(50) DEFAULT '',
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          keywords TEXT[] DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_knowledge_tenant ON knowledge_chunks(tenant_id)`,
      `CREATE INDEX IF NOT EXISTS idx_knowledge_source ON knowledge_chunks(tenant_id, source_type)`,
      `ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY`,
      `DROP POLICY IF EXISTS tenant_isolation ON chat_sessions`,
      `CREATE POLICY tenant_isolation ON chat_sessions FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar)`,
      `DROP POLICY IF EXISTS tenant_isolation ON chat_messages`,
      `CREATE POLICY tenant_isolation ON chat_messages FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar)`,
      `DROP POLICY IF EXISTS tenant_isolation ON knowledge_chunks`,
      `CREATE POLICY tenant_isolation ON knowledge_chunks FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar)`,
    ];
    for (const stmt of chatStatements) {
      try {
        await pool.query(stmt);
      } catch (err) {
        if (err.message?.includes('already exists')) continue;
        console.warn('Chat migration warning:', err.message);
      }
    }
    await pool.query('INSERT INTO schema_versions (version) VALUES (5)');
    console.log('Schema version 5 applied.');
  }

  if (currentVersion < 4) {
    console.log('Applying schema version 4 (created_at for contacts)...');
    try {
      await pool.query("ALTER TABLE contacts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()");
      await pool.query("UPDATE contacts SET created_at = NOW() WHERE created_at IS NULL");
      await pool.query('INSERT INTO schema_versions (version) VALUES (4)');
      console.log('Schema version 4 applied.');
    } catch (err) {
      console.warn('Migration v4 warning:', err.message);
    }
  }

  if (currentVersion < 6) {
    console.log('Applying schema version 6 (CS admin support tables)...');
    const csStatements = [
      `CREATE TABLE IF NOT EXISTS cs_admin_schedules (
          id VARCHAR(50) PRIMARY KEY,
          user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          tenant_id VARCHAR(50) REFERENCES tenant_companies(id) ON DELETE CASCADE,
          day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(user_id, tenant_id, day_of_week)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_cs_admin_schedules_user ON cs_admin_schedules(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_cs_admin_schedules_tenant ON cs_admin_schedules(tenant_id)`,
      `CREATE TABLE IF NOT EXISTS cs_admin_time_logs (
          id VARCHAR(50) PRIMARY KEY,
          user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          tenant_id VARCHAR(50) REFERENCES tenant_companies(id) ON DELETE CASCADE,
          clock_in TIMESTAMP NOT NULL DEFAULT NOW(),
          clock_out TIMESTAMP,
          notes TEXT DEFAULT '',
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed')),
          created_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_cs_admin_logs_user ON cs_admin_time_logs(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_cs_admin_logs_tenant ON cs_admin_time_logs(tenant_id)`,
      `CREATE TABLE IF NOT EXISTS cs_chat_sessions (
          id VARCHAR(50) PRIMARY KEY,
          tenant_id VARCHAR(50) REFERENCES tenant_companies(id) ON DELETE CASCADE,
          contact_id VARCHAR(50) REFERENCES contacts(id) ON DELETE SET NULL,
          contact_name VARCHAR(255) NOT NULL,
          contact_channel VARCHAR(50) DEFAULT 'web',
          assigned_to VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
          status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'assigned', 'active', 'closed')),
          priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
          metadata JSONB DEFAULT '{}',
          first_response_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          assigned_at TIMESTAMP,
          closed_at TIMESTAMP,
          updated_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_cs_chat_sessions_tenant ON cs_chat_sessions(tenant_id)`,
      `CREATE INDEX IF NOT EXISTS idx_cs_chat_sessions_assigned ON cs_chat_sessions(assigned_to)`,
      `CREATE INDEX IF NOT EXISTS idx_cs_chat_sessions_status ON cs_chat_sessions(status)`,
      `CREATE TABLE IF NOT EXISTS cs_chat_messages (
          id VARCHAR(50) PRIMARY KEY,
          session_id VARCHAR(50) NOT NULL REFERENCES cs_chat_sessions(id) ON DELETE CASCADE,
          tenant_id VARCHAR(50) REFERENCES tenant_companies(id) ON DELETE CASCADE,
          sender_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
          sender_name VARCHAR(255) NOT NULL,
          sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('cs_admin', 'customer', 'system')),
          content TEXT NOT NULL,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_cs_chat_messages_session ON cs_chat_messages(session_id)`,
      `CREATE INDEX IF NOT EXISTS idx_cs_chat_messages_tenant ON cs_chat_messages(tenant_id)`,
      `ALTER TABLE cs_admin_schedules ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE cs_admin_time_logs ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE cs_chat_sessions ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE cs_chat_messages ENABLE ROW LEVEL SECURITY`,
      `DROP POLICY IF EXISTS tenant_isolation ON cs_admin_schedules`,
      `CREATE POLICY tenant_isolation ON cs_admin_schedules FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar)`,
      `DROP POLICY IF EXISTS tenant_isolation ON cs_admin_time_logs`,
      `CREATE POLICY tenant_isolation ON cs_admin_time_logs FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar)`,
      `DROP POLICY IF EXISTS tenant_isolation ON cs_chat_sessions`,
      `CREATE POLICY tenant_isolation ON cs_chat_sessions FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar)`,
      `DROP POLICY IF EXISTS tenant_isolation ON cs_chat_messages`,
      `CREATE POLICY tenant_isolation ON cs_chat_messages FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar)`,
    ];
    for (const stmt of csStatements) {
      try {
        await pool.query(stmt);
      } catch (err) {
        if (err.message?.includes('already exists')) continue;
        console.warn('CS Admin migration warning:', err.message);
      }
    }
    await pool.query('INSERT INTO schema_versions (version) VALUES (6)');
    console.log('Schema version 6 applied.');
  }

  if (currentVersion < 7) {
    console.log('Applying schema version 7 (lead allocation system)...');
    const v7Statements = [
      `CREATE TABLE IF NOT EXISTS sales_rep_allocation_status (
          id VARCHAR(50) PRIMARY KEY,
          user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          tenant_id VARCHAR(50) REFERENCES tenant_companies(id) ON DELETE CASCADE,
          is_accepting BOOLEAN DEFAULT true,
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(user_id, tenant_id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_sales_rep_alloc_status_tenant ON sales_rep_allocation_status(tenant_id)`,
      `CREATE INDEX IF NOT EXISTS idx_sales_rep_alloc_status_user ON sales_rep_allocation_status(user_id)`,
      `ALTER TABLE tenant_companies ADD COLUMN IF NOT EXISTS allocation_round_robin_idx INTEGER DEFAULT 0`,
      `ALTER TABLE sales_rep_allocation_status ENABLE ROW LEVEL SECURITY`,
      `DROP POLICY IF EXISTS tenant_isolation ON sales_rep_allocation_status`,
      `CREATE POLICY tenant_isolation ON sales_rep_allocation_status FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar)`,
    ];
    for (const stmt of v7Statements) {
      try {
        await pool.query(stmt);
      } catch (err) {
        if (err.message?.includes('already exists')) continue;
        console.warn('Allocation migration warning:', err.message);
      }
    }
    await pool.query('INSERT INTO schema_versions (version) VALUES (7)');
    console.log('Schema version 7 applied.');
  }

  if (currentVersion < 8) {
    console.log('Applying schema version 8 (real inbox: leads, messages, pipeline stages, activity linking)...');
    const v8Statements = [
      `CREATE TABLE IF NOT EXISTS pipeline_stages (
          id VARCHAR(50) NOT NULL,
          tenant_id VARCHAR(50) NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
          label VARCHAR(100) NOT NULL,
          color VARCHAR(20) DEFAULT '#94a3b8',
          sort_order INTEGER DEFAULT 0,
          is_closed_won BOOLEAN DEFAULT false,
          is_closed_lost BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW(),
          PRIMARY KEY (tenant_id, id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_pipeline_stages_tenant ON pipeline_stages(tenant_id)`,
      `CREATE TABLE IF NOT EXISTS leads (
          id VARCHAR(50) PRIMARY KEY,
          tenant_id VARCHAR(50) REFERENCES tenant_companies(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          avatar TEXT DEFAULT '',
          channel VARCHAR(20) NOT NULL,
          channel_id INTEGER REFERENCES social_channels(id) ON DELETE SET NULL,
          external_contact_id VARCHAR(255) DEFAULT '',
          contact_id VARCHAR(50) REFERENCES contacts(id) ON DELETE SET NULL,
          assigned_to VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
          is_allocated BOOLEAN DEFAULT false,
          status VARCHAR(30) DEFAULT 'new',
          lead_score INTEGER DEFAULT 0,
          last_message TEXT DEFAULT '',
          last_message_time TIMESTAMP,
          unread_count INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(tenant_id, channel_id, external_contact_id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_leads_tenant ON leads(tenant_id)`,
      `CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to)`,
      `CREATE TABLE IF NOT EXISTS messages (
          id VARCHAR(50) PRIMARY KEY,
          tenant_id VARCHAR(50) REFERENCES tenant_companies(id) ON DELETE CASCADE,
          lead_id VARCHAR(50) NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
          channel VARCHAR(20) NOT NULL,
          direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
          sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('contact', 'agent', 'system')),
          sender_name VARCHAR(255) DEFAULT '',
          sender_avatar TEXT DEFAULT '',
          content TEXT NOT NULL,
          raw_payload JSONB DEFAULT '{}',
          is_read BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_messages_lead ON messages(tenant_id, lead_id, created_at)`,
      `ALTER TABLE activities ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50) DEFAULT ''`,
      `ALTER TABLE activities ADD COLUMN IF NOT EXISTS entity_id VARCHAR(50) DEFAULT ''`,
      `CREATE INDEX IF NOT EXISTS idx_activities_entity ON activities(tenant_id, entity_type, entity_id)`,
      `ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE leads ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE messages ENABLE ROW LEVEL SECURITY`,
      `DROP POLICY IF EXISTS tenant_isolation ON pipeline_stages`,
      `CREATE POLICY tenant_isolation ON pipeline_stages FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar)`,
      `DROP POLICY IF EXISTS tenant_isolation ON leads`,
      `CREATE POLICY tenant_isolation ON leads FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar)`,
      `DROP POLICY IF EXISTS tenant_isolation ON messages`,
      `CREATE POLICY tenant_isolation ON messages FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar)`,
    ];
    for (const stmt of v8Statements) {
      try {
        await pool.query(stmt);
      } catch (err) {
        if (err.message?.includes('already exists')) continue;
        console.warn('v8 migration warning:', err.message);
      }
    }

    // Seed default pipeline stages for every tenant that doesn't have any yet
    // (mirrors INITIAL_STAGES from src/data/mockData.ts so existing deals keep resolving to a label)
    const DEFAULT_STAGES = [
      { id: 'lead_in', label: 'Lead In', color: '#94a3b8', sort_order: 0, is_closed_won: false, is_closed_lost: false },
      { id: 'contacted', label: 'Contacted', color: '#60a5fa', sort_order: 1, is_closed_won: false, is_closed_lost: false },
      { id: 'proposal', label: 'Proposal', color: '#2563eb', sort_order: 2, is_closed_won: false, is_closed_lost: false },
      { id: 'negotiation', label: 'Negotiation', color: '#f59e0b', sort_order: 3, is_closed_won: false, is_closed_lost: false },
      { id: 'closed_won', label: 'Closed Won', color: '#10b981', sort_order: 4, is_closed_won: true, is_closed_lost: false },
      { id: 'closed_lost', label: 'Closed Lost', color: '#fb7185', sort_order: 5, is_closed_won: false, is_closed_lost: true },
    ];
    try {
      const tenants = await pool.query('SELECT id FROM tenant_companies');
      for (const t of tenants.rows) {
        const existing = await pool.query('SELECT 1 FROM pipeline_stages WHERE tenant_id = $1 LIMIT 1', [t.id]);
        if (existing.rows.length > 0) continue;
        for (const s of DEFAULT_STAGES) {
          await pool.query(
            `INSERT INTO pipeline_stages (id, tenant_id, label, color, sort_order, is_closed_won, is_closed_lost)
             VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (tenant_id, id) DO NOTHING`,
            [s.id, t.id, s.label, s.color, s.sort_order, s.is_closed_won, s.is_closed_lost]
          );
        }
      }
    } catch (err) {
      console.warn('v8 stage seed warning:', err.message);
    }

    await pool.query('INSERT INTO schema_versions (version) VALUES (8)');
    console.log('Schema version 8 applied.');
  }

  if (currentVersion < 9) {
    console.log('Applying schema version 9 (automation engine + notifications)...');
    const v9Statements = [
      `ALTER TABLE workflows ADD COLUMN IF NOT EXISTS trigger_type VARCHAR(50) DEFAULT ''`,
      `ALTER TABLE workflows ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT '[]'`,
      `ALTER TABLE workflows ADD COLUMN IF NOT EXISTS actions JSONB DEFAULT '[]'`,
      `CREATE TABLE IF NOT EXISTS workflow_executions (
          id VARCHAR(50) PRIMARY KEY,
          tenant_id VARCHAR(50) REFERENCES tenant_companies(id) ON DELETE CASCADE,
          workflow_id VARCHAR(50) REFERENCES workflows(id) ON DELETE CASCADE,
          event_type VARCHAR(50) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'success',
          actions_taken JSONB DEFAULT '[]',
          error_message TEXT DEFAULT '',
          entity_type VARCHAR(50) DEFAULT '',
          entity_id VARCHAR(50) DEFAULT '',
          created_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_workflow_executions_wf ON workflow_executions(tenant_id, workflow_id, created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_workflow_executions_entity ON workflow_executions(tenant_id, entity_type, entity_id)`,
      `CREATE TABLE IF NOT EXISTS notifications (
          id VARCHAR(50) PRIMARY KEY,
          tenant_id VARCHAR(50) REFERENCES tenant_companies(id) ON DELETE CASCADE,
          user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          body TEXT DEFAULT '',
          entity_type VARCHAR(50) DEFAULT '',
          entity_id VARCHAR(50) DEFAULT '',
          is_read BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(tenant_id, user_id, created_at DESC)`,
      `ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE notifications ENABLE ROW LEVEL SECURITY`,
      `DROP POLICY IF EXISTS tenant_isolation ON workflow_executions`,
      `CREATE POLICY tenant_isolation ON workflow_executions FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar)`,
      `DROP POLICY IF EXISTS tenant_isolation ON notifications`,
      `CREATE POLICY tenant_isolation ON notifications FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar)`,
    ];
    for (const stmt of v9Statements) {
      try {
        await pool.query(stmt);
      } catch (err) {
        if (err.message?.includes('already exists')) continue;
        console.warn('v9 migration warning:', err.message);
      }
    }
    await pool.query('INSERT INTO schema_versions (version) VALUES (9)');
    console.log('Schema version 9 applied.');
  }

  if (currentVersion < 10) {
    console.log('Applying schema version 10 (multiple pipelines)...');
    const v10Statements = [
      `CREATE TABLE IF NOT EXISTS pipelines (
          id VARCHAR(50) NOT NULL,
          tenant_id VARCHAR(50) NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
          name VARCHAR(100) NOT NULL,
          is_default BOOLEAN DEFAULT false,
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          PRIMARY KEY (tenant_id, id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_pipelines_tenant ON pipelines(tenant_id)`,
      `ALTER TABLE pipeline_stages ADD COLUMN IF NOT EXISTS pipeline_id VARCHAR(50) NOT NULL DEFAULT 'sales'`,
      `ALTER TABLE deals ADD COLUMN IF NOT EXISTS pipeline_id VARCHAR(50) NOT NULL DEFAULT 'sales'`,
      `ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY`,
      `DROP POLICY IF EXISTS tenant_isolation ON pipelines`,
      `CREATE POLICY tenant_isolation ON pipelines FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar)`,
    ];
    for (const stmt of v10Statements) {
      try {
        await pool.query(stmt);
      } catch (err) {
        if (err.message?.includes('already exists')) continue;
        console.warn('v10 migration warning:', err.message);
      }
    }

    // Every tenant gets a default "Sales Pipeline" — existing pipeline_stages/deals already default to
    // pipeline_id='sales' above, so this just makes that id resolvable before the FKs below are added.
    try {
      const tenants = await pool.query('SELECT id FROM tenant_companies');
      for (const t of tenants.rows) {
        await pool.query(
          `INSERT INTO pipelines (id, tenant_id, name, is_default, sort_order) VALUES ('sales', $1, 'Sales Pipeline', true, 0) ON CONFLICT (tenant_id, id) DO NOTHING`,
          [t.id]
        );
      }
    } catch (err) {
      console.warn('v10 pipeline seed warning:', err.message);
    }

    // Re-key pipeline_stages to (tenant_id, pipeline_id, id) now that stage ids are scoped per pipeline,
    // and FK both pipeline_stages and deals to the now-populated pipelines table.
    const v10bStatements = [
      `ALTER TABLE pipeline_stages DROP CONSTRAINT IF EXISTS pipeline_stages_pkey`,
      `ALTER TABLE pipeline_stages ADD PRIMARY KEY (tenant_id, pipeline_id, id)`,
      `ALTER TABLE pipeline_stages DROP CONSTRAINT IF EXISTS fk_pipeline_stages_pipeline`,
      `ALTER TABLE pipeline_stages ADD CONSTRAINT fk_pipeline_stages_pipeline FOREIGN KEY (tenant_id, pipeline_id) REFERENCES pipelines(tenant_id, id) ON DELETE CASCADE`,
      `ALTER TABLE deals DROP CONSTRAINT IF EXISTS fk_deals_pipeline`,
      `ALTER TABLE deals ADD CONSTRAINT fk_deals_pipeline FOREIGN KEY (tenant_id, pipeline_id) REFERENCES pipelines(tenant_id, id) ON DELETE RESTRICT`,
    ];
    for (const stmt of v10bStatements) {
      try {
        await pool.query(stmt);
      } catch (err) {
        if (err.message?.includes('already exists')) continue;
        console.warn('v10b migration warning:', err.message);
      }
    }
    await pool.query('INSERT INTO schema_versions (version) VALUES (10)');
    console.log('Schema version 10 applied.');
  }

  if (currentVersion < 11) {
    console.log('Applying schema version 11 (lead scoring rule engine)...');
    const v11Statements = [
      `CREATE TABLE IF NOT EXISTS lead_scoring_rules (
          id VARCHAR(50) NOT NULL,
          tenant_id VARCHAR(50) NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
          label VARCHAR(150) NOT NULL,
          event_type VARCHAR(50) NOT NULL,
          points INTEGER NOT NULL,
          conditions JSONB DEFAULT '[]',
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT NOW(),
          PRIMARY KEY (tenant_id, id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_lead_scoring_rules_tenant ON lead_scoring_rules(tenant_id, event_type)`,
      `ALTER TABLE lead_scoring_rules ENABLE ROW LEVEL SECURITY`,
      `DROP POLICY IF EXISTS tenant_isolation ON lead_scoring_rules`,
      `CREATE POLICY tenant_isolation ON lead_scoring_rules FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar)`,
    ];
    for (const stmt of v11Statements) {
      try {
        await pool.query(stmt);
      } catch (err) {
        if (err.message?.includes('already exists')) continue;
        console.warn('v11 migration warning:', err.message);
      }
    }

    // Seed default scoring rules (mirrors the spec: open chat +10 / reply +15 / allocated +5) for every
    // tenant that has none yet — a tenant that already added its own rules keeps them untouched.
    const DEFAULT_RULES = [
      { id: 'lead-created', label: 'New lead opened a chat', eventType: 'lead.created', points: 10 },
      { id: 'lead-replied', label: 'Lead replied to a message', eventType: 'lead.message_received', points: 15 },
      { id: 'lead-allocated', label: 'Lead allocated to a sales rep', eventType: 'lead.allocated', points: 5 },
    ];
    try {
      const tenants = await pool.query('SELECT id FROM tenant_companies');
      for (const t of tenants.rows) {
        const existing = await pool.query('SELECT 1 FROM lead_scoring_rules WHERE tenant_id = $1 LIMIT 1', [t.id]);
        if (existing.rows.length > 0) continue;
        for (const r of DEFAULT_RULES) {
          await pool.query(
            `INSERT INTO lead_scoring_rules (id, tenant_id, label, event_type, points) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (tenant_id, id) DO NOTHING`,
            [r.id, t.id, r.label, r.eventType, r.points]
          );
        }
      }
    } catch (err) {
      console.warn('v11 rule seed warning:', err.message);
    }
    await pool.query('INSERT INTO schema_versions (version) VALUES (11)');
    console.log('Schema version 11 applied.');
  }

  if (currentVersion < 12) {
    console.log('Applying schema version 12 (outbound webhooks)...');
    const v12Statements = [
      `CREATE TABLE IF NOT EXISTS webhook_subscriptions (
          id VARCHAR(50) NOT NULL,
          tenant_id VARCHAR(50) NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
          name VARCHAR(150) NOT NULL,
          event_type VARCHAR(50) NOT NULL,
          target_url TEXT NOT NULL,
          secret_encrypted TEXT DEFAULT '',
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT NOW(),
          PRIMARY KEY (tenant_id, id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_webhook_subs_tenant ON webhook_subscriptions(tenant_id, event_type)`,
      `CREATE TABLE IF NOT EXISTS webhook_deliveries (
          id VARCHAR(50) NOT NULL,
          tenant_id VARCHAR(50) NOT NULL,
          subscription_id VARCHAR(50) NOT NULL,
          event_type VARCHAR(50),
          payload JSONB DEFAULT '{}',
          status VARCHAR(20) DEFAULT 'pending',
          attempt_count INTEGER DEFAULT 0,
          last_status_code INTEGER,
          last_error TEXT DEFAULT '',
          next_retry_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          PRIMARY KEY (tenant_id, id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_sub ON webhook_deliveries(tenant_id, subscription_id, created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_retry ON webhook_deliveries(status, next_retry_at)`,
      `ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY`,
      `DROP POLICY IF EXISTS tenant_isolation ON webhook_subscriptions`,
      `CREATE POLICY tenant_isolation ON webhook_subscriptions FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar)`,
      `DROP POLICY IF EXISTS tenant_isolation ON webhook_deliveries`,
      `CREATE POLICY tenant_isolation ON webhook_deliveries FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar)`,
    ];
    for (const stmt of v12Statements) {
      try {
        await pool.query(stmt);
      } catch (err) {
        if (err.message?.includes('already exists')) continue;
        console.warn('v12 migration warning:', err.message);
      }
    }
    await pool.query('INSERT INTO schema_versions (version) VALUES (12)');
    console.log('Schema version 12 applied.');
  }

  if (currentVersion < 13) {
    console.log('Applying schema version 13 (public API + API keys)...');
    const v13Statements = [
      `CREATE TABLE IF NOT EXISTS api_keys (
          id VARCHAR(50) NOT NULL,
          tenant_id VARCHAR(50) NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
          name VARCHAR(150) NOT NULL,
          key_prefix VARCHAR(16) NOT NULL,
          key_hash TEXT NOT NULL,
          scopes JSONB DEFAULT '[]',
          status VARCHAR(20) DEFAULT 'active',
          last_used_at TIMESTAMP,
          created_by VARCHAR(50),
          created_at TIMESTAMP DEFAULT NOW(),
          PRIMARY KEY (tenant_id, id)
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash)`,
      `CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON api_keys(tenant_id)`,
      `ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY`,
      `DROP POLICY IF EXISTS tenant_isolation ON api_keys`,
      `CREATE POLICY tenant_isolation ON api_keys FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar)`,
    ];
    for (const stmt of v13Statements) {
      try {
        await pool.query(stmt);
      } catch (err) {
        if (err.message?.includes('already exists')) continue;
        console.warn('v13 migration warning:', err.message);
      }
    }
    await pool.query('INSERT INTO schema_versions (version) VALUES (13)');
    console.log('Schema version 13 applied.');
  }

  if (currentVersion < 14) {
    console.log('Applying schema version 14 (permissions for webhooks + API keys)...');
    try {
      await pool.query(`
        INSERT INTO permissions (module, action, label) VALUES
            ('automation_webhooks', 'view', 'View Outbound Webhooks'),
            ('automation_webhooks', 'manage', 'Create, Edit & Delete Outbound Webhooks'),
            ('settings_developer', 'manage_api_keys', 'Manage Public API Keys')
        ON CONFLICT (module, action) DO NOTHING
      `);
      // Super Admin + Administrator: full access. Manager: webhooks yes, API keys no (mirrors how
      // settings_integrations_api_keys is withheld from Manager) — same shape as the init.sql seed.
      await pool.query(`INSERT INTO role_permissions (role_id, permission_id) SELECT 1, id FROM permissions WHERE module IN ('automation_webhooks', 'settings_developer') ON CONFLICT DO NOTHING`);
      await pool.query(`INSERT INTO role_permissions (role_id, permission_id) SELECT 2, id FROM permissions WHERE module IN ('automation_webhooks', 'settings_developer') ON CONFLICT DO NOTHING`);
      await pool.query(`INSERT INTO role_permissions (role_id, permission_id) SELECT 3, id FROM permissions WHERE module = 'automation_webhooks' ON CONFLICT DO NOTHING`);
    } catch (err) {
      console.warn('v14 migration warning:', err.message);
    }
    await pool.query('INSERT INTO schema_versions (version) VALUES (14)');
    console.log('Schema version 14 applied.');
  }
}

export async function initDb() {
  let retries = 30;
  while (retries) {
    try {
      console.log('Testing connection to database...');
      await pool.query('SELECT NOW()');
      console.log('Connected to PostgreSQL successfully.');
      break;
    } catch (err) {
      console.log(`Database connection failed. Retrying in 3 seconds... (Retries left: ${retries - 1})`);
      retries -= 1;
      if (retries === 0) {
        throw new Error('Could not connect to PostgreSQL database. Exiting.');
      }
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  try {
    const currentVersion = await getAppliedVersion();
    await applyMigrations(currentVersion);
    console.log('Database schema up to date.');
  } catch (err) {
    console.error('Failed to run database migrations:', err);
    throw err;
  }
}

export default pool;
export { pool };
