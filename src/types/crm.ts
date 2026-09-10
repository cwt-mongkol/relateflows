export type DealStage = string;

export type Priority = 'low' | 'medium' | 'high';

export interface Pipeline {
  id: string;
  name: string;
  isDefault: boolean;
  sortOrder: number;
}

export interface PipelineStage {
  id: string;
  pipelineId: string;
  label: string;
  color: string;
  sortOrder?: number;
  isClosedWon?: boolean;
  isClosedLost?: boolean;
}

export interface Deal {
  id: string;
  title: string;
  company: string;
  value: number;
  stage: DealStage;
  pipelineId: string;
  probability: number;
  owner: {
    name: string;
    avatar: string;
  };
  assignedTo?: string;
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
  entityType?: string;
  entityId?: string;
}

export type WorkflowTriggerType =
  | 'lead.created'
  | 'lead.message_received'
  | 'lead.allocated'
  | 'deal.created'
  | 'deal.stage_changed'
  | 'deal.won'
  | 'task.completed'
  | 'schedule.lead_no_reply';

export type WorkflowActionType = 'create_task' | 'send_notification' | 'assign_lead' | 'add_tag' | 'move_deal_stage';

export type ConditionOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains';

export interface WorkflowCondition {
  field: string;
  operator: ConditionOperator;
  value: string | number;
}

export interface WorkflowAction {
  type: WorkflowActionType;
  params: Record<string, string | number | undefined>;
}

export interface WorkflowRule {
  id: string;
  title: string;
  description: string;
  trigger: string;
  action: string;
  status: 'active' | 'paused';
  triggerType: WorkflowTriggerType;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  executionsCount: number;
  lastExecuted: string;
  category: 'Lead Nurturing' | 'Sales Operations' | 'Deal Routing' | 'Customer Success';
  accentColor?: string;
}

export interface WorkflowExecution {
  id: string;
  eventType: string;
  status: 'success' | 'error';
  actionsTaken: { type: string; status: string; detail?: unknown }[];
  errorMessage?: string;
  entityType: string;
  entityId: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
}

export type LeadClassification = 'hot' | 'warm' | 'cold';

export function classifyLeadScore(score: number | undefined): LeadClassification {
  const s = score ?? 0;
  if (s >= 70) return 'hot';
  if (s >= 40) return 'warm';
  return 'cold';
}

export interface LeadScoringRule {
  id: string;
  label: string;
  eventType: WorkflowTriggerType;
  points: number;
  conditions: WorkflowCondition[];
  status: 'active' | 'paused';
}

export interface WebhookSubscription {
  id: string;
  name: string;
  eventType: WorkflowTriggerType;
  targetUrl: string;
  status: 'active' | 'paused';
  hasSecret: boolean;
}

export interface WebhookDelivery {
  id: string;
  eventType: string;
  status: 'pending' | 'success' | 'retrying' | 'failed';
  attemptCount: number;
  lastStatusCode: number | null;
  lastError: string;
  nextRetryAt: string | null;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  status: 'active' | 'revoked';
  lastUsedAt: string | null;
  createdAt: string;
  key?: string; // only present once, in the create response
}

export type CsPerformanceGranularity = 'shift' | 'day' | 'week' | 'month' | 'custom';

export interface CsShiftPerformanceRow {
  shiftId: string;
  clockIn: string;
  clockOut: string | null;
  totalChats: number;
  respondedChats: number;
  avgResponseMinutes: number | null;
  closedChats: number;
}

export interface CsBucketPerformanceRow {
  bucket: string;
  totalChats: number;
  respondedChats: number;
  avgResponseMinutes: number | null;
  closedChats: number;
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

export interface TenantCompany {
  id: string;
  name: string;
  slug: string;
  logo_url: string;
  domain: string;
  brand_color_primary: string;
  brand_color_secondary: string;
  status: 'active' | 'suspended' | 'deleted';
  created_at: string;
  updated_at: string;
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
  contactId?: string;
  status?: string;
  leadScore?: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: 'todo' | 'in_progress' | 'done';
  dueDate: string;
  assignee: { name: string; avatar: string; };
  assignedTo?: string;
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
  tenantId?: string;
  companyName?: string;
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

export interface CustomObject {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  status: 'active' | 'inactive';
  field_count?: number;
  record_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CustomField {
  id: string;
  tenant_id: string;
  owner_type: string;
  owner_id: string;
  name: string;
  slug: string;
  field_type: 'text' | 'number' | 'date' | 'textarea' | 'select' | 'multi_select' | 'boolean' | 'url' | 'email' | 'phone' | 'relation';
  options: string[];
  reference_owner: string;
  required: boolean;
  placeholder: string;
  default_value: string;
  ordering: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface CustomRecord {
  id: string;
  tenant_id: string;
  object_id: string;
  data: Record<string, any>;
  created_by: string;
  created_by_name?: string;
  created_by_avatar?: string;
  created_at: string;
  updated_at: string;
}

export type SettingsTab = 'general' | 'users' | 'roles' | 'channels' | 'access' | 'integrations' | 'companies' | 'custom-objects' | 'chatbot' | 'cs-admin' | 'lead-allocation' | 'developer';

export type NavView = 'dashboard' | 'inbox' | 'pipeline' | 'contacts' | 'workflows' | 'analytics' | 'calendar' | 'tasks' | 'settings' | 'cs-queue';

export type ProductFormData = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;
export type CategoryFormData = Omit<Category, 'id' | 'createdAt'>;

export interface QuickReply {
  id: string;
  label: string;
  message: string;
  createdAt: string;
}
