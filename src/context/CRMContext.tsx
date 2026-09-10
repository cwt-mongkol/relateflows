import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../lib/api';
import type { 
  Deal, 
  Contact, 
  CompanyAccount, 
  Activity, 
  WorkflowRule, 
  MetricCardData, 
  NavView, 
  DealStage,
  PipelineStage,
  Lead,
  ChatMessage,
  Product,
  ProductFormData,
  Category,
  CategoryFormData,
  SocialAccount,
  Appointment,
  AppointmentFormData,
  Task,
  CustomerTag,
  AllocationRecord,
  AppNotification,
  WorkflowExecution,
  Pipeline,
  LeadScoringRule,
  WebhookSubscription,
  WebhookDelivery,
  ApiKey,
} from '../types/crm';
import { 
  INITIAL_DEALS, 
  INITIAL_CONTACTS, 
  INITIAL_COMPANIES, 
  INITIAL_ACTIVITIES, 
  INITIAL_WORKFLOWS, 
  INITIAL_METRICS,
  INITIAL_STAGES,
  INITIAL_LEADS,
  INITIAL_CHAT_MESSAGES,
  INITIAL_PRODUCTS,
  INITIAL_CATEGORIES,
  INITIAL_SOCIAL_ACCOUNTS,
  INITIAL_APPOINTMENTS,
  INITIAL_TASKS,
  INITIAL_TAGS,
  INITIAL_ALLOCATIONS,
  LEAD_TAGS,
  enrichLeads,
} from '../data/mockData';

