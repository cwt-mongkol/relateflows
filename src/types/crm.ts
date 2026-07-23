export type DealStage = string;

export type Priority = 'low' | 'medium' | 'high';

export interface PipelineStage {
  id: string;
  label: string;
  color: string;
}

export interface Deal {
  id: string;
  title: string;
  company: string;
  value: number;
  stage: DealStage;
  probability: number;
  owner: {
    name: string;
    avatar: string;
  };
  leadSource: string;
  priority: Priority;
  contactName: string;
  contactEmail: string;
  createdAt: string;
  expectedCloseDate: string;
  notes?: string;
  tags: string[];
}

export type LifecycleStage = 'subscriber' | 'lead' | 'mql' | 'sql' | 'opportunity' | 'customer';

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  lifecycleStage: LifecycleStage;
  leadScore: number;
  status: 'active' | 'inactive' | 'pending';
  avatar: string;
  lastContacted: string;
  totalDealsValue: number;
  tags: string[];
  notes?: string;
}

export interface CompanyAccount {
  id: string;
  name: string;
  domain: string;
  industry: string;
  size: string;
  annualRevenue: number;
  location: string;
  contactsCount: number;
  totalDealsValue: number;
  logo: string;
}

export interface Activity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'stage_change' | 'deal_won';
  title: string;
  description: string;
  timestamp: string;
  user: {
    name: string;
    avatar: string;
  };
  targetName?: string;
}

export interface WorkflowRule {
  id: string;
  title: string;
  description: string;
  trigger: string;
  action: string;
  status: 'active' | 'paused';
  executionsCount: number;
  lastExecuted: string;
  category: 'Lead Nurturing' | 'Sales Operations' | 'Deal Routing' | 'Customer Success';
  accentColor?: string;
}

export type ProductStatus = 'pending' | 'quoted' | 'ordered' | 'delivered';

export interface Product {
  id: number;
  leadId: string;
  name: string;
  quantity: number;
  price: number;
  description: string;
  notes: string;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MetricCardData {
  id: string;
  title: string;
  value: string;
  subtext: string;
  change: string;
  isPositive: boolean;
  iconName: string;
}

export type ChatChannel = 'facebook' | 'instagram' | 'line';

export interface ChatMessage {
  id: string;
  channel: ChatChannel;
  leadId: string;
  from: 'contact' | 'agent';
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}

export interface Lead {
  id: string;
  name: string;
  avatar: string;
  channel: ChatChannel;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isAllocated: boolean;
  assignedTo?: string;
  createdAt: string;
}

export type NavView = 'dashboard' | 'inbox' | 'pipeline' | 'contacts' | 'workflows' | 'analytics' | 'settings';

export type ProductFormData = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;
