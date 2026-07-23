import type { Deal, Contact, CompanyAccount, Activity, WorkflowRule, MetricCardData, PipelineStage, Lead, ChatMessage } from '../types/crm';

export const STAGE_COLORS = [
  '#94a3b8', // slate-400
  '#60a5fa', // blue-400
  '#2563eb', // blue-600
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#fb7185', // rose-400
  '#8b5cf6', // violet-400
  '#14b8a6', // teal-400
  '#f97316', // orange-400
  '#22d3ee', // cyan-400
  '#ec4899', // pink-400
  '#6366f1', // indigo-400
];

export const INITIAL_STAGES: PipelineStage[] = [
  { id: 'lead_in', label: 'Lead In', color: '#94a3b8' },
  { id: 'contacted', label: 'Contacted', color: '#60a5fa' },
  { id: 'proposal', label: 'Proposal', color: '#2563eb' },
  { id: 'negotiation', label: 'Negotiation', color: '#f59e0b' },
  { id: 'closed_won', label: 'Closed Won', color: '#10b981' },
  { id: 'closed_lost', label: 'Closed Lost', color: '#fb7185' },
];

export const INITIAL_LEADS: Lead[] = [
  { id: 'LD-001', name: 'สมชาย ใจดี', avatar: 'https://i.pravatar.cc/150?u=samchai', channel: 'line', lastMessage: 'สนใจสินค้าครับ อยากสอบถามเพิ่มเติม', lastMessageTime: '2 min ago', unreadCount: 3, isAllocated: true, assignedTo: 'sales-1', createdAt: '2026-07-20' },
  { id: 'LD-002', name: 'Jennifer Wong', avatar: 'https://i.pravatar.cc/150?u=jwong', channel: 'facebook', lastMessage: 'Hi! I saw your ad on Facebook. Interested in the enterprise plan.', lastMessageTime: '15 min ago', unreadCount: 1, isAllocated: false, createdAt: '2026-07-21' },
  { id: 'LD-003', name: 'mika_insta', avatar: 'https://i.pravatar.cc/150?u=mika', channel: 'instagram', lastMessage: 'DM about collaboration 🚀', lastMessageTime: '1 hour ago', unreadCount: 0, isAllocated: true, assignedTo: 'sales-2', createdAt: '2026-07-19' },
  { id: 'LD-004', name: 'ประสิทธิ์ มีทรัพย์', avatar: 'https://i.pravatar.cc/150?u=prasit', channel: 'line', lastMessage: 'ขอใบเสนอราคาหน่อยครับ', lastMessageTime: '3 hours ago', unreadCount: 0, isAllocated: false, createdAt: '2026-07-18' },
  { id: 'LD-005', name: 'Emily Chen', avatar: 'https://i.pravatar.cc/150?u=emily', channel: 'facebook', lastMessage: 'Can you help me with the setup?', lastMessageTime: 'Yesterday at 9:30 PM', unreadCount: 5, isAllocated: true, assignedTo: 'sales-1', createdAt: '2026-07-17' },
  { id: 'LD-006', name: 'travel_with_me', avatar: 'https://i.pravatar.cc/150?u=travel', channel: 'instagram', lastMessage: 'How much for premium?', lastMessageTime: 'Yesterday at 6:15 PM', unreadCount: 0, isAllocated: false, createdAt: '2026-07-16' },
];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  { id: 'MSG-001', channel: 'line', leadId: 'LD-001', from: 'contact', senderName: 'สมชาย ใจดี', senderAvatar: 'https://i.pravatar.cc/150?u=samchai', content: 'สวัสดีครับ สนใจสินค้าของคุณครับ', timestamp: '10 min ago', isRead: true },
  { id: 'MSG-002', channel: 'line', leadId: 'LD-001', from: 'agent', senderName: 'คุณ Sarah', senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', content: 'สวัสดีค่ะ สนใจสินค้าตัวไหนเป็นพิเศษไหมคะ?', timestamp: '8 min ago', isRead: true },
  { id: 'MSG-003', channel: 'line', leadId: 'LD-001', from: 'contact', senderName: 'สมชาย ใจดี', senderAvatar: 'https://i.pravatar.cc/150?u=samchai', content: 'สนใจแพ็คเกจ Enterprise ครับ อยากทราบราคาและฟีเจอร์', timestamp: '5 min ago', isRead: true },
  { id: 'MSG-004', channel: 'line', leadId: 'LD-001', from: 'contact', senderName: 'สมชาย ใจดี', senderAvatar: 'https://i.pravatar.cc/150?u=samchai', content: 'ขอใบเสนอราคาด้วยครับ', timestamp: '2 min ago', isRead: false },
  { id: 'MSG-005', channel: 'facebook', leadId: 'LD-002', from: 'contact', senderName: 'Jennifer Wong', senderAvatar: 'https://i.pravatar.cc/150?u=jwong', content: 'Hi! I saw your ad on Facebook. Interested in the enterprise plan.', timestamp: '15 min ago', isRead: false },
  { id: 'MSG-006', channel: 'instagram', leadId: 'LD-003', from: 'contact', senderName: 'mika_insta', senderAvatar: 'https://i.pravatar.cc/150?u=mika', content: 'Hey! Love your product. Want to discuss collaboration opportunities 🚀', timestamp: '1 hour ago', isRead: true },
  { id: 'MSG-007', channel: 'instagram', leadId: 'LD-003', from: 'agent', senderName: 'คุณ Alex', senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', content: 'Hi Mika! Thanks for reaching out. Would love to chat about collab!', timestamp: '50 min ago', isRead: true },
  { id: 'MSG-008', channel: 'line', leadId: 'LD-004', from: 'contact', senderName: 'ประสิทธิ์ มีทรัพย์', senderAvatar: 'https://i.pravatar.cc/150?u=prasit', content: 'ขอใบเสนอราคาหน่อยครับ', timestamp: '3 hours ago', isRead: true },
  { id: 'MSG-009', channel: 'facebook', leadId: 'LD-005', from: 'contact', senderName: 'Emily Chen', senderAvatar: 'https://i.pravatar.cc/150?u=emily', content: 'Can you help me with the setup? Having trouble with the API integration.', timestamp: 'Yesterday at 9:30 PM', isRead: false },
  { id: 'MSG-010', channel: 'facebook', leadId: 'LD-005', from: 'contact', senderName: 'Emily Chen', senderAvatar: 'https://i.pravatar.cc/150?u=emily', content: 'I followed the docs but still getting 401 errors', timestamp: 'Yesterday at 9:31 PM', isRead: false },
  { id: 'MSG-011', channel: 'instagram', leadId: 'LD-006', from: 'contact', senderName: 'travel_with_me', senderAvatar: 'https://i.pravatar.cc/150?u=travel', content: 'How much for premium?', timestamp: 'Yesterday at 6:15 PM', isRead: true },
];

export const INITIAL_DEALS: Deal[] = [
  {
    id: 'DEAL-101',
    title: 'Enterprise Cloud License',
    company: 'Apex Global Logistics',
    value: 125000,
    stage: 'negotiation',
    probability: 85,
    owner: {
      name: 'Sarah Connor',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    },
    leadSource: 'Inbound Website',
    priority: 'high',
    contactName: 'David Miller',
    contactEmail: 'david.m@apexglobal.com',
    createdAt: '2026-07-01',
    expectedCloseDate: '2026-07-30',
    tags: ['Enterprise', 'Cloud', 'Q3-Target'],
    notes: 'Legal reviewing custom SLA agreement. Follow up scheduled on Thursday.'
  },
  {
    id: 'DEAL-102',
    title: 'CRM Workflows Expansion',
    company: 'Nexus Dynamics',
    value: 48000,
    stage: 'proposal',
    probability: 60,
    owner: {
      name: 'Alex Rivera',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
    leadSource: 'Partner Referral',
    priority: 'high',
    contactName: 'Elena Rostova',
    contactEmail: 'elena@nexusdynamics.io',
    createdAt: '2026-07-05',
    expectedCloseDate: '2026-08-15',
    tags: ['Workflows', 'SaaS'],
    notes: 'Sent updated proposal with 50 workflow seat tier discounts.'
  },
  {
    id: 'DEAL-103',
    title: 'Fintech Automation Suite',
    company: 'Vanguard Pay Solutions',
    value: 210000,
    stage: 'closed_won',
    probability: 100,
    owner: {
      name: 'Sarah Connor',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    },
    leadSource: 'Outbound Campaign',
    priority: 'high',
    contactName: 'Marcus Vance',
    contactEmail: 'm.vance@vanguardpay.com',
    createdAt: '2026-06-12',
    expectedCloseDate: '2026-07-18',
    tags: ['Fintech', 'Automation', 'Strategic'],
    notes: 'Contract signed! Kickoff call set for next Tuesday.'
  },
  {
    id: 'DEAL-104',
    title: 'Data Integration Connector',
    company: 'Starlight Retail Tech',
    value: 28000,
    stage: 'contacted',
    probability: 40,
    owner: {
      name: 'Marcus Brody',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    },
    leadSource: 'Webinar Attendee',
    priority: 'medium',
    contactName: 'Jessica Wu',
    contactEmail: 'jessica.wu@starlightretail.com',
    createdAt: '2026-07-12',
    expectedCloseDate: '2026-08-30',
    tags: ['Integration', 'Retail'],
    notes: 'Initial discovery call went great. Technical demo scheduled.'
  },
  {
    id: 'DEAL-105',
    title: 'AI Insights Engine Module',
    company: 'Hyperion AI Labs',
    value: 95000,
    stage: 'lead_in',
    probability: 20,
    owner: {
      name: 'Alex Rivera',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
    leadSource: 'LinkedIn Campaign',
    priority: 'medium',
    contactName: 'Dr. Aris Thorne',
    contactEmail: 'thorne@hyperionai.co',
    createdAt: '2026-07-19',
    expectedCloseDate: '2026-09-15',
    tags: ['AI Engine', 'Inbound'],
    notes: 'New lead from AI demo request form on product landing page.'
  },
  {
    id: 'DEAL-106',
    title: 'Custom API Connector Package',
    company: 'Bluefin Tech Corp',
    value: 34000,
    stage: 'proposal',
    probability: 70,
    owner: {
      name: 'Marcus Brody',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    },
    leadSource: 'Direct Sales',
    priority: 'low',
    contactName: 'Liam O\'Connor',
    contactEmail: 'liam@bluefintech.com',
    createdAt: '2026-07-08',
    expectedCloseDate: '2026-08-05',
    tags: ['API', 'DevOps'],
    notes: 'Proposal delivered. Awaiting CFO signoff.'
  },
  {
    id: 'DEAL-107',
    title: 'Customer Success Platform Tier',
    company: 'AeroJet Aviation Systems',
    value: 175000,
    stage: 'negotiation',
    probability: 90,
    owner: {
      name: 'Sarah Connor',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    },
    leadSource: 'Executive Network',
    priority: 'high',
    contactName: 'Catherine Hayes',
    contactEmail: 'chayes@aerojet.com',
    createdAt: '2026-06-25',
    expectedCloseDate: '2026-07-28',
    tags: ['Enterprise', 'CSM'],
    notes: 'Final contract terms under review by VP of Procurement.'
  },
  {
    id: 'DEAL-108',
    title: 'Legacy CRM Migration Service',
    company: 'Quantum Media Group',
    value: 62000,
    stage: 'closed_lost',
    probability: 0,
    owner: {
      name: 'Alex Rivera',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
    leadSource: 'Cold Outreach',
    priority: 'low',
    contactName: 'Robert Vance',
    contactEmail: 'rvance@quantummedia.net',
    createdAt: '2026-05-14',
    expectedCloseDate: '2026-07-10',
    tags: ['Migration'],
    notes: 'Decided to defer migration budget to fiscal Q4.'
  }
];

export const INITIAL_CONTACTS: Contact[] = [
  {
    id: 'CNT-001',
    name: 'David Miller',
    email: 'david.m@apexglobal.com',
    phone: '+1 (555) 234-8910',
    company: 'Apex Global Logistics',
    role: 'VP of Operations',
    lifecycleStage: 'opportunity',
    leadScore: 92,
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    lastContacted: 'Yesterday at 3:45 PM',
    totalDealsValue: 125000,
    tags: ['Decision Maker', 'High Priority', 'VIP'],
    notes: 'Key buyer for the $125k Enterprise Cloud License.'
  },
  {
    id: 'CNT-002',
    name: 'Elena Rostova',
    email: 'elena@nexusdynamics.io',
    phone: '+1 (555) 876-1234',
    company: 'Nexus Dynamics',
    role: 'Head of Sales Operations',
    lifecycleStage: 'opportunity',
    leadScore: 84,
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    lastContacted: '3 days ago',
    totalDealsValue: 48000,
    tags: ['SalesOps', 'Power User'],
    notes: 'Loves our visual RelateFlows workflow builder.'
  },
  {
    id: 'CNT-003',
    name: 'Marcus Vance',
    email: 'm.vance@vanguardpay.com',
    phone: '+1 (555) 901-2345',
    company: 'Vanguard Pay Solutions',
    role: 'Chief Technology Officer',
    lifecycleStage: 'customer',
    leadScore: 98,
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    lastContacted: 'Today at 10:15 AM',
    totalDealsValue: 210000,
    tags: ['CTO', 'Signed Customer', 'Champion'],
    notes: 'Champion lead. Promised to provide a testimonial video.'
  },
  {
    id: 'CNT-004',
    name: 'Jessica Wu',
    email: 'jessica.wu@starlightretail.com',
    phone: '+1 (555) 432-7890',
    company: 'Starlight Retail Tech',
    role: 'Senior IT Manager',
    lifecycleStage: 'mql',
    leadScore: 68,
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    lastContacted: 'Jul 15, 2026',
    totalDealsValue: 28000,
    tags: ['Retail', 'Webinar Lead'],
    notes: 'Attended the retail omnichannel integration webinar.'
  },
  {
    id: 'CNT-005',
    name: 'Dr. Aris Thorne',
    email: 'thorne@hyperionai.co',
    phone: '+1 (555) 654-3210',
    company: 'Hyperion AI Labs',
    role: 'Director of AI Research',
    lifecycleStage: 'lead',
    leadScore: 55,
    status: 'pending',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    lastContacted: 'Jul 19, 2026',
    totalDealsValue: 95000,
    tags: ['AI Tech', 'Inbound'],
    notes: 'Submitted demo request for custom AI integration.'
  },
  {
    id: 'CNT-006',
    name: 'Catherine Hayes',
    email: 'chayes@aerojet.com',
    phone: '+1 (555) 321-6549',
    company: 'AeroJet Aviation Systems',
    role: 'SVP of Global Sales',
    lifecycleStage: 'opportunity',
    leadScore: 95,
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    lastContacted: 'Today at 2:00 PM',
    totalDealsValue: 175000,
    tags: ['Executive', 'Aero', 'Enterprise'],
    notes: 'Key decision maker for global aviation CRM deployment.'
  }
];

export const INITIAL_COMPANIES: CompanyAccount[] = [
  {
    id: 'CMP-01',
    name: 'Apex Global Logistics',
    domain: 'apexglobal.com',
    industry: 'Supply Chain & Logistics',
    size: '1,000 - 5,000 employees',
    annualRevenue: 450000000,
    location: 'Chicago, IL',
    contactsCount: 12,
    totalDealsValue: 125000,
    logo: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=100&auto=format&fit=crop&q=80'
  },
  {
    id: 'CMP-02',
    name: 'Vanguard Pay Solutions',
    domain: 'vanguardpay.com',
    industry: 'Financial Technology',
    size: '500 - 1,000 employees',
    annualRevenue: 180000000,
    location: 'New York, NY',
    contactsCount: 8,
    totalDealsValue: 210000,
    logo: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=100&auto=format&fit=crop&q=80'
  },
  {
    id: 'CMP-03',
    name: 'Nexus Dynamics',
    domain: 'nexusdynamics.io',
    industry: 'Software & SaaS',
    size: '250 - 500 employees',
    annualRevenue: 65000000,
    location: 'Austin, TX',
    contactsCount: 5,
    totalDealsValue: 48000,
    logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80'
  }
];

export const INITIAL_ACTIVITIES: Activity[] = [
  {
    id: 'ACT-01',
    type: 'deal_won',
    title: 'Deal Closed Won!',
    description: 'Sarah Connor closed Fintech Automation Suite with Vanguard Pay Solutions.',
    timestamp: '2 hours ago',
    user: {
      name: 'Sarah Connor',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
    },
    targetName: '$210,000 ARR'
  },
  {
    id: 'ACT-02',
    type: 'meeting',
    title: 'Executive Contract Review',
    description: 'Meeting completed with Catherine Hayes (AeroJet Aviation Systems).',
    timestamp: '4 hours ago',
    user: {
      name: 'Sarah Connor',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
    },
    targetName: 'AeroJet Deal'
  },
  {
    id: 'ACT-03',
    type: 'stage_change',
    title: 'Stage Advanced',
    description: 'Alex Rivera moved CRM Workflows Expansion to Proposal stage.',
    timestamp: '5 hours ago',
    user: {
      name: 'Alex Rivera',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
    },
    targetName: 'Nexus Dynamics'
  },
  {
    id: 'ACT-04',
    type: 'email',
    title: 'Workflow Automation Triggered',
    description: 'RelateFlows automatically emailed onboarding checklist to Marcus Vance.',
    timestamp: 'Yesterday at 5:30 PM',
    user: {
      name: 'RelateFlows Bot',
      avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80'
    },
    targetName: 'Auto Workflow #12'
  }
];

export const INITIAL_WORKFLOWS: WorkflowRule[] = [
  {
    id: 'WF-101',
    title: 'High-Score Lead Escalation',
    description: 'When a contact lead score exceeds 80, automatically notify Senior Account Exec and move stage to Qualified.',
    trigger: 'Lead Score > 80',
    action: 'Assign Senior AE + Stage: Qualified',
    status: 'active',
    executionsCount: 142,
    lastExecuted: '10 minutes ago',
    category: 'Lead Nurturing',
    accentColor: '#2563EB' // Blue
  },
  {
    id: 'WF-102',
    title: 'Closed-Won Onboarding Kickoff',
    description: 'When a deal enters Closed Won, trigger Slack notification, generate contract PDF, and invite customer to Portal.',
    trigger: 'Deal Stage = Closed Won',
    action: 'Slack Alert + Customer Portal Invite',
    status: 'active',
    executionsCount: 89,
    lastExecuted: '2 hours ago',
    category: 'Sales Operations',
    accentColor: '#1D4ED8'
  },
  {
    id: 'WF-104',
    title: 'VIP Customer VIP Nurture Flow',
    description: 'Send personalized quarterly executive check-in email to accounts with > $100k annual contract value.',
    trigger: 'Account Value > $100,000',
    action: 'Schedule Exec Email + CSM Notification',
    status: 'paused',
    executionsCount: 45,
    lastExecuted: 'Jul 10, 2026',
    category: 'Customer Success',
    accentColor: '#1D4ED8'
  }
];

export const INITIAL_METRICS: MetricCardData[] = [
  {
    id: 'MET-1',
    title: 'Total Pipeline Value',
    value: '$777,000',
    subtext: 'vs $680,000 last month',
    change: '+14.2%',
    isPositive: true,
    iconName: 'TrendingUp'
  },
  {
    id: 'MET-2',
    title: 'Closed Won (Q3)',
    value: '$210,000',
    subtext: 'Goal: $350,000 (60% reached)',
    change: '+28.5%',
    isPositive: true,
    iconName: 'Award'
  },
  {
    id: 'MET-3',
    title: 'Active Qualified Deals',
    value: '7 Deals',
    subtext: 'Avg deal size: $97.1k',
    change: '+2 Deals',
    isPositive: true,
    iconName: 'Briefcase'
  },
  {
    id: 'MET-4',
    title: 'RelateFlows Executions',
    value: '586 Automations',
    subtext: 'Saved ~42 team hours',
    change: '+34%',
    isPositive: true,
    iconName: 'Zap'
  }
];
