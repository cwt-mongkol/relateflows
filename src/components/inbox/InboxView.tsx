import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useCRM } from '../../context/CRMContext';
import { useSettings } from '../../context/SettingsContext';
import { MessageCircle, User, CheckCircle2, ArrowRight, Package, Plus, Edit3, Save, Trash2, ChevronDown, Tag, Zap, Settings2, X, Building2, FileText, Clock, History, BarChart3 } from 'lucide-react';
import { TagManager } from './TagManager';
import type { ProductFormData, ProductStatus, QuickReply, CrmUser } from '../../types/crm';

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  facebook: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  ),
  line: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="currentColor">
      <path d="M12 2C6.477 2 2 5.925 2 10.765c0 2.784 1.403 5.273 3.595 6.896.137.1.218.262.218.437v2.24c0 .38.394.629.728.463l2.793-1.38a.566.566 0 01.484-.026 9.47 9.47 0 002.182.26 9.954 9.954 0 001.48-.108c4.794-.795 8.3-4.19 8.48-8.105L22 10.765C22 5.925 17.523 2 12 2zM8.59 12.267c0 .184-.15.334-.335.334H5.726a.336.336 0 01-.335-.334V8.684c0-.184.15-.334.335-.334.185 0 .334.15.334.334v2.915h1.796c.185 0 .334.15.334.334v.334zm.786-3.292h.002v3.583c0 .184-.15.334-.335.334a.336.336 0 01-.335-.334V8.975c0-.348.284-.627.634-.627h3.104c.183 0 .334.15.334.334v.293c0 .184-.15.334-.334.334H9.376zm2.994 3.958a.336.336 0 01-.334.334h-2.07a.336.336 0 01-.334-.334v-.293c0-.184.15-.334.334-.334h1.408V9.975c0-.184.15-.334.334-.334h.328c.185 0 .334.15.334.334v2.958zm2.66-.334c0 .184-.15.334-.335.334H12.84a.336.336 0 01-.335-.334v-.293c0-.184.15-.334.335-.334h1.385l-1.74-1.947a.367.367 0 01-.083-.202v-.42c0-.184.15-.334.335-.334h1.804c.185 0 .334.15.334.334v.293c0 .184-.15.334-.334.334H13.38l1.734 1.947c.062.07.103.162.103.266v.356zm2.47-1.86c0 .184-.15.334-.334.334h-1.786v.59h1.787c.184 0 .334.15.334.334v.293c0 .184-.15.334-.334.334H14.38a.336.336 0 01-.335-.334v-3.25c0-.184.15-.334.335-.334h2.126c.184 0 .334.15.334.334v.293c0 .184-.15.334-.334.334h-1.455v.586h1.455c.184 0 .334.15.334.334v.293z" />
    </svg>
  ),
};

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  facebook: PLATFORM_ICONS.facebook,
  instagram: PLATFORM_ICONS.instagram,
  line: PLATFORM_ICONS.line,
};


