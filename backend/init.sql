-- Table Schemas

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    token VARCHAR(500) NOT NULL UNIQUE,
    user_id VARCHAR(50) NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

CREATE TABLE IF NOT EXISTS tb_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tb_products (
    id SERIAL PRIMARY KEY,
    lead_id VARCHAR(50) NOT NULL,
    category_id INTEGER REFERENCES tb_categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    quantity INTEGER DEFAULT 1,
    price DECIMAL(12,2) DEFAULT 0,
    description TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_lead ON tb_products(lead_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON tb_products(category_id);

CREATE TABLE IF NOT EXISTS tb_appointments (
    id SERIAL PRIMARY KEY,
    lead_id VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    type VARCHAR(50) DEFAULT 'meeting',
    status VARCHAR(50) DEFAULT 'scheduled',
    location TEXT DEFAULT '',
    google_event_id VARCHAR(255) DEFAULT '',
    created_by VARCHAR(50) DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_lead ON tb_appointments(lead_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start ON tb_appointments(start_time);

CREATE TABLE IF NOT EXISTS companies (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    industry VARCHAR(255),
    size VARCHAR(255),
    annual_revenue BIGINT,
    location VARCHAR(255),
    contacts_count INTEGER DEFAULT 0,
    total_deals_value INTEGER DEFAULT 0,
    logo TEXT
);

CREATE TABLE IF NOT EXISTS contacts (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(255),
    company VARCHAR(255),
    role VARCHAR(255),
    lifecycle_stage VARCHAR(50),
    lead_score INTEGER DEFAULT 0,
    status VARCHAR(50),
    avatar TEXT,
    last_contacted VARCHAR(255),
    total_deals_value INTEGER DEFAULT 0,
    tags JSONB DEFAULT '[]'::jsonb,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS deals (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    value INTEGER DEFAULT 0,
    stage VARCHAR(50) NOT NULL,
    probability INTEGER DEFAULT 0,
    owner JSONB NOT NULL,
    lead_source VARCHAR(255),
    priority VARCHAR(50),
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    created_at VARCHAR(50),
    expected_close_date VARCHAR(50),
    notes TEXT,
    tags JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS activities (
    id VARCHAR(50) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    timestamp VARCHAR(255),
    "user" JSONB NOT NULL,
    target_name VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS workflows (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_cond VARCHAR(255),
    action VARCHAR(255),
    status VARCHAR(50) NOT NULL,
    executions_count INTEGER DEFAULT 0,
    last_executed VARCHAR(255),
    category VARCHAR(255),
    accent_color VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS metrics (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    value VARCHAR(255),
    subtext VARCHAR(255),
    change VARCHAR(50),
    is_positive BOOLEAN DEFAULT TRUE,
    icon_name VARCHAR(50)
);

-- Seed Data (Cleared for Production)

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
    due_date VARCHAR(50) DEFAULT '',
    assignee JSONB DEFAULT '{}'::jsonb,
    related_to JSONB,
    created_at VARCHAR(50) DEFAULT (NOW()::date)
);

-- Migration updates
ALTER TABLE tb_appointments ADD COLUMN IF NOT EXISTS guests JSONB DEFAULT '[]'::jsonb;

-- ===== RBAC & Multi-Channel Schema =====

-- 1. Roles / Positions
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Permissions (module:action)
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    label VARCHAR(100) NOT NULL,
    UNIQUE(module, action)
);

-- 3. Role ↔ Permission mapping
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE(role_id, permission_id)
);

-- 4. Per-user permission overrides (allow (+) or deny (-))
CREATE TABLE IF NOT EXISTS user_permissions_override (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    effect VARCHAR(10) NOT NULL CHECK (effect IN ('allow', 'deny')),
    UNIQUE(user_id, permission_id)
);

-- 5. Users table (extends the JWT-based users)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) DEFAULT '',
    avatar TEXT DEFAULT '',
    provider VARCHAR(50) DEFAULT '',
    role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. Social Channels (multiple per type)
CREATE TABLE IF NOT EXISTS social_channels (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('facebook', 'instagram', 'line')),
    display_name VARCHAR(255) NOT NULL,
    credentials TEXT NOT NULL DEFAULT '{}',
    page_id VARCHAR(255) DEFAULT '',
    status VARCHAR(20) DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error', 'expired')),
    webhook_verify_token VARCHAR(255) DEFAULT '',
    last_health_check TIMESTAMP,
    created_by VARCHAR(50) DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. User ↔ Channel access mapping
CREATE TABLE IF NOT EXISTS user_channel_access (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_id INTEGER NOT NULL REFERENCES social_channels(id) ON DELETE CASCADE,
    granted_by VARCHAR(50) DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, channel_id)
);

-- 8. Audit log
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) DEFAULT '',
    target_id VARCHAR(50) DEFAULT '',
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(50) DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_user_channel_access_user ON user_channel_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_channel_access_channel ON user_channel_access(channel_id);
CREATE INDEX IF NOT EXISTS idx_social_channels_type ON social_channels(type);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);

-- Google Calendar tokens table
CREATE TABLE IF NOT EXISTS google_calendar_tokens (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL UNIQUE,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    scope TEXT,
    token_type VARCHAR(50) DEFAULT 'Bearer',
    expiry_date BIGINT,
    calendar_id VARCHAR(255) DEFAULT 'primary',
    connected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ===== Multi-Tenancy Schema =====

-- Tenant companies (the organizations that own an instance of RelateFlows)
CREATE TABLE IF NOT EXISTS tenant_companies (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    logo_url TEXT DEFAULT '',
    domain VARCHAR(255) DEFAULT '',
    brand_color_primary VARCHAR(7) DEFAULT '#2563EB',
    brand_color_secondary VARCHAR(7) DEFAULT '#F59E0B',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enterprise accounts (parent account owning multiple tenant companies)
CREATE TABLE IF NOT EXISTS enterprise_accounts (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) DEFAULT '',
    phone VARCHAR(50) DEFAULT '',
    billing_plan VARCHAR(50) DEFAULT 'free',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE tenant_companies ADD COLUMN IF NOT EXISTS enterprise_account_id VARCHAR(50) REFERENCES enterprise_accounts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tenant_companies_enterprise ON tenant_companies(enterprise_account_id);

-- User-tenant access mapping (many-to-many, replaces users.tenant_id as single source)
CREATE TABLE IF NOT EXISTS user_tenants (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id VARCHAR(50) NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    is_default BOOLEAN DEFAULT FALSE,
    role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, tenant_id)
);
CREATE INDEX IF NOT EXISTS idx_user_tenants_user ON user_tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_tenant ON user_tenants(tenant_id);

-- Add tenant_id to all tenant-scoped tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) REFERENCES tenant_companies(id) ON DELETE CASCADE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) REFERENCES tenant_companies(id) ON DELETE CASCADE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) REFERENCES tenant_companies(id) ON DELETE CASCADE;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) REFERENCES tenant_companies(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) REFERENCES tenant_companies(id) ON DELETE CASCADE;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) REFERENCES tenant_companies(id) ON DELETE CASCADE;
ALTER TABLE metrics ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) REFERENCES tenant_companies(id) ON DELETE CASCADE;
ALTER TABLE social_channels ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) REFERENCES tenant_companies(id) ON DELETE CASCADE;
ALTER TABLE user_channel_access ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) REFERENCES tenant_companies(id) ON DELETE CASCADE;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) REFERENCES tenant_companies(id) ON DELETE CASCADE;
ALTER TABLE tb_appointments ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) REFERENCES tenant_companies(id) ON DELETE CASCADE;
ALTER TABLE tb_products ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) REFERENCES tenant_companies(id) ON DELETE CASCADE;
ALTER TABLE tb_categories ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) REFERENCES tenant_companies(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS google_calendar_tokens ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) REFERENCES tenant_companies(id) ON DELETE CASCADE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) REFERENCES tenant_companies(id) ON DELETE CASCADE;

