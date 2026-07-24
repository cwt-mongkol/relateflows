import React, { useState, useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import { useSettings } from '../../context/SettingsContext';
import { MessageCircle, User, CheckCircle2, ArrowRight, Globe, Package, Plus, Edit3, Save, Trash2, ChevronDown, Tag } from 'lucide-react';
import { AllocationDialog } from './AllocationDialog';
import { TagManager } from './TagManager';
import type { ProductFormData, ProductStatus } from '../../types/crm';

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  facebook: <Globe className="w-4 h-4 text-blue-600" />,
  instagram: <MessageCircle className="w-4 h-4 text-pink-500" />,
  line: <MessageCircle className="w-4 h-4 text-green-500" />,
};

const CHANNEL_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  line: 'LINE',
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
  const { isLoading, leads, chatMessages, selectedLead, setSelectedLead, categories, socialAccounts, products, addProduct, updateProduct, deleteProduct, leadTags } = useCRM();
  const { t, language } = useSettings();
  const STATUS_BADGES = useMemo(() => getStatusBadges(t), [t, language]);

  const [showAllocation, setShowAllocation] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);

  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [replyAccountId, setReplyAccountId] = useState<string>('');
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productForm, setProductForm] = useState<ProductFormData>(EMPTY_PRODUCT_FORM);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Partial<ProductFormData>>({});

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

  if (isLoading) {
    return (
      <div className="flex gap-6 h-[calc(100vh-12rem)]">
        <div className="w-96 skeleton rounded-2xl h-full" />
        <div className="flex-1 skeleton rounded-2xl h-full" />
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-12rem)] animate-fadeIn">
      {/* Lead List */}
      <div className="w-96 shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900">Inbox</h3>
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{unreadTotal} unread</span>
          </div>
          <p className="text-xs text-slate-500">{filteredLeads.length} of {leads.length} conversations</p>

          {/* Account filter chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {socialAccounts.map((acc) => {
              const on = activeAccountIds.includes(acc.id);
              const channelIcon = acc.channel === 'facebook' ? <Globe className="w-3 h-3" /> : acc.channel === 'line' ? <MessageCircle className="w-3 h-3" /> : <MessageCircle className="w-3 h-3" />;
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
                    <span className="text-[9px] font-medium text-slate-400">{CHANNEL_LABELS[lead.channel]}</span>
                    {lead.isAllocated && (
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Allocated</span>
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
                <img src={selectedLead.avatar} alt={selectedLead.name} className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-200" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{selectedLead.name}</h4>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span>{CHANNEL_LABELS[selectedLead.channel]}</span>
                    {selectedLead.isAllocated ? (
                      <span className="flex items-center gap-1 text-emerald-600 font-bold">
                        <CheckCircle2 className="w-3 h-3" /> Allocated
                      </span>
                    ) : (
                      <span className="text-amber-600 font-bold">Unassigned</span>
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
                  Tags
                </button>
                <button
                  onClick={() => setShowAllocation(true)}
                  className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl transition-all ${
                    selectedLead.isAllocated
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  {selectedLead.isAllocated ? 'Re-allocate' : 'Allocate'}
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.from === 'agent' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] flex gap-2 ${msg.from === 'agent' ? 'flex-row-reverse' : ''}`}>
                    <img src={msg.senderAvatar} alt={msg.senderName} className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-200 shrink-0 mt-1" />
                    <div>
                      <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                        msg.from === 'agent'
                          ? 'bg-blue-600 text-white rounded-tr-md'
                          : 'bg-slate-100 text-slate-800 rounded-tl-md'
                      }`}>
                        {msg.content}
                      </div>
                      <p className={`text-[10px] text-slate-400 mt-1 ${msg.from === 'agent' ? 'text-right' : 'text-left'}`}>
                        {msg.timestamp}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
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
                  Replying as {replyAccount?.name || 'Unknown'}
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
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
                <button className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl transition-all">
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Products Panel */}
          <div className="w-80 shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-blue-600" />
                  Products
                </h3>
                <button
                  onClick={() => setShowAddProduct(true)}
                  className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>
              <p className="text-xs text-slate-500">{leadProducts.length} items &middot; ${totalValue.toLocaleString()}</p>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {/* Add Product Form */}
              {showAddProduct && (
                <div className="p-3 bg-blue-50/50 border-b border-blue-100 space-y-2">
                  <input
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    placeholder="Product name"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={productForm.quantity}
                      onChange={(e) => setProductForm({ ...productForm, quantity: parseInt(e.target.value) || 1 })}
                      placeholder="Qty"
                      className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: parseFloat(e.target.value) || 0 })}
                      placeholder="Price"
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <select
                    value={productForm.categoryId ?? ''}
                    onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <input
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    placeholder="Description"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <textarea
                    value={productForm.notes}
                    onChange={(e) => setProductForm({ ...productForm, notes: e.target.value })}
                    placeholder="Notes"
                    rows={2}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <div className="flex gap-2 pt-1">
                    <button onClick={handleAddProduct} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold py-1.5 rounded-lg transition-all">
                      Save
                    </button>
                    <button onClick={resetForm} className="px-3 text-[10px] font-bold text-slate-500 hover:text-slate-700 py-1.5 transition-all">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Product List */}
              {leadProducts.length === 0 && !showAddProduct && (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
                  <Package className="w-8 h-8 stroke-[1.5]" />
                  <p className="text-xs font-medium">No products yet</p>
                  <p className="text-[10px]">Click "Add" to record what this customer wants</p>
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
                        <option value="">No category</option>
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
                            <Save className="w-3 h-3" /> Save
                          </button>
                          <button onClick={() => setEditingProductId(null)} className="text-[10px] font-bold text-slate-500 hover:text-slate-700 px-2 py-1">Cancel</button>
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
                  <span>Total Value</span>
                  <span>${totalValue.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 gap-3">
          <MessageCircle className="w-12 h-12 stroke-[1.5]" />
          <p className="text-sm font-medium">Select a conversation</p>
        </div>
      )}

      {/* Allocation Dialog */}
      {showAllocation && selectedLead && (
        <AllocationDialog
          leadId={selectedLead.id}
          leadName={selectedLead.name}
          onClose={() => setShowAllocation(false)}
        />
      )}

      {/* Tag Manager */}
      {showTagManager && selectedLead && (
        <TagManager
          leadId={selectedLead.id}
          onClose={() => setShowTagManager(false)}
        />
      )}
    </div>
  );
};
