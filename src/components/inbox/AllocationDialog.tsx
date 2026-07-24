import React, { useState, useEffect, useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import { X, User, Building2, FileText, RotateCcw, Clock, History, CheckCircle2 } from 'lucide-react';
import type { CrmUser } from '../../types/crm';

interface Props {
  leadId: string;
  leadName: string;
  onClose: () => void;
}

export const AllocationDialog: React.FC<Props> = ({ leadId, leadName, onClose }) => {
  const { getAllocationHistory, allocateLead } = useCRM();

  const [salesPersonId, setSalesPersonId] = useState('');
  const [salesPersonName, setSalesPersonName] = useState('');
  const [salesPersonAvatar, setSalesPersonAvatar] = useState('');
  const [projectName, setProjectName] = useState('');
  const [notes, setNotes] = useState('');
  const [isReallocation, setIsReallocation] = useState(false);
  const [salesUsers, setSalesUsers] = useState<CrmUser[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const history = useMemo(() => getAllocationHistory(leadId), [getAllocationHistory, leadId]);
  const activeAlloc = history.find(a => a.status === 'active');

  useEffect(() => {
    // Populate from existing active allocation
    if (activeAlloc) {
      setSalesPersonId(activeAlloc.salesPersonId);
      setSalesPersonName(activeAlloc.salesPersonName);
      setSalesPersonAvatar(activeAlloc.salesPersonAvatar);
      setProjectName(activeAlloc.projectName);
    }
    // Load sales users from localStorage or API
    try {
      const stored = localStorage.getItem('rf-crm-users');
      if (stored) {
        const users: CrmUser[] = JSON.parse(stored);
        const sales = users.filter(u => u.roleName?.toLowerCase().includes('sales') || u.roleId === 3);
        setSalesUsers(sales);
      }
    } catch {}
    // Default sales users
    if (salesUsers.length === 0) {
      setSalesUsers([
        { id: 'demo-sales-001', name: 'Marcus Brody (Sales Rep)', email: 'marcus.brody@relateflows.com', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', provider: 'google', roleId: 3, roleName: 'Sales Rep', status: 'active', createdAt: '' },
        { id: 'demo-mgr-001', name: 'Alex Rivera (Manager)', email: 'alex.rivera@relateflows.com', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', provider: 'google', roleId: 2, roleName: 'Manager', status: 'active', createdAt: '' },
      ]);
    }
  }, []);

  const handleSubmit = async () => {
    if (!salesPersonId || !projectName.trim()) return;
    setSubmitting(true);
    const selectedUser = salesUsers.find(u => u.id === salesPersonId);
    await allocateLead(
      leadId,
      salesPersonId,
      selectedUser?.name || salesPersonName || 'Sales Person',
      selectedUser?.avatar || salesPersonAvatar || '',
      projectName.trim(),
      notes.trim(),
      isReallocation
    );
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Allocate Customer
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Customer name */}
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
            <p className="text-xs text-blue-600 font-medium">Customer</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">{leadName}</p>
          </div>

          {/* Active allocation notice */}
          {activeAlloc && !isReallocation && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-800">Existing Active Allocation</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  This customer is already allocated to <strong>{activeAlloc.salesPersonName}</strong> for project "{activeAlloc.projectName}".
                  Update the details below or check "New Allocation" to create a separate allocation.
                </p>
              </div>
            </div>
          )}

          {/* Sales Person */}
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Sales Person
            </label>
            <select
              value={salesPersonId}
              onChange={(e) => {
                const user = salesUsers.find(u => u.id === e.target.value);
                setSalesPersonId(e.target.value);
                if (user) {
                  setSalesPersonName(user.name);
                  setSalesPersonAvatar(user.avatar);
                }
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            >
              <option value="">Select Sales Person...</option>
              {salesUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            {activeAlloc && !isReallocation && (
              <p className="text-[10px] text-slate-400 mt-1">Pre-filled from existing allocation. Change if needed.</p>
            )}
          </div>

          {/* Project Name */}
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Project Name
            </label>
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. RelateFlows Enterprise"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes for the Sales person..."
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none"
            />
          </div>

          {/* Re-allocation checkbox - only when there's history */}
          {history.length > 0 && (
            <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-blue-50/50 transition-all">
              <input
                type="checkbox"
                checked={isReallocation}
                onChange={(e) => setIsReallocation(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                  ต้องการ Allocated ใหม่
                </span>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  If checked, a new allocation will be created instead of updating the existing one.
                  The customer will be sent to the <strong>same Sales person</strong> as before.
                </p>
                {activeAlloc && (
                  <p className="text-[10px] text-amber-600 mt-0.5 font-medium">
                    Will create new allocation. Previous: {activeAlloc.projectName} → {activeAlloc.salesPersonName}
                  </p>
                )}
              </div>
            </label>
          )}

          {/* Allocation History */}
          {history.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" /> Allocation History
              </h4>
              <div className="space-y-2">
                {history.map((h) => (
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
                          <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Re-alloc</span>
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
            onClick={handleSubmit}
            disabled={!salesPersonId || !projectName.trim() || submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {submitting ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {isReallocation ? 'Allocate New (Re-allocation)' : (activeAlloc ? 'Update Allocation' : 'Allocate to Sales')}
          </button>
        </div>
      </div>
    </div>
  );
};