-- Indexes for tenant isolation performance
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deals_tenant ON deals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activities_tenant ON activities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_tenant ON tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workflows_tenant ON workflows(tenant_id);
CREATE INDEX IF NOT EXISTS idx_metrics_tenant ON metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_social_channels_tenant ON social_channels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant ON audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_companies_tenant ON companies(tenant_id);

-- ===== Dynamic Objects / Custom Fields Schema =====

CREATE TABLE IF NOT EXISTS custom_objects (
    id VARCHAR(50) PRIMARY KEY,
    tenant_id VARCHAR(50) REFERENCES tenant_companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT DEFAULT '',
    icon VARCHAR(50) DEFAULT 'table',
    color VARCHAR(7) DEFAULT '#6366f1',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, slug)
);

CREATE TABLE IF NOT EXISTS custom_fields (
    id VARCHAR(50) PRIMARY KEY,
    tenant_id VARCHAR(50) REFERENCES tenant_companies(id) ON DELETE CASCADE,
    owner_type VARCHAR(100) NOT NULL,
    owner_id VARCHAR(50) NOT NULL DEFAULT '',
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    field_type VARCHAR(50) NOT NULL DEFAULT 'text',
    options JSONB DEFAULT '[]',
    reference_owner VARCHAR(100) DEFAULT '',
    required BOOLEAN DEFAULT false,
    placeholder VARCHAR(255) DEFAULT '',
    default_value TEXT DEFAULT '',
    ordering INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, owner_type, owner_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_cf_owner ON custom_fields(tenant_id, owner_type, owner_id);

CREATE TABLE IF NOT EXISTS custom_records (
    id VARCHAR(50) PRIMARY KEY,
    tenant_id VARCHAR(50) REFERENCES tenant_companies(id) ON DELETE CASCADE,
    object_id VARCHAR(50) REFERENCES custom_objects(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}',
    created_by VARCHAR(50) DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cr_object ON custom_records(tenant_id, object_id);

-- Tenant settings (encrypted integration keys, etc.)
CREATE TABLE IF NOT EXISTS tenant_settings (
    tenant_id VARCHAR(50) REFERENCES tenant_companies(id) ON DELETE CASCADE,
    key VARCHAR(255) NOT NULL,
    value_encrypted TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (tenant_id, key)
);

-- Enable Row-Level Security on tenant tables
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_channel_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE tb_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tb_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE tb_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies: each row's tenant_id must match the session variable
DROP POLICY IF EXISTS tenant_isolation ON contacts;
CREATE POLICY tenant_isolation ON contacts FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar);
DROP POLICY IF EXISTS tenant_isolation ON deals;
CREATE POLICY tenant_isolation ON deals FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar);
DROP POLICY IF EXISTS tenant_isolation ON activities;
CREATE POLICY tenant_isolation ON activities FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar);
DROP POLICY IF EXISTS tenant_isolation ON tasks;
CREATE POLICY tenant_isolation ON tasks FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar);
DROP POLICY IF EXISTS tenant_isolation ON workflows;
CREATE POLICY tenant_isolation ON workflows FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar);
DROP POLICY IF EXISTS tenant_isolation ON social_channels;
CREATE POLICY tenant_isolation ON social_channels FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar);
DROP POLICY IF EXISTS tenant_isolation ON user_channel_access;
CREATE POLICY tenant_isolation ON user_channel_access FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar);
DROP POLICY IF EXISTS tenant_isolation ON audit_log;
CREATE POLICY tenant_isolation ON audit_log FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar);
DROP POLICY IF EXISTS tenant_isolation ON tb_appointments;
CREATE POLICY tenant_isolation ON tb_appointments FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar);
DROP POLICY IF EXISTS tenant_isolation ON tb_products;
CREATE POLICY tenant_isolation ON tb_products FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar);
DROP POLICY IF EXISTS tenant_isolation ON tb_categories;
CREATE POLICY tenant_isolation ON tb_categories FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar);
DROP POLICY IF EXISTS tenant_isolation ON google_calendar_tokens;
CREATE POLICY tenant_isolation ON google_calendar_tokens FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar);
DROP POLICY IF EXISTS tenant_isolation ON companies;
CREATE POLICY tenant_isolation ON companies FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar);
DROP POLICY IF EXISTS tenant_isolation ON metrics;
CREATE POLICY tenant_isolation ON metrics FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar);
DROP POLICY IF EXISTS tenant_isolation ON custom_objects;
CREATE POLICY tenant_isolation ON custom_objects FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar);
DROP POLICY IF EXISTS tenant_isolation ON custom_fields;
CREATE POLICY tenant_isolation ON custom_fields FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar);
DROP POLICY IF EXISTS tenant_isolation ON custom_records;
CREATE POLICY tenant_isolation ON custom_records FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar);
DROP POLICY IF EXISTS tenant_isolation ON tenant_settings;
CREATE POLICY tenant_isolation ON tenant_settings FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar);