function getStatusBadges(t: (key: string) => string): Record<ProductStatus, { label: string; class: string }> {
  return {
    0: { label: t('status.pending'), class: 'bg-amber-50 text-amber-700 border-amber-200' },
    1: { label: t('status.quoted'), class: 'bg-blue-50 text-blue-700 border-blue-200' },
    2: { label: t('status.ordered'), class: 'bg-purple-50 text-purple-700 border-purple-200' },
    3: { label: t('status.delivered'), class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  };
}

const EMPTY_PRODUCT_FORM: ProductFormData = { leadId: '', categoryId: null, name: '', quantity: 1, price: 0, description: '', notes: '', status: 0 };

export const InboxView: React.FC = () => {
  const { isLoading, leads, chatMessages, selectedLead, setSelectedLead, categories, socialAccounts, products, addProduct, updateProduct, deleteProduct, leadTags, getAllocationHistory, allocateLead } = useCRM();
  const { t, language } = useSettings();
  const STATUS_BADGES = useMemo(() => getStatusBadges(t), [t, language]);

  const [rightPanelTab, setRightPanelTab] = useState<'products' | 'allocation'>('products');
  const [showTagManager, setShowTagManager] = useState(false);

  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [replyAccountId, setReplyAccountId] = useState<string>('');
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productForm, setProductForm] = useState<ProductFormData>(EMPTY_PRODUCT_FORM);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Partial<ProductFormData>>({});

  // Quick replies
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>(() => {
    try {
      const saved = localStorage.getItem('rf-quick-replies');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showQuickReplyManager, setShowQuickReplyManager] = useState(false);

  // Allocation form state
  const [allocationSalesPersonId, setAllocationSalesPersonId] = useState('');
  const [allocationSalesPersonName, setAllocationSalesPersonName] = useState('');
  const [allocationSalesPersonAvatar, setAllocationSalesPersonAvatar] = useState('');
  const [allocationProjectName, setAllocationProjectName] = useState('');
  const [allocationNotes, setAllocationNotes] = useState('');
  const [allocationSalesUsers, setAllocationSalesUsers] = useState<CrmUser[]>([]);
  const [allocationSubmitting, setAllocationSubmitting] = useState(false);
  const [qrForm, setQrForm] = useState({ label: '', message: '' });
  const [qrEditId, setQrEditId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');

  const saveQuickReplies = useCallback((replies: QuickReply[]) => {
    setQuickReplies(replies);
    localStorage.setItem('rf-quick-replies', JSON.stringify(replies));
  }, []);

  const addQuickReply = useCallback(() => {
    if (!qrForm.label.trim() || !qrForm.message.trim()) return;
    const newReply: QuickReply = {
      id: 'QR-' + Date.now(),
      label: qrForm.label.trim(),
      message: qrForm.message.trim(),
      createdAt: new Date().toISOString(),
    };
    saveQuickReplies([...quickReplies, newReply]);
    setQrForm({ label: '', message: '' });
  }, [qrForm, quickReplies, saveQuickReplies]);

  const updateQuickReply = useCallback(() => {
    if (!qrEditId || !qrForm.label.trim() || !qrForm.message.trim()) return;
    saveQuickReplies(quickReplies.map(r =>
      r.id === qrEditId ? { ...r, label: qrForm.label.trim(), message: qrForm.message.trim() } : r
    ));
    setQrEditId(null);
    setQrForm({ label: '', message: '' });
  }, [qrEditId, qrForm, quickReplies, saveQuickReplies]);

  const deleteQuickReply = useCallback((id: string) => {
    saveQuickReplies(quickReplies.filter(r => r.id !== id));
  }, [quickReplies, saveQuickReplies]);

  const selectQuickReply = useCallback((msg: string) => {
    setChatInput(msg);
    setShowQuickReplies(false);
  }, []);

  // Load sales users for allocation
  const allocationHistory = useMemo(() => selectedLead ? getAllocationHistory(selectedLead.id) : [], [getAllocationHistory, selectedLead]);
  const activeAlloc = allocationHistory.find(a => a.status === 'active');

  useEffect(() => {
    if (activeAlloc) {
      setAllocationSalesPersonId(activeAlloc.salesPersonId);
      setAllocationSalesPersonName(activeAlloc.salesPersonName);
      setAllocationSalesPersonAvatar(activeAlloc.salesPersonAvatar);
      setAllocationProjectName(activeAlloc.projectName);
    }
    try {
      const stored = localStorage.getItem('rf-crm-users');
      if (stored) {
        const users: CrmUser[] = JSON.parse(stored);
        const sales = users.filter(u => u.roleName?.toLowerCase().includes('sales') || u.roleId === 3);
        setAllocationSalesUsers(sales);
      }
    } catch {}
    if (allocationSalesUsers.length === 0) {
      setAllocationSalesUsers([
        { id: 'demo-sales-001', name: 'Marcus Brody (Sales Rep)', email: 'marcus.brody@relateflows.com', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', provider: 'google', roleId: 3, roleName: 'Sales Rep', status: 'active', createdAt: '' },
        { id: 'demo-mgr-001', name: 'Alex Rivera (Manager)', email: 'alex.rivera@relateflows.com', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', provider: 'google', roleId: 2, roleName: 'Manager', status: 'active', createdAt: '' },
      ]);
    }
  }, [activeAlloc]);

  const handleAllocate = async () => {
    if (!selectedLead || !allocationSalesPersonId) return;
    setAllocationSubmitting(true);
    const user = allocationSalesUsers.find(u => u.id === allocationSalesPersonId);
    await allocateLead(selectedLead.id, allocationSalesPersonId, allocationSalesPersonName || user?.name || '', allocationSalesPersonAvatar || user?.avatar || '', allocationProjectName, allocationNotes, !!activeAlloc);
    setAllocationSubmitting(false);
    setRightPanelTab('products');
  };

  const handleAllocationUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const user = allocationSalesUsers.find(u => u.id === e.target.value);
    setAllocationSalesPersonId(e.target.value);
    setAllocationSalesPersonName(user?.name || '');
    setAllocationSalesPersonAvatar(user?.avatar || '');
  };

  // Default: select all accounts
  const activeAccountIds = selectedAccountIds.length > 0 ? selectedAccountIds : socialAccounts.map((a) => a.id);

  const filteredLeads = leads.filter((l) => activeAccountIds.includes(l.socialAccountId));

  const leadChats = filteredLeads.map((lead) => {
    const msgs = chatMessages.filter((m) => m.leadId === lead.id);
    return { lead, messages: msgs };
  });

  const selectedMessages = selectedLead
    ? chatMessages.filter((m) => m.leadId === selectedLead.id)
    : [];

  const leadProducts = selectedLead
    ? products.filter((p) => p.leadId === selectedLead.id)
    : [];

  const unreadTotal = filteredLeads.reduce((sum, l) => sum + l.unreadCount, 0);

  const replyAccount = socialAccounts.find((a) => a.id === replyAccountId) || (selectedLead ? socialAccounts.find((a) => a.id === selectedLead.socialAccountId) : undefined) || socialAccounts[0];

  const resetForm = () => {
    setProductForm(EMPTY_PRODUCT_FORM);
    setShowAddProduct(false);
  };

  const handleAddProduct = async () => {
    if (!productForm.name.trim() || !selectedLead) return;
    await addProduct({ ...productForm, leadId: selectedLead.id });
    resetForm();
  };

  const startEdit = (product: typeof products[0]) => {
    setEditingProductId(product.id);
    setEditValues({ name: product.name, quantity: product.quantity, price: product.price, description: product.description, notes: product.notes, status: product.status });
  };

  const handleUpdate = async (id: number) => {
    if (!editValues.name?.trim()) return;
    await updateProduct(id, editValues);
    setEditingProductId(null);
    setEditValues({});
  };

  const handleStatusChange = async (id: number, status: ProductStatus) => {
    await updateProduct(id, { status });
  };

  const totalValue = leadProducts.reduce((sum, p) => sum + p.price * p.quantity, 0);

  const getAccountName = (accountId: string) => socialAccounts.find(a => a.id === accountId)?.name || '';


  if (isLoading) {
    return (
      <div className="flex gap-6 h-[calc(100vh-12rem)]">
        <div className="w-96 skeleton rounded-2xl h-full" />
        <div className="flex-1 skeleton rounded-2xl h-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 md:h-[calc(100vh-12rem)] animate-fadeIn">
      {/* Lead List */}
      <div className={`shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden ${selectedLead ? 'hidden md:flex md:w-96' : 'w-full md:w-96'}`}>
        <div className="p-4 border-b border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900">{t('inbox.title')}</h3>
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{t('inbox.unread').replace('{count}', String(unreadTotal))}</span>
          </div>
          <p className="text-xs text-slate-500">{t('inbox.conversations').replace('{count}', String(filteredLeads.length)).replace('{total}', String(leads.length))}</p>

          {/* Account filter chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {socialAccounts.map((acc) => {
              const on = activeAccountIds.includes(acc.id);
              const channelIcon = PLATFORM_ICONS[acc.channel];
              return (
                <button
                  key={acc.id}
                  onClick={() => {
                    setSelectedAccountIds((prev) =>
                      on ? prev.filter((id) => id !== acc.id) : [...prev, acc.id]
                    );
                  }}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                    on
                      ? acc.channel === 'facebook' ? 'bg-blue-50 text-blue-700 border-blue-200' : acc.channel === 'line' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-pink-50 text-pink-700 border-pink-200'
                      : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}
                >
                  {channelIcon}
                  <span className="truncate max-w-20">{acc.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {leadChats.map(({ lead, messages }) => {
            const unreadMsg = messages.filter((m) => !m.isRead && m.from === 'contact').length;
            const leadTagsList = leadTags[lead.id] || [];
            return (
              <button
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className={`w-full text-left p-3.5 transition-all hover:bg-slate-50 flex items-start gap-3 ${
                  selectedLead?.id === lead.id ? 'bg-blue-50 border-l-2 border-blue-600' : ''
                }`}
              >
                <div className="relative shrink-0">
                  <img src={lead.avatar} alt={lead.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white flex items-center justify-center">
                    {CHANNEL_ICONS[lead.channel]}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{lead.name}</h4>
                    <span className="text-[10px] text-slate-400 shrink-0">{lead.lastMessageTime}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{lead.lastMessage}</p>
                  {leadTagsList.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {leadTagsList.slice(0, 3).map((t: {id: number; name: string; color: string}) => (
                        <span key={t.id} className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: t.color + '20', color: t.color }}>
                          {t.name}
                        </span>
                      ))}
                      {leadTagsList.length > 3 && (
                        <span className="text-[8px] text-slate-400">+{leadTagsList.length - 3}</span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-medium text-slate-400 flex items-center gap-1">{CHANNEL_ICONS[lead.channel]} {getAccountName(lead.socialAccountId)}</span>
                    {lead.isAllocated && (
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{t('inbox.allocated')}</span>
                    )}
                    {unreadMsg > 0 && (
                      <span className="text-[9px] font-bold text-white bg-blue-600 px-1.5 py-0.5 rounded-full ml-auto">{unreadMsg}</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat Thread + Products Panel */}
      {selectedLead ? (
        <>
          {/* Chat Thread */}
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedLead(null)} className="md:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all">
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </button>
                <img src={selectedLead.avatar} alt={selectedLead.name} className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-200" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{selectedLead.name}</h4>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">{CHANNEL_ICONS[selectedLead.channel]} {getAccountName(selectedLead.socialAccountId)}</span>
                    {selectedLead.isAllocated ? (
                      <span className="flex items-center gap-1 text-emerald-600 font-bold">
                        <CheckCircle2 className="w-3 h-3" /> {t('inbox.allocated')}
                      </span>
                    ) : (
                      <span className="text-amber-600 font-bold">{t('inbox.unassigned')}</span>
                    )}
                  </div>
                  {/* Tags in header */}
                  {(leadTags[selectedLead.id] || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(leadTags[selectedLead.id] || []).map((tag: {id: number; name: string; color: string}) => (
                        <span key={tag.id} className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: tag.color + '20', color: tag.color }}>
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowTagManager(true)}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl transition-all border border-slate-200"
                >
                  <Tag className="w-3.5 h-3.5" />
                  {t('inbox.tags')}
                </button>
                <button
                  onClick={() => setRightPanelTab('allocation')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                    selectedLead.isAllocated
                      ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  {selectedLead.isAllocated ? t('inbox.reallocate') : t('inbox.allocate')}
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedMessages.map((msg) => {
                const msgAccountName = selectedLead ? getAccountName(selectedLead.socialAccountId) : '';
                return (
                <div key={msg.id} className={`flex ${msg.from === 'agent' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] flex gap-2 ${msg.from === 'agent' ? 'flex-row-reverse' : ''}`}>
                    <img src={msg.senderAvatar} alt={msg.senderName} className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-200 shrink-0 mt-1" />
                    <div>
                      <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                        msg.from === 'agent'
                          ? 'bg-blue-600 text-white rounded-tr-md'
                          : 'bg-slate-100 text-slate-800 rounded-tl-md'
                      }`}>
                        <span className={`inline-flex items-center gap-1 text-[9px] font-bold opacity-70 mb-1 ${msg.from === 'agent' ? 'text-blue-200' : 'text-slate-500'}`}>
                          {CHANNEL_ICONS[msg.channel]}
                          {msgAccountName}
                        </span>
                        <p>{msg.content}</p>
                      </div>
                      <p className={`text-[10px] text-slate-400 mt-1 ${msg.from === 'agent' ? 'text-right' : 'text-left'}`}>
                        {msg.timestamp}
                      </p>
                    </div>
                  </div>
                </div>
              );})}
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-slate-100 space-y-2">
              {/* Reply account picker */}
              <div className="relative">
                <button
                  onClick={() => setShowAccountPicker(!showAccountPicker)}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 hover:text-slate-800 transition-all"
                >
                  <span className={`w-2 h-2 rounded-full ${replyAccount?.channel === 'facebook' ? 'bg-blue-500' : replyAccount?.channel === 'line' ? 'bg-green-500' : 'bg-pink-500'}`} />
                  {t('inbox.replyAs').replace('{name}', replyAccount?.name || t('inbox.unknown'))}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showAccountPicker && (
                  <div className="absolute bottom-full left-0 mb-1 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 min-w-44 z-10 space-y-0.5">
                    {socialAccounts.filter((a) => !selectedLead || a.channel === selectedLead.channel).map((acc) => (
                      <button
                        key={acc.id}
                        onClick={() => { setReplyAccountId(acc.id); setShowAccountPicker(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium text-left transition-all ${
                          replyAccount?.id === acc.id ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${acc.channel === 'facebook' ? 'bg-blue-500' : acc.channel === 'line' ? 'bg-green-500' : 'bg-pink-500'}`} />
                        <span className="truncate">{acc.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Quick reply button */}
                <div className="relative">
                  <button
                    onClick={() => setShowQuickReplies(!showQuickReplies)}
                    title="Quick replies"
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-xl transition-all border border-slate-200"
                  >
                    <Zap className="w-4 h-4" />
                  </button>
                  {showQuickReplies && (
                    <div className="absolute bottom-full left-0 mb-1 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 min-w-64 z-10 space-y-0.5">
                      {quickReplies.length > 0 ? (
                        <>
                          {quickReplies.map((qr) => (
                            <button
                              key={qr.id}
                              onClick={() => selectQuickReply(qr.message)}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium text-left text-slate-700 hover:bg-slate-50 transition-all"
                            >
                              <Zap className="w-3 h-3 text-amber-500 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-bold">{qr.label}</p>
                                <p className="truncate text-[10px] text-slate-400">{qr.message}</p>
                              </div>
                            </button>
                          ))}
                          <div className="border-t border-slate-100 pt-1 mt-1">
                            <button
                              onClick={() => { setShowQuickReplyManager(true); setShowQuickReplies(false); }}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium text-blue-600 hover:bg-blue-50 transition-all"
                            >
                              <Settings2 className="w-3 h-3" />
                              Manage Quick Replies
                            </button>
                          </div>
                        </>
                      ) : (
                        <button
                          onClick={() => { setShowQuickReplyManager(true); setShowQuickReplies(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium text-blue-600 hover:bg-blue-50 transition-all"
                        >
                          <Plus className="w-3 h-3" />
                          Add Quick Reply
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={t('inbox.typeMessage')}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
                <button className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl transition-all">
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="w-full md:w-80 shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-slate-100">
              <button
                onClick={() => setRightPanelTab('products')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold transition-all ${
                  rightPanelTab === 'products'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                {t('inbox.products')}
              </button>
              <button
                onClick={() => setRightPanelTab('allocation')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold transition-all ${
                  rightPanelTab === 'allocation'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                {t('inbox.allocate')}
              </button>
            </div>

            {/* Products Tab */}
            {rightPanelTab === 'products' && (
              <>
                <div className="p-4 border-b border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-blue-600" />
                      {t('inbox.products')}
                    </h3>
                    <button
                      onClick={() => setShowAddProduct(true)}
                      className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all"
                    >
                      <Plus className="w-3 h-3" />
                      {t('inbox.addProduct')}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">{leadProducts.length} {t('inbox.items')} &middot; ${totalValue.toLocaleString()}</p>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                  {/* Add Product Form */}
                  {showAddProduct && (
                    <div className="p-3 bg-blue-50/50 border-b border-blue-100 space-y-2">
                      <input
                        value={productForm.name}
                        onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                        placeholder={t('inbox.productName')}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={productForm.quantity}
                          onChange={(e) => setProductForm({ ...productForm, quantity: parseInt(e.target.value) || 1 })}
                          placeholder={t('inbox.qty')}
                          className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="number"
                          value={productForm.price}
                          onChange={(e) => setProductForm({ ...productForm, price: parseFloat(e.target.value) || 0 })}
                          placeholder={t('inbox.price')}
                          className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <select
                        value={productForm.categoryId ?? ''}
                        onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">{t('inbox.noCategory')}</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <input
                        value={productForm.description}
                        onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                        placeholder={t('inbox.description')}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <textarea
                        value={productForm.notes}
                        onChange={(e) => setProductForm({ ...productForm, notes: e.target.value })}
                        placeholder={t('inbox.notes')}
                        rows={2}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                      <div className="flex gap-2 pt-1">
                        <button onClick={handleAddProduct} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold py-1.5 rounded-lg transition-all">
                          {t('inbox.save')}
                        </button>
                        <button onClick={resetForm} className="px-3 text-[10px] font-bold text-slate-500 hover:text-slate-700 py-1.5 transition-all">
                          {t('inbox.cancel')}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Product List */}
                  {leadProducts.length === 0 && !showAddProduct && (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
                      <Package className="w-8 h-8 stroke-[1.5]" />
                      <p className="text-xs font-medium">{t('inbox.noProducts')}</p>
                      <p className="text-[10px]">{t('inbox.noProductsHint')}</p>
                    </div>
                  )}

                  {leadProducts.map((product) => {
                    const isEditing = editingProductId === product.id;
                    return (
                      <div key={product.id} className="p-3 hover:bg-slate-50 transition-all">
                        {isEditing ? (
                        <div className="space-y-2">
                          <input
                            value={editValues.name || ''}
                            onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={editValues.quantity || 1}
                              onChange={(e) => setEditValues({ ...editValues, quantity: parseInt(e.target.value) || 1 })}
                              className="w-14 bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                              type="number"
                              value={editValues.price || 0}
                              onChange={(e) => setEditValues({ ...editValues, price: parseFloat(e.target.value) || 0 })}
                              className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <select
                            value={editValues.categoryId ?? ''}
                            onChange={(e) => setEditValues({ ...editValues, categoryId: e.target.value ? parseInt(e.target.value) : null })}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                          <option value="">{t('inbox.noCategory')}</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        <textarea
                          value={editValues.description || ''}
                          onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                          rows={1}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <textarea
                          value={editValues.notes || ''}
                          onChange={(e) => setEditValues({ ...editValues, notes: e.target.value })}
                          rows={1}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                            <div className="flex gap-2">
                              <button onClick={() => handleUpdate(product.id)} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all">
                                <Save className="w-3 h-3" /> {t('inbox.save')}
                              </button>
                              <button onClick={() => setEditingProductId(null)} className="text-[10px] font-bold text-slate-500 hover:text-slate-700 px-2 py-1">{t('inbox.cancel')}</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <h4 className="text-xs font-bold text-slate-900 truncate">{product.name}</h4>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                  {product.quantity}x &middot; ${product.price.toLocaleString()}
                                  {product.categoryId && categories.find(c => c.id === product.categoryId) && (
                                    <span className="ml-1.5 text-blue-600 bg-blue-50 px-1 py-0.5 rounded text-[9px] font-medium">
                                      {categories.find(c => c.id === product.categoryId)!.name}
                                    </span>
                                  )}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => startEdit(product)} className="text-slate-400 hover:text-blue-600 transition-all p-0.5">
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button onClick={() => deleteProduct(product.id)} className="text-slate-400 hover:text-red-500 transition-all p-0.5">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {product.description && (
                              <p className="text-[10px] text-slate-600 mt-1 line-clamp-1">{product.description}</p>
                            )}
                            {product.notes && (
                              <p className="text-[10px] text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 mt-1 line-clamp-1">{product.notes}</p>
                            )}

                            <div className="flex items-center gap-1.5 mt-2">
                              {([0, 1, 2, 3] as ProductStatus[]).map((s) => {
                                const b = STATUS_BADGES[s];
                                return (
                                  <button
                                    key={s}
                                    onClick={() => handleStatusChange(product.id, s)}
                                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-all ${
                                      product.status === s
                                        ? b.class + ' ring-1 ring-offset-1 ring-slate-300'
                                        : 'text-slate-400 border-transparent hover:text-slate-600'
                                    }`}
                                  >
                                    {b.label}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Total footer */}
                {leadProducts.length > 0 && (
                  <div className="p-3 border-t border-slate-100 bg-slate-50">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                      <span>{t('inbox.totalValue')}</span>
                      <span>${totalValue.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Allocation Tab */}
            {rightPanelTab === 'allocation' && selectedLead && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Customer name */}
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                  <p className="text-xs text-blue-600 font-medium">{t('allocation.customer')}</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{selectedLead.name}</p>
                </div>

                {/* Active allocation notice */}
                {activeAlloc && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-amber-800">{t('allocation.existingActive')}</p>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        {t('allocation.existingActiveDesc')
                          .replace('{sales}', activeAlloc.salesPersonName)
                          .replace('{project}', activeAlloc.projectName)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Sales Person */}
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> {t('allocation.salesPerson')}
                  </label>
                  <select
                    value={allocationSalesPersonId}
                    onChange={handleAllocationUserChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  >
                    <option value="">{t('allocation.selectSales')}</option>
                    {allocationSalesUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                {/* Project Name */}
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" /> {t('allocation.projectName')}
                  </label>
                  <input
                    value={allocationProjectName}
                    onChange={(e) => setAllocationProjectName(e.target.value)}
                    placeholder={t('allocation.projectPlaceholder')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> {t('allocation.notes')}
                  </label>
                  <textarea
                    value={allocationNotes}
                    onChange={(e) => setAllocationNotes(e.target.value)}
                    placeholder={t('allocation.notesPlaceholder')}
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none"
                  />
                </div>

                {/* Allocation History */}
                {allocationHistory.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5" /> {t('allocation.history')}
                    </h4>
                    <div className="space-y-2">
                      {allocationHistory.map((h) => (
                        <div key={h.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <img src={h.salesPersonAvatar} alt={h.salesPersonName} className="w-5 h-5 rounded-full object-cover ring-1 ring-slate-200 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-[11px] font-bold text-slate-900 truncate">{h.salesPersonName}</p>
                                <p className="text-[9px] text-slate-500 truncate">{h.projectName}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {h.isReallocation && (
                                <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{t('allocation.reallocBadge')}</span>
                              )}
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                h.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                                h.status === 'completed' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {h.status}
                              </span>
                            </div>
                          </div>
                          {h.notes && <p className="text-[9px] text-slate-500 mt-1 truncate">{h.notes}</p>}
                          <p className="text-[8px] text-slate-400 mt-1">{new Date(h.createdAt).toLocaleDateString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={handleAllocate}
                  disabled={!allocationSalesPersonId || !allocationProjectName.trim() || allocationSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {allocationSubmitting ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {activeAlloc ? t('allocation.submitUpdate') : t('allocation.submitCreate')}
                </button>

                {/* Close button */}
                <button
                  onClick={() => setRightPanelTab('products')}
                  className="w-full text-[11px] font-bold text-slate-500 hover:text-slate-700 py-2 transition-all"
                >
                  {t('inbox.cancel')}
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 gap-3">
          <MessageCircle className="w-12 h-12 stroke-[1.5]" />
          <p className="text-sm font-medium">{t('inbox.selectConversation')}</p>
        </div>
      )}

      {/* Tag Manager */}
      {showTagManager && selectedLead && (
        <TagManager
          leadId={selectedLead.id}
          onClose={() => setShowTagManager(false)}
        />
      )}

      {/* Quick Reply Manager */}
      {showQuickReplyManager && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowQuickReplyManager(false)}>
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Manage Quick Replies
              </h3>
              <button onClick={() => { setShowQuickReplyManager(false); setQrEditId(null); setQrForm({ label: '', message: '' }); }} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Add/Edit form */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                <input
                  value={qrForm.label}
                  onChange={(e) => setQrForm({ ...qrForm, label: e.target.value })}
                  placeholder="Label (e.g. Greeting)"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <textarea
                  value={qrForm.message}
                  onChange={(e) => setQrForm({ ...qrForm, message: e.target.value })}
                  placeholder="Quick reply message..."
                  rows={2}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
                <div className="flex gap-2">
                  {qrEditId ? (
                    <>
                      <button onClick={updateQuickReply} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold py-1.5 rounded-lg transition-all">
                        Update
                      </button>
                      <button onClick={() => { setQrEditId(null); setQrForm({ label: '', message: '' }); }} className="text-[10px] font-bold text-slate-500 hover:text-slate-700 px-3 py-1.5 transition-all">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button onClick={addQuickReply} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold py-1.5 rounded-lg transition-all">
                      Add Quick Reply
                    </button>
                  )}
                </div>
              </div>

              {/* List */}
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {quickReplies.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No quick replies yet. Create one above.</p>
                ) : (
                  quickReplies.map((qr) => (
                    <div key={qr.id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 transition-all border border-slate-100">
                      <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">{qr.label}</p>
                        <p className="text-[10px] text-slate-500 truncate">{qr.message}</p>
                      </div>
                      <button
                        onClick={() => { setQrEditId(qr.id); setQrForm({ label: qr.label, message: qr.message }); }}
                        className="text-slate-400 hover:text-amber-600 p-0.5 shrink-0 transition-all"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => deleteQuickReply(qr.id)}
                        className="text-slate-400 hover:text-red-500 p-0.5 shrink-0 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
