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
  ProductFormData
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
  INITIAL_PRODUCTS
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
  allocateLead: (leadId: string, salesPersonId: string) => void;

  products: Product[];
  addProduct: (data: ProductFormData) => Promise<void>;
  updateProduct: (id: number, data: Partial<Product>) => Promise<void>;
  deleteProduct: (id: number) => Promise<void>;

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
  const [products, setProducts] = useState<Product[]>([]);

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
        const [dealsData, contactsData, companiesData, activitiesData, workflowsData, metricsData, stagesData, leadsData, chatData, productsData] = await Promise.all([
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
        ]);

        if (dealsData?.length > 0) setDeals(dealsData);
        if (contactsData?.length > 0) setContacts(contactsData);
        if (companiesData?.length > 0) setCompanies(companiesData);
        if (activitiesData?.length > 0) setActivities(activitiesData);
        if (workflowsData?.length > 0) setWorkflows(workflowsData);
        if (metricsData?.length > 0) setMetrics(metricsData);
        if (stagesData?.length > 0) setStages(stagesData);
        if (leadsData?.length > 0) setLeads(leadsData);
        if (chatData?.length > 0) setChatMessages(chatData);
        if (productsData?.length > 0) setProducts(productsData);
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
        setLeads(INITIAL_LEADS);
        setChatMessages(INITIAL_CHAT_MESSAGES);
        setProducts(INITIAL_PRODUCTS);
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
          ? { ...wf, status: wf.status === 'active' ? 'paused' : 'active' }
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

  const allocateLead = (leadId: string, salesPersonId: string) => {
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, isAllocated: true, assignedTo: salesPersonId } : l));
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
        allocateLead,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
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