-- Seed: System Permissions (from permission matrix)
INSERT INTO permissions (module, action, label) VALUES
    ('dashboard', 'view', 'View Dashboard'),
    ('social_inbox', 'view_channel', 'View Social Inbox Channels'),
    ('social_inbox', 'reply', 'Reply via Social Inbox'),
    ('social_inbox', 'lead_allocation', 'Allocate Leads from Inbox'),
    ('pipeline', 'view_deals', 'View Deals'),
    ('pipeline', 'create_edit_deal', 'Create & Edit Deals'),
    ('pipeline', 'delete_deal', 'Delete Deals'),
    ('pipeline', 'stage_crud_settings', 'Manage Pipeline Stages'),
    ('contacts', 'view_search', 'View & Search Contacts'),
    ('contacts', 'create_edit', 'Create & Edit Contacts'),
    ('contacts', 'delete', 'Delete Contacts'),
    ('tasks', 'view', 'View Tasks'),
    ('tasks', 'create_assign_others', 'Create & Assign Tasks to Others'),
    ('tasks', 'edit_delete', 'Edit & Delete Tasks'),
    ('calendar', 'view_create_appointment', 'View & Create Appointments'),
    ('calendar', 'edit_delete_others_appointment', 'Edit & Delete Others'' Appointments'),
    ('calendar', 'google_sync_setup', 'Setup Google Calendar Sync'),
    ('workflows', 'view', 'View Workflows'),
    ('workflows', 'create_toggle_edit', 'Create, Toggle & Edit Workflows'),
    ('analytics', 'view', 'View Analytics'),
    ('settings_appearance', 'change_language_theme_own', 'Change Language & Theme'),
    ('settings_user_management', 'view_add_edit_deactivate_user', 'Manage Users'),
    ('settings_roles_permissions', 'create_edit_role_matrix', 'Manage Roles & Permissions'),
    ('settings_channel_management', 'add_remove_channel_credentials', 'Manage Social Channels'),
    ('settings_channel_access_matrix', 'map_user_channel', 'Manage Channel Access'),
    ('settings_integrations_api_keys', 'view_edit_credential_masked', 'Manage API Credentials'),
    ('audit_log', 'view', 'View Audit Log')
