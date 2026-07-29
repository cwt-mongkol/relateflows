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

  // Insert WHERE before ORDER BY / LIMIT / OFFSET / GROUP BY if present
  const hasWhere = /\bWHERE\b/i.test(text);
  if (hasWhere) {
    // Add AND tenant_id before ORDER BY/LIMIT/etc
    const insertPoint = text.search(/\bORDER\s+BY\b|\bLIMIT\b|\bOFFSET\b|\bGROUP\s+BY\b/i);
    const newParams = [...params, tenantId];
    const paramIdx = newParams.length;
    const clause = ` AND tenant_id = $${paramIdx}`;
    if (insertPoint >= 0) {
      const text2 = text.slice(0, insertPoint) + clause + text.slice(insertPoint);
      return { text: text2, params: newParams };
    }
    return { text: `${text}${clause}`, params: newParams };
  }
  const clause = ' WHERE tenant_id = $';
  const insertPoint = text.search(/\bORDER\s+BY\b|\bLIMIT\b|\bOFFSET\b|\bGROUP\s+BY\b/i);
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