interface CRMContextType {
  isLoading: boolean;
  currentView: NavView;
  setCurrentView: (view: NavView) => void;
  deals: Deal[];
  contacts: Contact[];
  companies: CompanyAccount[];
  activities: Activity[];
  workflows: WorkflowRule[];
  metrics: MetricCardData[];
  stages: PipelineStage[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedContact: Contact | null;
  setSelectedContact: (c: Contact | null) => void;
  selectedDeal: Deal | null;
  setSelectedDeal: (d: Deal | null) => void;
  isAddDealModalOpen: boolean;
  setIsAddDealModalOpen: (b: boolean) => void;
  isAddContactModalOpen: boolean;
  setIsAddContactModalOpen: (b: boolean) => void;
  isAddWorkflowModalOpen: boolean;
  setIsAddWorkflowModalOpen: (b: boolean) => void;
  
  // Actions
  addDeal: (deal: Omit<Deal, 'id' | 'createdAt'>) => Promise<void>;
  updateDealStage: (dealId: string, newStage: DealStage) => Promise<void>;
  deleteDeal: (dealId: string) => Promise<void>;
  
  addContact: (contact: Omit<Contact, 'id' | 'lastContacted' | 'totalDealsValue'>) => Promise<void>;
  deleteContact: (contactId: string) => Promise<void>;
  
  toggleWorkflowStatus: (workflowId: string) => Promise<void>;
  addWorkflow: (workflow: Omit<WorkflowRule, 'id' | 'executionsCount' | 'lastExecuted' | 'trigger' | 'action'>) => Promise<void>;
  deleteWorkflow: (workflowId: string) => Promise<void>;
  getWorkflowExecutions: (workflowId: string) => Promise<WorkflowExecution[]>;

  addStage: (stage: PipelineStage) => Promise<void>;
  renameStage: (id: string, label: string) => Promise<void>;
  deleteStage: (id: string) => Promise<void>;

  pipelines: Pipeline[];
  selectedPipelineId: string;
  setSelectedPipelineId: (id: string) => void;
  addPipeline: (id: string, name: string) => Promise<void>;
  renamePipeline: (id: string, name: string) => Promise<void>;
  setDefaultPipeline: (id: string) => Promise<void>;
  deletePipeline: (id: string) => Promise<void>;

  leadScoringRules: LeadScoringRule[];
  addLeadScoringRule: (rule: Omit<LeadScoringRule, 'id' | 'conditions'>) => Promise<void>;
  toggleLeadScoringRule: (id: string) => Promise<void>;
  deleteLeadScoringRule: (id: string) => Promise<void>;

  webhooks: WebhookSubscription[];
  addWebhook: (webhook: { name: string; eventType: string; targetUrl: string; secret?: string }) => Promise<void>;
  toggleWebhook: (id: string) => Promise<void>;
  deleteWebhook: (id: string) => Promise<void>;
  getWebhookDeliveries: (webhookId: string) => Promise<WebhookDelivery[]>;
  retryWebhookDelivery: (webhookId: string, deliveryId: string) => Promise<void>;

  apiKeys: ApiKey[];
  createApiKey: (name: string, scopes: string[]) => Promise<ApiKey>;
  revokeApiKey: (id: string) => Promise<void>;

  leads: Lead[];
  chatMessages: ChatMessage[];
  sendChatMessage: (leadId: string, content: string) => Promise<void>;
  selectedLead: Lead | null;
  setSelectedLead: (l: Lead | null) => void;
  tags: CustomerTag[];
  leadTags: Record<string, CustomerTag[]>;
  allocations: AllocationRecord[];
  addTag: (data: { name: string; color: string }) => Promise<void>;
  updateTag: (id: number, data: Partial<CustomerTag>) => Promise<void>;
  deleteTag: (id: number) => Promise<void>;
  addTagToLead: (leadId: string, tagId: number) => Promise<void>;
  removeTagFromLead: (leadId: string, tagId: number) => Promise<void>;
  allocateLead: (leadId: string, salesPersonId: string, salesPersonName: string, salesPersonAvatar: string, projectName: string, notes: string, isReallocation: boolean) => Promise<void>;
  getAllocationHistory: (leadId: string) => AllocationRecord[];
  getLeadTags: (leadId: string) => CustomerTag[];

  categories: Category[];
  socialAccounts: SocialAccount[];
  appointments: Appointment[];
  addAppointment: (data: AppointmentFormData) => Promise<void>;
  updateAppointment: (id: number, data: Partial<Appointment>) => Promise<void>;
  deleteAppointment: (id: number) => Promise<void>;
  addCategory: (data: CategoryFormData) => Promise<void>;
  updateCategory: (id: number, data: Partial<Category>) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;
  products: Product[];
  addProduct: (data: ProductFormData) => Promise<void>;
  updateProduct: (id: number, data: Partial<Product>) => Promise<void>;
  deleteProduct: (id: number) => Promise<void>;

  tasks: Task[];
  addTask: (data: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  notifications: AppNotification[];
  notificationCount: number;
  markNotificationRead: (id: string) => Promise<void>;
  clearNotifications: () => Promise<void>;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

export const CRMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id || 'anonymous';

  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<NavView>('dashboard');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<CompanyAccount[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowRule[]>([]);
  const [metrics, setMetrics] = useState<MetricCardData[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [leads, setLeads] = useState<Lead[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [tags, setTags] = useState<CustomerTag[]>([]);
  const [leadTags, setLeadTags] = useState<Record<string, CustomerTag[]>>({});
  const [allocations, setAllocations] = useState<AllocationRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>(INITIAL_SOCIAL_ACCOUNTS);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Pipeline stages — real, tenant-shared data from /api/stages (loaded below), mock data until then
  const [stages, setStages] = useState<PipelineStage[]>(INITIAL_STAGES);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('sales');
  const [leadScoringRules, setLeadScoringRules] = useState<LeadScoringRule[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookSubscription[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [isAddDealModalOpen, setIsAddDealModalOpen] = useState(false);
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [isAddWorkflowModalOpen, setIsAddWorkflowModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const notificationCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {

        const [dealsData, contactsData, companiesData, activitiesData, workflowsData, metricsData, stagesData,           leadsData, chatData, productsData, categoriesData, appointmentsData, tasksData, tagsData, allocData, channelsData, pipelinesData, leadScoringData, webhooksData, apiKeysData] = await Promise.all([
          api.get<Deal[]>('/api/deals').catch(() => null),
          api.get<Contact[]>('/api/contacts').catch(() => null),
          api.get<CompanyAccount[]>('/api/companies').catch(() => null),
          api.get<Activity[]>('/api/activities').catch(() => null),
          api.get<WorkflowRule[]>('/api/workflows').catch(() => null),
          api.get<MetricCardData[]>('/api/metrics').catch(() => null),
          api.get<PipelineStage[]>('/api/stages').catch(() => null),
          api.get<Lead[]>('/api/leads').catch(() => null),
          api.get<ChatMessage[]>('/api/chat-messages').catch(() => null),
          api.get<Product[]>('/api/products').catch(() => null),
          api.get<Category[]>('/api/categories').catch(() => null),
          api.get<Appointment[]>('/api/appointments').catch(() => null),
          api.get<Task[]>('/api/tasks').catch(() => null),
          api.get<CustomerTag[]>('/api/tags').catch(() => null),
          api.get<AllocationRecord[]>('/api/leads/allocations').catch(() => null),
          api.get<{ id: number; type: string; displayName: string; status: string }[]>('/api/inbox/channels').catch(() => null),
          api.get<Pipeline[]>('/api/pipelines').catch(() => null),
          api.get<LeadScoringRule[]>('/api/lead-scoring-rules').catch(() => null),
          api.get<WebhookSubscription[]>('/api/webhooks').catch(() => null),
          api.get<ApiKey[]>('/api/api-keys').catch(() => null),
        ]) as [
          Deal[] | null, Contact[] | null, CompanyAccount[] | null, Activity[] | null,
          WorkflowRule[] | null, MetricCardData[] | null, PipelineStage[] | null,
          Lead[] | null, ChatMessage[] | null, Product[] | null, Category[] | null,
          Appointment[] | null, Task[] | null, CustomerTag[] | null, AllocationRecord[] | null,
          { id: number; type: string; displayName: string; status: string }[] | null,
          Pipeline[] | null, LeadScoringRule[] | null, WebhookSubscription[] | null, ApiKey[] | null
        ];

        // Use API data if available and non-empty, otherwise fall back to mock data
        setDeals(dealsData && dealsData.length > 0 ? dealsData : INITIAL_DEALS);
        setContacts(contactsData && contactsData.length > 0 ? contactsData : INITIAL_CONTACTS);
        setCompanies(companiesData && companiesData.length > 0 ? companiesData : INITIAL_COMPANIES);
        setActivities(activitiesData && activitiesData.length > 0 ? activitiesData : INITIAL_ACTIVITIES);
        setWorkflows(workflowsData && workflowsData.length > 0 ? workflowsData : INITIAL_WORKFLOWS);
        setMetrics(metricsData && metricsData.length > 0 ? metricsData : INITIAL_METRICS);
        if (stagesData && stagesData.length > 0) setStages(stagesData);
        setLeads(leadsData && leadsData.length > 0 ? leadsData : enrichLeads(INITIAL_LEADS));
        setChatMessages(chatData && chatData.length > 0 ? chatData : INITIAL_CHAT_MESSAGES);
        setProducts(productsData && productsData.length > 0 ? productsData : INITIAL_PRODUCTS);
        setCategories(categoriesData && categoriesData.length > 0 ? categoriesData : INITIAL_CATEGORIES);
        setAppointments(appointmentsData && appointmentsData.length > 0 ? appointmentsData : INITIAL_APPOINTMENTS);
        setTasks(tasksData && tasksData.length > 0 ? tasksData : INITIAL_TASKS);
        setTags(tagsData && tagsData.length > 0 ? tagsData : INITIAL_TAGS);
        setLeadTags(LEAD_TAGS);
        setAllocations(allocData && allocData.length > 0 ? allocData : INITIAL_ALLOCATIONS);
        if (channelsData && channelsData.length > 0) {
          setSocialAccounts(channelsData.map((c) => ({
            id: String(c.id),
            channel: c.type as SocialAccount['channel'],
            name: c.displayName,
            avatar: '',
            connected: c.status === 'connected',
          })));
        }
        if (pipelinesData && pipelinesData.length > 0) {
          setPipelines(pipelinesData);
          setSelectedPipelineId(pipelinesData.find((p) => p.isDefault)?.id || pipelinesData[0].id);
        }
        setLeadScoringRules(leadScoringData || []);
        setWebhooks(webhooksData || []);
        setApiKeys(apiKeysData || []);
      } catch (err) {
        console.warn('Failed to load data, using mock data:', err);
      }
      setIsLoading(false);
    }
    loadData();

    api.get<AppNotification[]>('/api/notifications')
      .then(setNotifications)
      .catch(() => setNotifications([]));
  }, [userId]);

  const markNotificationRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    try {
      await api.patch(`/api/notifications/${id}/read`, {});
    } catch (err) {
      console.warn('API failed for markNotificationRead.', err);
    }
  };

  const clearNotifications = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await api.patch('/api/notifications/read-all', {});
    } catch (err) {
      console.warn('API failed for clearNotifications.', err);
    }
  };

  const addDeal = async (newDealData: Omit<Deal, 'id' | 'createdAt'>) => {
    try {
      const savedDeal = await api.post<any>('/api/deals', newDealData);
      setDeals((prev) => [savedDeal, ...prev]);

      // Log activity via API
      const newActData = {
        type: 'stage_change',
        title: 'New Deal Created',
        description: `Deal "${savedDeal.title}" created for ${savedDeal.company} ($${savedDeal.value.toLocaleString()}).`,
        user: {
          name: 'You (Current User)',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        },
        targetName: `$${savedDeal.value.toLocaleString()}`,
        entityType: 'deal',
        entityId: savedDeal.id,
      };
      const savedAct = await api.post<any>('/api/activities', newActData);
      setActivities((prev) => [savedAct, ...prev]);
      return;
    } catch (err) {
      console.warn('API connection failed for addDeal, falling back to local state update.', err);
    }

    // Local Fallback
    const newId = `DEAL-${Math.floor(100 + Math.random() * 900)}`;
    const newDeal: Deal = {
      ...newDealData,
      id: newId,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setDeals((prev) => [newDeal, ...prev]);

    const newActivity: Activity = {
      id: `ACT-${Date.now()}`,
      type: 'stage_change',
      title: 'New Deal Created',
      description: `Deal "${newDeal.title}" created for ${newDeal.company} ($${newDeal.value.toLocaleString()}).`,
      timestamp: 'Just now',
      user: {
        name: 'You (Current User)',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      },
      targetName: `$${newDeal.value.toLocaleString()}`,
      entityType: 'deal',
      entityId: newId,
    };
    setActivities((prev) => [newActivity, ...prev]);
  };

  const updateDealStage = async (dealId: string, newStage: DealStage) => {
    const targetDeal = deals.find(d => d.id === dealId);
    // Look up won/lost from the stage's own flags rather than a hardcoded id — stage ids are only
    // "closed_won"/"closed_lost" in the default pipeline; other pipelines can name them anything.
    const targetStage = stages.find(s => s.id === newStage && s.pipelineId === targetDeal?.pipelineId);
    const stageLabel = targetStage?.label || newStage;
    const newProbability = targetStage?.isClosedWon ? 100 : targetStage?.isClosedLost ? 0 : (targetDeal ? targetDeal.probability : 50);
    const isWon = !!targetStage?.isClosedWon;

    try {
      const updatedDeal = await api.patch<any>(`/api/deals/${dealId}/stage`, { stage: newStage, probability: newProbability });
      setDeals((prev) => prev.map((d) => d.id === dealId ? updatedDeal : d));

      // Create activity
      const newActData = {
        type: isWon ? 'deal_won' : 'stage_change',
        title: isWon ? 'Deal Closed Won!' : 'Stage Updated',
        description: `Moved "${updatedDeal.title}" to ${stageLabel}.`,
        user: {
          name: 'You (Current User)',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        },
        targetName: updatedDeal.company,
        entityType: 'deal',
        entityId: dealId,
      };
      const savedAct = await api.post<any>('/api/activities', newActData);
      setActivities((prev) => [savedAct, ...prev]);
      return;
    } catch (err) {
      console.warn('API connection failed for updateDealStage, falling back to local state update.', err);
    }

    // Local Fallback
    setDeals((prev) =>
      prev.map((deal) => {
        if (deal.id === dealId) {
          const updated = { 
            ...deal, 
            stage: newStage, 
            probability: newProbability
          };

          const newActivity: Activity = {
            id: `ACT-${Date.now()}`,
            type: isWon ? 'deal_won' : 'stage_change',
            title: isWon ? 'Deal Closed Won!' : 'Stage Updated',
            description: `Moved "${deal.title}" to ${stageLabel}.`,
            timestamp: 'Just now',
            user: {
              name: 'You (Current User)',
              avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            },
            targetName: deal.company,
            entityType: 'deal',
            entityId: dealId,
          };
          setActivities((actPrev) => [newActivity, ...actPrev]);

          return updated;
        }
        return deal;
      })
    );
  };

  const deleteDeal = async (dealId: string) => {
    try {
      await api.delete(`/api/deals/${dealId}`);
      setDeals((prev) => prev.filter((d) => d.id !== dealId));
      return;
    } catch (err) {
      console.warn('API connection failed for deleteDeal, falling back to local state update.', err);
    }

    // Local Fallback
    setDeals((prev) => prev.filter((d) => d.id !== dealId));
  };

  const addContact = async (newContactData: Omit<Contact, 'id' | 'lastContacted' | 'totalDealsValue'>) => {
    try {
      const savedContact = await api.post<any>('/api/contacts', newContactData);
      setContacts((prev) => [savedContact, ...prev]);
      return;
    } catch (err) {
      console.warn('API connection failed for addContact, falling back to local state update.', err);
    }

    // Local Fallback
    const newId = `CNT-${Math.floor(100 + Math.random() * 900)}`;
    const newContact: Contact = {
      ...newContactData,
      id: newId,
      lastContacted: 'Just now',
      totalDealsValue: 0
    };
    setContacts((prev) => [newContact, ...prev]);
  };

  const deleteContact = async (contactId: string) => {
    try {
      await api.delete(`/api/contacts/${contactId}`);
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
      if (selectedContact?.id === contactId) {
        setSelectedContact(null);
      }
      return;
    } catch (err) {
      console.warn('API connection failed for deleteContact, falling back to local state update.', err);
    }

    // Local Fallback
    setContacts((prev) => prev.filter((c) => c.id !== contactId));
    if (selectedContact?.id === contactId) {
      setSelectedContact(null);
    }
  };

  const toggleWorkflowStatus = async (workflowId: string) => {
    try {
      const updatedWf = await api.patch<any>(`/api/workflows/${workflowId}/toggle`, {});
      setWorkflows((prev) => prev.map((wf) => wf.id === workflowId ? updatedWf : wf));
      return;
    } catch (err) {
      console.warn('API connection failed for toggleWorkflowStatus, falling back to local state update.', err);
    }

    // Local Fallback
    setWorkflows((prev) =>
      prev.map((wf) =>
        wf.id === workflowId
          ? { ...wf, status: wf.status === 'active' ? 'paused' : 'active' }
          : wf
      )
    );
  };

  const addWorkflow = async (newWfData: Omit<WorkflowRule, 'id' | 'executionsCount' | 'lastExecuted' | 'trigger' | 'action'>) => {
    try {
      const savedWf = await api.post<any>('/api/workflows', newWfData);
      setWorkflows((prev) => [savedWf, ...prev]);
      return;
    } catch (err) {
      console.warn('API connection failed for addWorkflow, falling back to local state update.', err);
    }

    // Local Fallback
    const newId = `WF-${Math.floor(100 + Math.random() * 900)}`;
    const newWf: WorkflowRule = {
      ...newWfData,
      id: newId,
      trigger: newWfData.triggerType,
      action: newWfData.actions.map((a) => a.type).join(' + ') || 'No actions',
      executionsCount: 0,
      lastExecuted: 'Never'
    };
    setWorkflows((prev) => [newWf, ...prev]);
  };

  const deleteWorkflow = async (workflowId: string) => {
    try {
      await api.delete(`/api/workflows/${workflowId}`);
      setWorkflows((prev) => prev.filter((wf) => wf.id !== workflowId));
      return;
    } catch (err) {
      console.warn('API connection failed for deleteWorkflow, falling back to local state update.', err);
    }
    setWorkflows((prev) => prev.filter((wf) => wf.id !== workflowId));
  };

  const getWorkflowExecutions = async (workflowId: string): Promise<WorkflowExecution[]> => {
    try {
      return await api.get<WorkflowExecution[]>(`/api/workflows/${workflowId}/executions`);
    } catch (err) {
      console.warn('API failed for getWorkflowExecutions.', err);
      return [];
    }
  };

  const addProduct = async (data: ProductFormData) => {
    try {
      const saved = await api.post<Product>('/api/products', data);
      setProducts((prev) => [saved, ...prev]);
      return;
    } catch (err) {
      console.warn('API failed for addProduct, falling back to local state.', err);
    }
    const newProduct: Product = {
      ...data,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setProducts((prev) => [newProduct, ...prev]);
  };

  const updateProduct = async (id: number, data: Partial<Product>) => {
    try {
      const updated = await api.patch<Product>(`/api/products/${id}`, data);
      setProducts((prev) => prev.map((p) => p.id === id ? updated : p));
      return;
    } catch (err) {
      console.warn('API failed for updateProduct, falling back to local state.', err);
    }
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p));
  };

  const deleteProduct = async (id: number) => {
    try {
      await api.delete(`/api/products/${id}`);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      return;
    } catch (err) {
      console.warn('API failed for deleteProduct, falling back to local state.', err);
    }
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const addAppointment = async (data: AppointmentFormData) => {
    try {
      const saved = await api.post<Appointment>('/api/appointments', data);
      setAppointments((prev) => [...prev, saved]);
      return;
    } catch (err) {
      console.warn('API failed for addAppointment, falling back.', err);
    }
    const newAppt: Appointment = {
      ...data,
      id: Date.now(),
      googleEventId: '',
      createdBy: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setAppointments((prev) => [...prev, newAppt]);
  };

  const updateAppointment = async (id: number, data: Partial<Appointment>) => {
    try {
      const updated = await api.patch<Appointment>(`/api/appointments/${id}`, data);
      setAppointments((prev) => prev.map((a) => a.id === id ? updated : a));
      return;
    } catch (err) {
      console.warn('API failed for updateAppointment, falling back.', err);
    }
    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, ...data, updatedAt: new Date().toISOString() } : a));
  };

  const deleteAppointment = async (id: number) => {
    try {
      await api.delete(`/api/appointments/${id}`);
      setAppointments((prev) => prev.filter((a) => a.id !== id));
      return;
    } catch (err) {
      console.warn('API failed for deleteAppointment, falling back.', err);
    }
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  };

  const addCategory = async (data: CategoryFormData) => {
    try {
      const saved = await api.post<Category>('/api/categories', data);
      setCategories((prev) => [...prev, saved]);
      return;
    } catch (err) {
      console.warn('API failed for addCategory, falling back.', err);
    }
    const newCat: Category = { ...data, id: Date.now(), createdAt: new Date().toISOString() };
    setCategories((prev) => [...prev, newCat]);
  };

  const updateCategory = async (id: number, data: Partial<Category>) => {
    try {
      const updated = await api.patch<Category>(`/api/categories/${id}`, data);
      setCategories((prev) => prev.map((c) => c.id === id ? updated : c));
      return;
    } catch (err) {
      console.warn('API failed for updateCategory, falling back.', err);
    }
    setCategories((prev) => prev.map((c) => c.id === id ? { ...c, ...data } : c));
  };

  const deleteCategory = async (id: number) => {
    try {
      await api.delete(`/api/categories/${id}`);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      return;
    } catch (err) {
      console.warn('API failed for deleteCategory, falling back.', err);
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const addStage = async (stage: PipelineStage) => {
    try {
      const saved = await api.post<PipelineStage>('/api/stages', stage);
      setStages((prev) => [...prev, saved]);
      return;
    } catch (err) {
      console.warn('API failed for addStage, falling back to local state update.', err);
    }
    setStages((prev) => [...prev, stage]);
  };

  const renameStage = async (id: string, label: string) => {
    try {
      const updated = await api.patch<PipelineStage>(`/api/stages/${id}`, { label });
      setStages((prev) => prev.map((s) => s.id === id ? updated : s));
      return;
    } catch (err) {
      console.warn('API failed for renameStage, falling back to local state update.', err);
    }
    setStages((prev) => prev.map((s) => s.id === id ? { ...s, label } : s));
  };

  const deleteStage = async (id: string) => {
    try {
      await api.delete(`/api/stages/${id}`);
      setStages((prev) => prev.filter((s) => s.id !== id));
      return;
    } catch (err) {
      console.warn('API failed for deleteStage (stage may be in use by a deal).', err);
      throw err;
    }
  };

  const addPipeline = async (id: string, name: string) => {
    const saved = await api.post<Pipeline>('/api/pipelines', { id, name });
    setPipelines((prev) => [...prev, saved]);
  };

  const renamePipeline = async (id: string, name: string) => {
    const updated = await api.patch<Pipeline>(`/api/pipelines/${id}`, { name });
    setPipelines((prev) => prev.map((p) => p.id === id ? updated : p));
  };

  const setDefaultPipeline = async (id: string) => {
    const updated = await api.patch<Pipeline>(`/api/pipelines/${id}`, { isDefault: true });
    setPipelines((prev) => prev.map((p) => ({ ...p, isDefault: p.id === updated.id })));
  };

  const deletePipeline = async (id: string) => {
    await api.delete(`/api/pipelines/${id}`);
    setPipelines((prev) => prev.filter((p) => p.id !== id));
    if (selectedPipelineId === id) {
      setSelectedPipelineId((prev) => pipelines.find((p) => p.id !== id)?.id || prev);
    }
  };

  const addLeadScoringRule = async (rule: Omit<LeadScoringRule, 'id' | 'conditions'>) => {
    const saved = await api.post<LeadScoringRule>('/api/lead-scoring-rules', rule);
    setLeadScoringRules((prev) => [...prev, saved]);
  };

  const toggleLeadScoringRule = async (id: string) => {
    const rule = leadScoringRules.find((r) => r.id === id);
    if (!rule) return;
    const updated = await api.patch<LeadScoringRule>(`/api/lead-scoring-rules/${id}`, { status: rule.status === 'active' ? 'paused' : 'active' });
    setLeadScoringRules((prev) => prev.map((r) => r.id === id ? updated : r));
  };

  const deleteLeadScoringRule = async (id: string) => {
    await api.delete(`/api/lead-scoring-rules/${id}`);
    setLeadScoringRules((prev) => prev.filter((r) => r.id !== id));
  };

  const addWebhook = async (webhook: { name: string; eventType: string; targetUrl: string; secret?: string }) => {
    const saved = await api.post<WebhookSubscription>('/api/webhooks', webhook);
    setWebhooks((prev) => [...prev, saved]);
  };

  const toggleWebhook = async (id: string) => {
    const wh = webhooks.find((w) => w.id === id);
    if (!wh) return;
    const updated = await api.patch<WebhookSubscription>(`/api/webhooks/${id}`, { status: wh.status === 'active' ? 'paused' : 'active' });
    setWebhooks((prev) => prev.map((w) => w.id === id ? updated : w));
  };

  const deleteWebhook = async (id: string) => {
    await api.delete(`/api/webhooks/${id}`);
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
  };

  const getWebhookDeliveries = async (webhookId: string): Promise<WebhookDelivery[]> => {
    try {
      return await api.get<WebhookDelivery[]>(`/api/webhooks/${webhookId}/deliveries`);
    } catch (err) {
      console.warn('API failed for getWebhookDeliveries.', err);
      return [];
    }
  };

  const retryWebhookDelivery = async (webhookId: string, deliveryId: string) => {
    await api.post(`/api/webhooks/${webhookId}/deliveries/${deliveryId}/retry`, {});
  };

  const createApiKey = async (name: string, scopes: string[]): Promise<ApiKey> => {
    const saved = await api.post<ApiKey>('/api/api-keys', { name, scopes });
    setApiKeys((prev) => [{ ...saved, key: undefined }, ...prev]);
    return saved; // includes the one-time-only raw `key` field for the caller to display
  };

  const revokeApiKey = async (id: string) => {
    await api.delete(`/api/api-keys/${id}`);
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
  };

  const sendChatMessage = async (leadId: string, content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    try {
      const saved = await api.post<any>('/api/chat-messages', { leadId, content: trimmed });
      setChatMessages((prev) => [...prev, saved]);
      setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, lastMessage: trimmed, lastMessageTime: 'Just now' } : l));
      return;
    } catch (err) {
      console.warn('API failed for sendChatMessage, falling back to local state update.', err);
    }
    const newMessage: ChatMessage = {
      id: `MSG-${Date.now()}`,
      channel: leads.find((l) => l.id === leadId)?.channel || 'facebook',
      leadId,
      from: 'agent',
      senderName: 'You (Current User)',
      senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      content: trimmed,
      timestamp: 'Just now',
      isRead: true,
    };
    setChatMessages((prev) => [...prev, newMessage]);
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, lastMessage: trimmed, lastMessageTime: 'Just now' } : l));
  };

  const addTask = async (data: Omit<Task, 'id' | 'createdAt'>) => {
    try {
      const saved = await api.post<Task>('/api/tasks', data);
      setTasks((prev) => [saved, ...prev]);
      return;
    } catch (err) {
      console.warn('API failed for addTask, falling back.', err);
    }
    const newTask: Task = {
      ...data,
      id: `TSK-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setTasks((prev) => [newTask, ...prev]);
  };

  const updateTask = async (id: string, data: Partial<Task>) => {
    try {
      const updated = await api.patch<Task>(`/api/tasks/${id}`, data);
      setTasks((prev) => prev.map((t) => t.id === id ? updated : t));
      return;
    } catch (err) {
      console.warn('API failed for updateTask, falling back.', err);
    }
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, ...data } : t));
  };

  const deleteTask = async (id: string) => {
    try {
      await api.delete(`/api/tasks/${id}`);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      return;
    } catch (err) {
      console.warn('API failed for deleteTask, falling back.', err);
    }
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const allocateLead = async (leadId: string, salesPersonId: string, salesPersonName: string, salesPersonAvatar: string, projectName: string, notes: string, isReallocation: boolean) => {
    try {
      const alloc = await api.post<AllocationRecord>(`/api/leads/${leadId}/allocate`, {
        salesPersonId, salesPersonName, salesPersonAvatar, projectName, notes, isReallocation,
      });
      setAllocations((prev) => {
        if (!isReallocation) {
          const existingIdx = prev.findIndex(a => a.leadId === leadId && a.status === 'active');
          if (existingIdx >= 0) {
            const updated = [...prev];
            updated[existingIdx] = alloc;
            return updated;
          }
        }
        return [...prev, alloc];
      });
      setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, isAllocated: true, assignedTo: salesPersonId } : l));
      return;
    } catch (err) {
      console.warn('API failed for allocateLead, falling back to local state.', err);
    }
    // Local fallback
    const existingAlloc = allocations.find(a => a.leadId === leadId && a.status === 'active');
    if (!isReallocation && existingAlloc) {
      setAllocations(prev => prev.map(a => a.id === existingAlloc.id ? { ...a, salesPersonId, salesPersonName, salesPersonAvatar, projectName: projectName || a.projectName, notes: notes || a.notes, updatedAt: new Date().toISOString() } : a));
    } else {
      const newAlloc: AllocationRecord = {
        id: Date.now(),
        leadId,
        salesPersonId,
        salesPersonName,
        salesPersonAvatar,
        projectName: projectName || '',
        status: 'active',
        notes: notes || '',
        isReallocation,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setAllocations(prev => [...prev, newAlloc]);
    }
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, isAllocated: true, assignedTo: salesPersonId } : l));
  };

  const getAllocationHistory = (leadId: string): AllocationRecord[] => {
    return allocations.filter(a => a.leadId === leadId);
  };

  const getLeadTags = (leadId: string): CustomerTag[] => {
    return leadTags[leadId] || [];
  };

  const addTag = async (data: { name: string; color: string }) => {
    try {
      const saved = await api.post<CustomerTag>('/api/tags', data);
      setTags((prev) => [...prev, saved]);
      return;
    } catch (err) {
      console.warn('API failed for addTag, falling back.', err);
    }
    const newTag: CustomerTag = {
      id: Date.now(),
      name: data.name,
      color: data.color || '#6366f1',
      createdAt: new Date().toISOString(),
    };
    setTags((prev) => [...prev, newTag]);
  };

  const updateTag = async (id: number, data: Partial<CustomerTag>) => {
    try {
      const updated = await api.patch<CustomerTag>(`/api/tags/${id}`, data);
      setTags((prev) => prev.map((t) => t.id === id ? updated : t));
      return;
    } catch (err) {
      console.warn('API failed for updateTag, falling back.', err);
    }
    setTags((prev) => prev.map((t) => t.id === id ? { ...t, ...data } : t));
  };

  const deleteTag = async (id: number) => {
    try {
      await api.delete(`/api/tags/${id}`);
      setTags((prev) => prev.filter((t) => t.id !== id));
      Object.keys(leadTags).forEach((leadId) => {
        if (leadTags[leadId].some(t => t.id === id)) {
          setLeadTags((prev) => ({ ...prev, [leadId]: prev[leadId].filter(t => t.id !== id) }));
        }
      });
      return;
    } catch (err) {
      console.warn('API failed for deleteTag, falling back.', err);
    }
    setTags((prev) => prev.filter((t) => t.id !== id));
  };

  const addTagToLead = async (leadId: string, tagId: number) => {
    try {
      await api.post(`/api/leads/${leadId}/tags`, { tagId });
      const tag = tags.find(t => t.id === tagId);
      if (tag) {
        setLeadTags((prev) => ({
          ...prev,
          [leadId]: [...(prev[leadId] || []), tag],
        }));
      }
      return;
    } catch (err) {
      console.warn('API failed for addTagToLead, falling back.', err);
    }
    const tag = tags.find(t => t.id === tagId);
    if (tag) {
      setLeadTags((prev) => ({
        ...prev,
        [leadId]: [...(prev[leadId] || []), tag],
      }));
    }
  };

  const removeTagFromLead = async (leadId: string, tagId: number) => {
    try {
      await api.delete(`/api/leads/${leadId}/tags/${tagId}`);
      setLeadTags((prev) => ({
        ...prev,
        [leadId]: (prev[leadId] || []).filter(t => t.id !== tagId),
      }));
      return;
    } catch (err) {
      console.warn('API failed for removeTagFromLead, falling back.', err);
    }
    setLeadTags((prev) => ({
      ...prev,
      [leadId]: (prev[leadId] || []).filter(t => t.id !== tagId),
    }));
  };

  return (
    <CRMContext.Provider
      value={{
        isLoading,
        currentView,
        setCurrentView,
        deals,
        contacts,
        companies,
        activities,
        workflows,
        metrics,
        stages,
        leads,
        chatMessages,
        sendChatMessage,
        selectedLead,
        setSelectedLead,
        tags,
        leadTags,
        allocations,
        searchQuery,
        setSearchQuery,
        selectedContact,
        setSelectedContact,
        selectedDeal,
        setSelectedDeal,
        isAddDealModalOpen,
        setIsAddDealModalOpen,
        isAddContactModalOpen,
        setIsAddContactModalOpen,
        isAddWorkflowModalOpen,
        setIsAddWorkflowModalOpen,
        addDeal,
        updateDealStage,
        deleteDeal,
        addContact,
        deleteContact,
        toggleWorkflowStatus,
        addWorkflow,
        deleteWorkflow,
        getWorkflowExecutions,
        addStage,
        renameStage,
        deleteStage,
        pipelines,
        selectedPipelineId,
        setSelectedPipelineId,
        addPipeline,
        renamePipeline,
        setDefaultPipeline,
        deletePipeline,
        leadScoringRules,
        addLeadScoringRule,
        toggleLeadScoringRule,
        deleteLeadScoringRule,
        webhooks,
        addWebhook,
        toggleWebhook,
        deleteWebhook,
        getWebhookDeliveries,
        retryWebhookDelivery,
        apiKeys,
        createApiKey,
        revokeApiKey,
        addTag,
        updateTag,
        deleteTag,
        addTagToLead,
        removeTagFromLead,
        getAllocationHistory,
        getLeadTags,
        allocateLead,
        categories,
        socialAccounts,
        appointments,
        addAppointment,
        updateAppointment,
        deleteAppointment,
        addCategory,
        updateCategory,
        deleteCategory,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        tasks,
        addTask,
        updateTask,
        deleteTask,
        notifications,
        notificationCount,
        markNotificationRead,
        clearNotifications
      }}
    >
      {children}
    </CRMContext.Provider>
  );
};

export const useCRM = () => {
  const context = useContext(CRMContext);
  if (!context) {
    throw new Error('useCRM must be used within a CRMProvider');
  }
  return context;
};