ON CONFLICT (module, action) DO NOTHING;

-- Seed: System Roles
--   role 1 = Super Admin (platform-wide, sees across all tenants)
--   role 2 = Administrator (full system within tenant)
--   role 3 = Manager (manage pipeline, team, tasks)
--   role 4 = CS Admin (social inbox, contacts, users, audit — plus support agent capabilities)
--   role 5 = Sales Rep (own pipeline, own contacts, own tasks)
INSERT INTO roles (id, name, description, is_system) VALUES
    (1, 'Super Admin', 'Platform-wide access — manages all tenant companies, sees all data across all organizations', TRUE),
    (2, 'Administrator', 'Full system access — all modules, all settings, full scope within company', TRUE),
    (3, 'Manager', 'Manage pipeline, team contacts, tasks, view team analytics, manage team channel access', TRUE),
    (4, 'CS Admin', 'Manage social inbox, contacts, tasks, calendar, users, channels, audit log — plus support agent capabilities', TRUE),
    (5, 'Sales Rep', 'View and edit own pipeline, own contacts, own tasks, reply in own channels', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Super Admin gets ALL permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions
ON CONFLICT DO NOTHING;

-- Seed: Administrator (role_id=2) gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions
ON CONFLICT DO NOTHING;

-- Seed: Manager (role_id=3) — all except stage_crud_settings, contacts_delete,
--   google_sync_setup, roles_permissions, channel_management, integrations_api_keys
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions WHERE NOT (
    module = 'pipeline' AND action = 'stage_crud_settings'
) AND NOT (
    module = 'contacts' AND action = 'delete'
) AND NOT (
    module = 'calendar' AND action = 'google_sync_setup'
) AND NOT (
    module = 'settings_roles_permissions' AND action = 'create_edit_role_matrix'
) AND NOT (
    module = 'settings_channel_management' AND action = 'add_remove_channel_credentials'
) AND NOT (
    module = 'settings_integrations_api_keys' AND action = 'view_edit_credential_masked'
)
ON CONFLICT DO NOTHING;

-- Seed: CS Admin (role_id=4) — social_inbox (all), pipeline (view_deals read-only),
--   contacts (search, create_edit), tasks (team), calendar (view_create + edit_delete_others),
--   workflows (view, create_toggle_edit), analytics (view), settings_user_management,
--   settings_channel_access_matrix, audit_log — plus support capabilities (view_channel, reply)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 4, id FROM permissions WHERE (
    (module = 'dashboard' AND action = 'view')
    OR (module = 'social_inbox' AND action IN ('view_channel', 'reply', 'lead_allocation'))
    OR (module = 'pipeline' AND action = 'view_deals')
    OR (module = 'contacts' AND action IN ('view_search', 'create_edit'))
    OR (module = 'tasks' AND action IN ('view', 'create_assign_others', 'edit_delete'))
    OR (module = 'calendar' AND action IN ('view_create_appointment', 'edit_delete_others_appointment'))
    OR (module = 'workflows' AND action IN ('view', 'create_toggle_edit'))
    OR (module = 'analytics' AND action = 'view')
    OR (module = 'settings_appearance' AND action = 'change_language_theme_own')
    OR (module = 'settings_user_management' AND action = 'view_add_edit_deactivate_user')
    OR (module = 'settings_channel_access_matrix' AND action = 'map_user_channel')
    OR (module = 'audit_log' AND action = 'view')
)
ON CONFLICT DO NOTHING;

-- Seed: Sales Rep (role_id=5) — dashboard, social_inbox (view+reply, NOT lead_allocation),
--   pipeline (view_deals, create_edit_deal — NOT delete_deal, NOT stage_crud_settings),
--   contacts (view_search, create_edit — NOT delete),
--   tasks (view, edit_delete — NOT create_assign_others),
--   calendar (view_create_appointment — NOT edit_delete_others),
--   settings_appearance
INSERT INTO role_permissions (role_id, permission_id)
SELECT 5, id FROM permissions WHERE (
    (module = 'dashboard' AND action = 'view')
    OR (module = 'social_inbox' AND action IN ('view_channel', 'reply'))
    OR (module = 'pipeline' AND action IN ('view_deals', 'create_edit_deal'))
    OR (module = 'contacts' AND action IN ('view_search', 'create_edit'))
    OR (module = 'tasks' AND action IN ('view', 'edit_delete'))
    OR (module = 'calendar' AND action = 'view_create_appointment')
    OR (module = 'settings_appearance' AND action = 'change_language_theme_own')
)
ON CONFLICT DO NOTHING;

-- Seed: Default tenant company (for existing single-tenant data)
INSERT INTO tenant_companies (id, name, slug, domain, brand_color_primary, brand_color_secondary, status) VALUES
    ('tenant-default-001', 'RelateFlows Demo Inc.', 'relateflows-demo', 'relateflows.com', '#2563EB', '#F59E0B', 'active')
ON CONFLICT (id) DO NOTHING;

-- Backfill existing data with default tenant_id
UPDATE users SET tenant_id = 'tenant-default-001' WHERE tenant_id IS NULL;
UPDATE contacts SET tenant_id = 'tenant-default-001' WHERE tenant_id IS NULL;
UPDATE deals SET tenant_id = 'tenant-default-001' WHERE tenant_id IS NULL;
UPDATE activities SET tenant_id = 'tenant-default-001' WHERE tenant_id IS NULL;
UPDATE tasks SET tenant_id = 'tenant-default-001' WHERE tenant_id IS NULL;
UPDATE workflows SET tenant_id = 'tenant-default-001' WHERE tenant_id IS NULL;
UPDATE metrics SET tenant_id = 'tenant-default-001' WHERE tenant_id IS NULL;
UPDATE social_channels SET tenant_id = 'tenant-default-001' WHERE tenant_id IS NULL;
UPDATE user_channel_access SET tenant_id = 'tenant-default-001' WHERE tenant_id IS NULL;
UPDATE audit_log SET tenant_id = 'tenant-default-001' WHERE tenant_id IS NULL;
UPDATE tb_appointments SET tenant_id = 'tenant-default-001' WHERE tenant_id IS NULL;
UPDATE tb_products SET tenant_id = 'tenant-default-001' WHERE tenant_id IS NULL;
UPDATE tb_categories SET tenant_id = 'tenant-default-001' WHERE tenant_id IS NULL;
UPDATE google_calendar_tokens SET tenant_id = 'tenant-default-001' WHERE tenant_id IS NULL;
UPDATE companies SET tenant_id = 'tenant-default-001' WHERE tenant_id IS NULL;

-- ===== Customer Tags (for CS to tag leads before allocation) =====
CREATE TABLE IF NOT EXISTS customer_tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#6366f1',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_tags (
    id SERIAL PRIMARY KEY,
    lead_id VARCHAR(50) NOT NULL,
    tag_id INTEGER NOT NULL REFERENCES customer_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(lead_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_tags_lead ON lead_tags(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tags_tag ON lead_tags(tag_id);

-- ===== Allocation History =====
CREATE TABLE IF NOT EXISTS allocation_history (
    id SERIAL PRIMARY KEY,
    lead_id VARCHAR(50) NOT NULL,
    sales_person_id VARCHAR(50) NOT NULL,
    sales_person_name VARCHAR(255) NOT NULL DEFAULT '',
    sales_person_avatar TEXT DEFAULT '',
    project_name VARCHAR(255) DEFAULT '',
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    notes TEXT DEFAULT '',
    is_reallocation BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alloc_lead ON allocation_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_alloc_sales ON allocation_history(sales_person_id);

-- Add tenant_id to new tables
ALTER TABLE customer_tags ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) REFERENCES tenant_companies(id) ON DELETE CASCADE;
ALTER TABLE lead_tags ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) REFERENCES tenant_companies(id) ON DELETE CASCADE;
ALTER TABLE allocation_history ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) REFERENCES tenant_companies(id) ON DELETE CASCADE;

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_customer_tags_tenant ON customer_tags(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_tags_tenant ON lead_tags(tenant_id);
CREATE INDEX IF NOT EXISTS idx_alloc_history_tenant ON allocation_history(tenant_id);

-- RLS policies for new tables
ALTER TABLE customer_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocation_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON customer_tags;
CREATE POLICY tenant_isolation ON customer_tags FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar);
DROP POLICY IF EXISTS tenant_isolation ON lead_tags;
CREATE POLICY tenant_isolation ON lead_tags FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar);
DROP POLICY IF EXISTS tenant_isolation ON allocation_history;
CREATE POLICY tenant_isolation ON allocation_history FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::varchar);

