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

-- Seed Data

-- 1. Companies
INSERT INTO companies (id, name, domain, industry, size, annual_revenue, location, contacts_count, total_deals_value, logo)
VALUES 
('CMP-01', 'Apex Global Logistics', 'apexglobal.com', 'Supply Chain & Logistics', '1,000 - 5,000 employees', 450000000, 'Chicago, IL', 12, 125000, 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=100&auto=format&fit=crop&q=80'),
('CMP-02', 'Vanguard Pay Solutions', 'vanguardpay.com', 'Financial Technology', '500 - 1,000 employees', 180000000, 'New York, NY', 8, 210000, 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=100&auto=format&fit=crop&q=80'),
('CMP-03', 'Nexus Dynamics', 'nexusdynamics.io', 'Software & SaaS', '250 - 500 employees', 65000000, 'Austin, TX', 5, 48000, 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80')
ON CONFLICT (id) DO NOTHING;

-- 2. Contacts
INSERT INTO contacts (id, name, email, phone, company, role, lifecycle_stage, lead_score, status, avatar, last_contacted, total_deals_value, tags, notes)
VALUES 
('CNT-001', 'David Miller', 'david.m@apexglobal.com', '+1 (555) 234-8910', 'Apex Global Logistics', 'VP of Operations', 'opportunity', 92, 'active', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', 'Yesterday at 3:45 PM', 125000, '["Decision Maker", "High Priority", "VIP"]'::jsonb, 'Key buyer for the $125k Enterprise Cloud License.'),
('CNT-002', 'Elena Rostova', 'elena@nexusdynamics.io', '+1 (555) 876-1234', 'Nexus Dynamics', 'Head of Sales Operations', 'opportunity', 84, 'active', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80', '3 days ago', 48000, '["SalesOps", "Power User"]'::jsonb, 'Loves our visual RelateFlows workflow builder.'),
('CNT-003', 'Marcus Vance', 'm.vance@vanguardpay.com', '+1 (555) 901-2345', 'Vanguard Pay Solutions', 'Chief Technology Officer', 'customer', 98, 'active', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80', 'Today at 10:15 AM', 210000, '["CTO", "Signed Customer", "Champion"]'::jsonb, 'Champion lead. Promised to provide a testimonial video.'),
('CNT-004', 'Jessica Wu', 'jessica.wu@starlightretail.com', '+1 (555) 432-7890', 'Starlight Retail Tech', 'Senior IT Manager', 'mql', 68, 'active', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80', 'Jul 15, 2026', 28000, '["Retail", "Webinar Lead"]'::jsonb, 'Attended the retail omnichannel integration webinar.'),
('CNT-005', 'Dr. Aris Thorne', 'thorne@hyperionai.co', '+1 (555) 654-3210', 'Hyperion AI Labs', 'Director of AI Research', 'lead', 55, 'pending', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80', 'Jul 19, 2026', 95000, '["AI Tech", "Inbound"]'::jsonb, 'Submitted demo request for custom AI integration.'),
('CNT-006', 'Catherine Hayes', 'chayes@aerojet.com', '+1 (555) 321-6549', 'AeroJet Aviation Systems', 'SVP of Global Sales', 'opportunity', 95, 'active', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80', 'Today at 2:00 PM', 175000, '["Executive", "Aero", "Enterprise"]'::jsonb, 'Key decision maker for global aviation CRM deployment.')
ON CONFLICT (id) DO NOTHING;

-- 3. Deals
INSERT INTO deals (id, title, company, value, stage, probability, owner, lead_source, priority, contact_name, contact_email, created_at, expected_close_date, notes, tags)
VALUES 
('DEAL-101', 'Enterprise Cloud License', 'Apex Global Logistics', 125000, 'negotiation', 85, '{"name": "Sarah Connor", "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80"}'::jsonb, 'Inbound Website', 'high', 'David Miller', 'david.m@apexglobal.com', '2026-07-01', '2026-07-30', 'Legal reviewing custom SLA agreement. Follow up scheduled on Thursday.', '["Enterprise", "Cloud", "Q3-Target"]'::jsonb),
('DEAL-102', 'CRM Workflows Expansion', 'Nexus Dynamics', 48000, 'proposal', 60, '{"name": "Alex Rivera", "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"}'::jsonb, 'Partner Referral', 'high', 'Elena Rostova', 'elena@nexusdynamics.io', '2026-07-05', '2026-08-15', 'Sent updated proposal with 50 workflow seat tier discounts.', '["Workflows", "SaaS"]'::jsonb),
('DEAL-103', 'Fintech Automation Suite', 'Vanguard Pay Solutions', 210000, 'closed_won', 100, '{"name": "Sarah Connor", "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80"}'::jsonb, 'Outbound Campaign', 'high', 'Marcus Vance', 'm.vance@vanguardpay.com', '2026-06-12', '2026-07-18', 'Contract signed! Kickoff call set for next Tuesday.', '["Fintech", "Automation", "Strategic"]'::jsonb),
('DEAL-104', 'Data Integration Connector', 'Starlight Retail Tech', 28000, 'contacted', 40, '{"name": "Marcus Brody", "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80"}'::jsonb, 'Webinar Attendee', 'medium', 'Jessica Wu', 'jessica.wu@starlightretail.com', '2026-07-12', '2026-08-30', 'Initial discovery call went great. Technical demo scheduled.', '["Integration", "Retail"]'::jsonb),
('DEAL-105', 'AI Insights Engine Module', 'Hyperion AI Labs', 95000, 'lead_in', 20, '{"name": "Alex Rivera", "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"}'::jsonb, 'LinkedIn Campaign', 'medium', 'Dr. Aris Thorne', 'thorne@hyperionai.co', '2026-07-19', '2026-09-15', 'New lead from AI demo request form on product landing page.', '["AI Engine", "Inbound"]'::jsonb),
('DEAL-106', 'Custom API Connector Package', 'Bluefin Tech Corp', 34000, 'proposal', 70, '{"name": "Marcus Brody", "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80"}'::jsonb, 'Direct Sales', 'low', 'Liam O''Connor', 'liam@bluefintech.com', '2026-07-08', '2026-08-05', 'Proposal delivered. Awaiting CFO signoff.', '["API", "DevOps"]'::jsonb),
('DEAL-107', 'Customer Success Platform Tier', 'AeroJet Aviation Systems', 175000, 'negotiation', 90, '{"name": "Sarah Connor", "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80"}'::jsonb, 'Executive Network', 'high', 'Catherine Hayes', 'chayes@aerojet.com', '2026-06-25', '2026-07-28', 'Final contract terms under review by VP of Procurement.', '["Enterprise", "CSM"]'::jsonb),
('DEAL-108', 'Legacy CRM Migration Service', 'Quantum Media Group', 62000, 'closed_lost', 0, '{"name": "Alex Rivera", "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"}'::jsonb, 'Cold Outreach', 'low', 'Robert Vance', 'rvance@quantummedia.net', '2026-05-14', '2026-07-10', 'Decided to defer migration budget to fiscal Q4.', '["Migration"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 4. Activities
INSERT INTO activities (id, type, title, description, timestamp, "user", target_name)
VALUES 
('ACT-01', 'deal_won', 'Deal Closed Won!', 'Sarah Connor closed Fintech Automation Suite with Vanguard Pay Solutions.', '2 hours ago', '{"name": "Sarah Connor", "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80"}'::jsonb, '$210,000 ARR'),
('ACT-02', 'meeting', 'Executive Contract Review', 'Meeting completed with Catherine Hayes (AeroJet Aviation Systems).', '4 hours ago', '{"name": "Sarah Connor", "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80"}'::jsonb, 'AeroJet Deal'),
('ACT-03', 'stage_change', 'Stage Advanced', 'Alex Rivera moved CRM Workflows Expansion to Proposal stage.', '5 hours ago', '{"name": "Alex Rivera", "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"}'::jsonb, 'Nexus Dynamics'),
('ACT-04', 'email', 'Workflow Automation Triggered', 'RelateFlows automatically emailed onboarding checklist to Marcus Vance.', 'Yesterday at 5:30 PM', '{"name": "RelateFlows Bot", "avatar": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80"}'::jsonb, 'Auto Workflow #12')
ON CONFLICT (id) DO NOTHING;

-- 5. Workflows
INSERT INTO workflows (id, title, description, trigger_cond, action, status, executions_count, last_executed, category, accent_color)
VALUES 
('WF-101', 'High-Score Lead Escalation', 'When a contact lead score exceeds 80, automatically notify Senior Account Exec and move stage to Qualified.', 'Lead Score > 80', 'Assign Senior AE + Stage: Qualified', 'active', 142, '10 minutes ago', 'Lead Nurturing', '#2563EB'),
('WF-102', 'Closed-Won Onboarding Kickoff', 'When a deal enters Closed Won, trigger Slack notification, generate contract PDF, and invite customer to Portal.', 'Deal Stage = Closed Won', 'Slack Alert + Customer Portal Invite', 'active', 89, '2 hours ago', 'Sales Operations', '#F97316'),
('WF-103', 'Stale Deal Follow-up Reminder', 'If a deal stays in Proposal stage with no activity for 5 days, create follow-up task for deal owner.', 'Inactivity in Proposal > 5 days', 'Create Task: "Schedule Follow-up Call"', 'active', 310, 'Yesterday at 9:00 AM', 'Deal Routing', '#2563EB'),
('WF-104', 'VIP Customer VIP Nurture Flow', 'Send personalized quarterly executive check-in email to accounts with > $100k annual contract value.', 'Account Value > $100,000', 'Schedule Exec Email + CSM Notification', 'paused', 45, 'Jul 10, 2026', 'Customer Success', '#F97316')
ON CONFLICT (id) DO NOTHING;

-- 6. Metrics
INSERT INTO metrics (id, title, value, subtext, change, is_positive, icon_name)
VALUES 
('MET-1', 'Total Pipeline Value', '$777,000', 'vs $680,000 last month', '+14.2%', TRUE, 'TrendingUp'),
('MET-2', 'Closed Won (Q3)', '$210,000', 'Goal: $350,000 (60% reached)', '+28.5%', TRUE, 'Award'),
('MET-3', 'Active Qualified Deals', '7 Deals', 'Avg deal size: $97.1k', '+2 Deals', TRUE, 'Briefcase'),
('MET-4', 'RelateFlows Executions', '586 Automations', 'Saved ~42 team hours', '+34%', TRUE, 'Zap')
ON CONFLICT (id) DO NOTHING;

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
ALTER TABLE google_calendar_tokens ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) REFERENCES tenant_companies(id) ON DELETE CASCADE;

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
INSERT INTO roles (id, name, description, is_system) VALUES
    (1, 'Administrator', 'Full system access — all modules, all settings, full scope', TRUE),
    (2, 'Manager', 'Manage pipeline, team contacts, tasks, view team analytics, manage team channel access', TRUE),
    (3, 'Sales Rep', 'View and edit own pipeline, own contacts, own tasks, reply in own channels', TRUE),
    (4, 'Support Agent', 'View inbox, reply in assigned channels, view contacts (read-only), manage own tasks & calendar', TRUE),
    (5, 'Customer Service Admin', 'Manage social inbox, contacts, tasks, calendar, users, channels, audit log — but NOT pipeline, workflows, analytics deep access, roles/permissions, or integrations', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Seed: Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions
ON CONFLICT DO NOTHING;

-- Seed: Manager (role_id=2) — all except stage_crud_settings, contacts_delete,
--   google_sync_setup, roles_permissions, channel_management, integrations_api_keys
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE NOT (
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

-- Seed: Sales Rep (role_id=3) — dashboard, social_inbox (view+reply, NOT lead_allocation),
--   pipeline (view_deals, create_edit_deal — NOT delete_deal, NOT stage_crud_settings),
--   contacts (view_search, create_edit — NOT delete),
--   tasks (view, edit_delete — NOT create_assign_others),
--   calendar (view_create_appointment — NOT edit_delete_others, NOT google_sync_setup),
--   workflows (none), analytics (none), settings_appearance, settings_user_management (none),
--   audit_log (none)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions WHERE (
    (module = 'dashboard' AND action = 'view')
    OR (module = 'social_inbox' AND action IN ('view_channel', 'reply'))
    OR (module = 'pipeline' AND action IN ('view_deals', 'create_edit_deal'))
    OR (module = 'contacts' AND action IN ('view_search', 'create_edit'))
    OR (module = 'tasks' AND action IN ('view', 'edit_delete'))
    OR (module = 'calendar' AND action = 'view_create_appointment')
    OR (module = 'settings_appearance' AND action = 'change_language_theme_own')
)
ON CONFLICT DO NOTHING;

-- Seed: Support Agent (role_id=4) — dashboard (view), social_inbox (view_channel, reply),
--   pipeline (none), contacts (view_search only), tasks (view, edit_delete),
--   calendar (view_create_appointment), settings_appearance
INSERT INTO role_permissions (role_id, permission_id)
SELECT 4, id FROM permissions WHERE (
    (module = 'dashboard' AND action = 'view')
    OR (module = 'social_inbox' AND action IN ('view_channel', 'reply'))
    OR (module = 'contacts' AND action = 'view_search')
    OR (module = 'tasks' AND action IN ('view', 'edit_delete'))
    OR (module = 'calendar' AND action = 'view_create_appointment')
    OR (module = 'settings_appearance' AND action = 'change_language_theme_own')
)
ON CONFLICT DO NOTHING;

-- Seed: Customer Service Admin (role_id=5) — dashboard (cs_team), social_inbox (all),
--   pipeline (view_deals read-only), contacts (view+create_edit, NOT delete),
--   tasks (cs_team), calendar (view_create + edit_delete_others, NOT google_sync),
--   workflows (cs_related_only), analytics (cs_team), settings_appearance,
--   settings_user_management (cs_team_only), settings_channel_access_matrix (cs_team),
--   audit_log (chat_customer_related_only)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 5, id FROM permissions WHERE (
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

-- Grant settings_company to roles that should manage company profile
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions WHERE module = 'settings_company' AND action IN ('view', 'edit')
ON CONFLICT DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE module = 'settings_company' AND action = 'view'
ON CONFLICT DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT 5, id FROM permissions WHERE module = 'settings_company' AND action = 'view'
ON CONFLICT DO NOTHING;

-- Add Super Admin role (platform-wide, sees across all tenants)
INSERT INTO roles (id, name, description, is_system) VALUES
    (6, 'Super Admin', 'Platform-wide access — manages all tenant companies, sees all data across all organizations', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Super Admin gets ALL permissions (same as Admin role 1)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 6, id FROM permissions
ON CONFLICT DO NOTHING;

-- Seed: Demo users for each role (now with tenant_id)
INSERT INTO users (id, name, email, avatar, provider, role_id, tenant_id, status) VALUES
    ('demo-admin-001', 'Sarah Connor (Administrator)', 'sarah.connor@relateflows.com', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', 'google', 1, 'tenant-default-001', 'active'),
    ('demo-mgr-001', 'Alex Rivera (Manager)', 'alex.rivera@relateflows.com', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', 'google', 2, 'tenant-default-001', 'active'),
    ('demo-sales-001', 'Marcus Brody (Sales Rep)', 'marcus.brody@relateflows.com', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', 'google', 3, 'tenant-default-001', 'active'),
    ('demo-support-001', 'Priya Sharma (Support Agent)', 'priya.sharma@relateflows.com', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80', 'google', 4, 'tenant-default-001', 'active'),
    ('demo-csadmin-001', 'Kenji Tanaka (CS Admin)', 'kenji.tanaka@relateflows.com', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80', 'google', 5, 'tenant-default-001', 'active'),
    ('demo-super-001', 'Daisuke Yamamoto (Super Admin)', 'daisuke@relateflows.com', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80', 'google', 6, NULL, 'active')
ON CONFLICT (id) DO NOTHING;

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

