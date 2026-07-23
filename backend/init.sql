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

CREATE TABLE IF NOT EXISTS tb_products (
    id SERIAL PRIMARY KEY,
    lead_id VARCHAR(50) NOT NULL,
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