-- Seed default tags
INSERT INTO customer_tags (name, color, tenant_id) VALUES
    ('สอบถามข้อมูล', '#3b82f6', 'tenant-default-001'),
    ('ต้องการใบเสนอราคา', '#f59e0b', 'tenant-default-001'),
    ('นัดดูห้อง', '#10b981', 'tenant-default-001'),
    ('ต่อรองราคา', '#ef4444', 'tenant-default-001'),
    ('ลูกค้าใหม่', '#8b5cf6', 'tenant-default-001'),
    ('ลูกค้าเก่า', '#ec4899', 'tenant-default-001'),
    ('สนใจโครงการอื่น', '#06b6d4', 'tenant-default-001'),
    ('ต้องการสัญญา', '#84cc16', 'tenant-default-001')
ON CONFLICT DO NOTHING;

-- Backfill new tables with default tenant
UPDATE customer_tags SET tenant_id = 'tenant-default-001' WHERE tenant_id IS NULL;
UPDATE lead_tags SET tenant_id = 'tenant-default-001' WHERE tenant_id IS NULL;
UPDATE allocation_history SET tenant_id = 'tenant-default-001' WHERE tenant_id IS NULL;

-- Add settings_company permission
INSERT INTO permissions (module, action, label) VALUES
    ('settings_company', 'view', 'View Company Profile'),
    ('settings_company', 'edit', 'Edit Company Profile')
