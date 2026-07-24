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
  status: 0 | 1 | 2;
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
  status: 0 | 1;
  executionsCount: number;
  lastExecuted: string;
  category: 'Lead Nurturing' | 'Sales Operations' | 'Deal Routing' | 'Customer Success';
  accentColor?: string;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  createdAt: string;
}

export type ProductStatus = 0 | 1 | 2 | 3;
export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  0: 'Pending',
  1: 'Quoted',
  2: 'Ordered',
  3: 'Delivered',
};

export interface Product {
  id: number;
  leadId: string;
  categoryId: number | null;
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

export type AppointmentStatus = 0 | 1 | 2;
export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  0: 'Scheduled',
  1: 'Completed',
  2: 'Cancelled',
};
export type AppointmentType = 'activity' | 'meeting' | 'appointment';

export interface Appointment {
  id: number;
  leadId: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  type: AppointmentType;
  status: AppointmentStatus;
  location: string;
  googleEventId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  guests?: string[];
  reminders?: { id: string; type: 'notification' | 'email'; time: number; label?: string }[];
  recurrence?: { freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'; interval?: number; count?: number; until?: string; byweekday?: number[] };
  attachments?: { id: string; name: string; url?: string; type: 'file' | 'link' | 'image'; size?: string }[];
}

export type AppointmentFormData = Omit<Appointment, 'id' | 'googleEventId' | 'createdBy' | 'createdAt' | 'updatedAt'>;

export type ChatChannel = 'facebook' | 'instagram' | 'line';

export interface SocialAccount {
  id: string;
  channel: ChatChannel;
  name: string;
  avatar: string;
  connected: boolean;
}

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

export interface CustomerTag {
  id: number;
  name: string;
  color: string;
  createdAt: string;
}

export interface AllocationRecord {
  id: number;
  leadId: string;
  salesPersonId: string;
  salesPersonName: string;
  salesPersonAvatar: string;
  projectName: string;
  status: 'active' | 'completed' | 'cancelled';
  notes: string;
  isReallocation: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  name: string;
  avatar: string;
  channel: ChatChannel;
  socialAccountId: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isAllocated: boolean;
  assignedTo?: string;
  tags?: CustomerTag[];
  allocationHistory?: AllocationRecord[];
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: 'todo' | 'in_progress' | 'done';
  dueDate: string;
  assignee: { name: string; avatar: string; };
  relatedTo?: { type: 'deal' | 'contact'; id: string; label: string; };
  createdAt: string;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  isSystem: boolean;
  createdAt: string;
}

export interface Permission {
  id: number;
  module: string;
  action: string;
  label: string;
}

export interface CrmUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  provider: string;
  roleId: number | null;
  roleName?: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
}

export interface SocialChannel {
  id: number;
  type: 'facebook' | 'instagram' | 'line';
  displayName: string;
  pageId: string;
  status: 'connected' | 'disconnected' | 'error' | 'expired';
  lastHealthCheck?: string;
  createdBy?: string;
  createdAt: string;
}

export interface ChannelAccessRow {
  userId: string;
  channelId: number;
  userName: string;
  channelName: string;
  channelType: string;
}

export type SettingsTab = 'general' | 'users' | 'roles' | 'channels' | 'access' | 'integrations';

export type NavView = 'dashboard' | 'inbox' | 'pipeline' | 'contacts' | 'workflows' | 'analytics' | 'calendar' | 'tasks' | 'settings';

export type ProductFormData = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;
export type CategoryFormData = Omit<Category, 'id' | 'createdAt'>;
