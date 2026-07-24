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
  addWorkflow: (workflow: Omit<WorkflowRule, 'id' | 'executionsCount' | 'lastExecuted'>) => Promise<void>;

  addStage: (stage: PipelineStage) => void;
  renameStage: (id: string, label: string) => void;
  deleteStage: (id: string) => void;
  
  leads: Lead[];
  chatMessages: ChatMessage[];
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

  notificationCount: number;
  clearNotifications: () => void;
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
  const [socialAccounts] = useState<SocialAccount[]>(INITIAL_SOCIAL_ACCOUNTS);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Per-user stages from localStorage
  const [stages, setStages] = useState<PipelineStage[]>(() => {
    try {
      const saved = localStorage.getItem(`rf-stages-${userId}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_STAGES;
  });
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [isAddDealModalOpen, setIsAddDealModalOpen] = useState(false);
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [isAddWorkflowModalOpen, setIsAddWorkflowModalOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(4);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        console.log('Fetching CRM data from database API...');
        const [dealsData, contactsData, companiesData, activitiesData, workflowsData, metricsData, stagesData,           leadsData, chatData, productsData, categoriesData, appointmentsData, tasksData, tagsData, allocData] = await Promise.all([
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
        ]) as [
          Deal[] | null, Contact[] | null, CompanyAccount[] | null, Activity[] | null,
          WorkflowRule[] | null, MetricCardData[] | null, PipelineStage[] | null,
          Lead[] | null, ChatMessage[] | null, Product[] | null, Category[] | null,
          Appointment[] | null, Task[] | null, CustomerTag[] | null, AllocationRecord[] | null
        ];

        if (dealsData && dealsData.length > 0) setDeals(dealsData);
        if (contactsData && contactsData.length > 0) setContacts(contactsData);
        if (companiesData && companiesData.length > 0) setCompanies(companiesData);
        if (activitiesData && activitiesData.length > 0) setActivities(activitiesData);
        if (workflowsData && workflowsData.length > 0) setWorkflows(workflowsData);
        if (metricsData && metricsData.length > 0) setMetrics(metricsData);
        if (stagesData && stagesData.length > 0) setStages(stagesData);
        if (leadsData && leadsData.length > 0) setLeads(leadsData);
        if (chatData && chatData.length > 0) setChatMessages(chatData);
        if (productsData && productsData.length > 0) setProducts(productsData);
        if (categoriesData && categoriesData.length > 0) setCategories(categoriesData);
        if (appointmentsData && appointmentsData.length > 0) setAppointments(appointmentsData);
        if (tasksData && tasksData.length > 0) setTasks(tasksData);
        if (tagsData && tagsData.length > 0) setTags(tagsData);
        if (allocData && allocData.length > 0) setAllocations(allocData);
        console.log('CRM data successfully loaded from database.');
      } catch (err) {
        console.warn('Backend API not available, loading mock data:', err);
        setDeals(INITIAL_DEALS);
        setContacts(INITIAL_CONTACTS);
        setCompanies(INITIAL_COMPANIES);
        setActivities(INITIAL_ACTIVITIES);
        setWorkflows(INITIAL_WORKFLOWS);
        setMetrics(INITIAL_METRICS);
        setStages(INITIAL_STAGES);
        setLeads(enrichLeads(INITIAL_LEADS));
        setChatMessages(INITIAL_CHAT_MESSAGES);
        setProducts(INITIAL_PRODUCTS);
        setCategories(INITIAL_CATEGORIES);
        setAppointments(INITIAL_APPOINTMENTS);
        setTasks(INITIAL_TASKS);
        setTags(INITIAL_TAGS);
        setLeadTags(LEAD_TAGS);
        setAllocations(INITIAL_ALLOCATIONS);
        // Load per-user stages
        try {
          const saved = localStorage.getItem(`rf-stages-${userId}`);
          if (saved) setStages(JSON.parse(saved));
        } catch {}
      }
      setIsLoading(false);
    }
    loadData();
  }, [userId]);

  const clearNotifications = () => setNotificationCount(0);

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
        targetName: `$${savedDeal.value.toLocaleString()}`
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
      targetName: `$${newDeal.value.toLocaleString()}`
    };
    setActivities((prev) => [newActivity, ...prev]);
  };

  const updateDealStage = async (dealId: string, newStage: DealStage) => {
    const stageLabel = stages.find(s => s.id === newStage)?.label || newStage;
    const targetDeal = deals.find(d => d.id === dealId);
    const newProbability = newStage === 'closed_won' ? 100 : newStage === 'closed_lost' ? 0 : (targetDeal ? targetDeal.probability : 50);

    try {
      const updatedDeal = await api.patch<any>(`/api/deals/${dealId}/stage`, { stage: newStage, probability: newProbability });
      setDeals((prev) => prev.map((d) => d.id === dealId ? updatedDeal : d));

      // Create activity
      const newActData = {
        type: newStage === 'closed_won' ? 'deal_won' : 'stage_change',
        title: newStage === 'closed_won' ? 'Deal Closed Won!' : 'Stage Updated',
        description: `Moved "${updatedDeal.title}" to ${stageLabel}.`,
        user: {
          name: 'You (Current User)',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        },
        targetName: updatedDeal.company
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
            type: newStage === 'closed_won' ? 'deal_won' : 'stage_change',
            title: newStage === 'closed_won' ? 'Deal Closed Won!' : 'Stage Updated',
            description: `Moved "${deal.title}" to ${stageLabel}.`,
            timestamp: 'Just now',
            user: {
              name: 'You (Current User)',
              avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            },
            targetName: deal.company
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
          ? { ...wf, status: wf.status === 0 ? 1 : 0 }
          : wf
      )
    );
  };

  const addWorkflow = async (newWfData: Omit<WorkflowRule, 'id' | 'executionsCount' | 'lastExecuted'>) => {
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
      executionsCount: 0,
      lastExecuted: 'Never'
    };
    setWorkflows((prev) => [newWf, ...prev]);
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

  const persistStages = (updated: PipelineStage[]) => {
    localStorage.setItem(`rf-stages-${userId}`, JSON.stringify(updated));
  };

  const addStage = (stage: PipelineStage) => {
    setStages((prev) => {
      const updated = [...prev, stage];
      persistStages(updated);
      return updated;
    });
  };

  const renameStage = (id: string, label: string) => {
    setStages((prev) => {
      const updated = prev.map((s) => s.id === id ? { ...s, label } : s);
      persistStages(updated);
      return updated;
    });
  };

  const deleteStage = (id: string) => {
    setStages((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      persistStages(updated);
      return updated;
    });
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
        addStage,
        renameStage,
        deleteStage,
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
        notificationCount,
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