ON CONFLICT (module, action) DO NOTHING;

-- Grant settings_company to roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions WHERE module = 'settings_company' AND action IN ('view', 'edit')
ON CONFLICT DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE module = 'settings_company' AND action IN ('view', 'edit')
ON CONFLICT DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT 4, id FROM permissions WHERE module = 'settings_company' AND action = 'view'
ON CONFLICT DO NOTHING;

-- Seed: Primary Owner User
INSERT INTO users (id, name, email, avatar, provider, role_id, tenant_id, status) VALUES
    ('admin-primary', 'Owner', 'cwt.mongkol@gmail.com', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80', 'google', 1, 'tenant-default-001', 'active')
ON CONFLICT (id) DO NOTHING;

-- Seed: Default enterprise account
INSERT INTO enterprise_accounts (id, name, email, billing_plan, status) VALUES
    ('enterprise-default-001', 'RelateFlows HQ', 'admin@relateflows.com', 'enterprise', 'active')
ON CONFLICT (id) DO NOTHING;

-- Link default tenant to enterprise
UPDATE tenant_companies SET enterprise_account_id = 'enterprise-default-001' WHERE id = 'tenant-default-001' AND enterprise_account_id IS NULL;

-- Seed: user_tenants from existing users (each user gets their default tenant)
INSERT INTO user_tenants (user_id, tenant_id, is_default, role_id)
SELECT id, COALESCE(tenant_id, 'tenant-default-001'), TRUE, role_id FROM users
WHERE (tenant_id IS NOT NULL OR role_id != 1)
ON CONFLICT DO NOTHING;

-- Super admin also gets access to default tenant (can switch)
INSERT INTO user_tenants (user_id, tenant_id, is_default, role_id)
SELECT id, 'tenant-default-001', FALSE, role_id FROM users
WHERE tenant_id IS NULL AND role_id = 1
ON CONFLICT DO NOTHING;



