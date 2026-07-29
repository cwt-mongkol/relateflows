import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../lib/permissions';
import {
  Users, Plus, Trash2, Save, Loader2, CheckCircle2,
  ArrowUp, ArrowDown, ToggleLeft, ToggleRight, History,
} from 'lucide-react';

interface RequiredField {
  key: string;
  label: string;
  type: string;
  order: number;
}

interface AllocationConfig {
  requiredFields: RequiredField[];
  enabled: boolean;
}

interface SalesRep {
  id: string;
  name: string;
  email: string;
  avatar: string;
  is_accepting: boolean;
}

export const LeadAllocationSettings: React.FC = () => {
  const { user } = useAuth();
  const { roleId } = usePermissions();
  const isSalesRep = roleId === 5;

  const [config, setConfig] = useState<AllocationConfig>({ requiredFields: [], enabled: true });
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [allocationHistory, setAllocationHistory] = useState<any[]>([]);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [configData, repsData] = await Promise.all([
        api.get<AllocationConfig>('/api/lead-allocation/config'),
        api.get<SalesRep[]>('/api/sales-reps/status'),
      ]);
      setConfig(configData);
      setSalesReps(repsData);
    } catch (err) {
      console.error('Failed to load:', err);
    }
    setLoading(false);
  };

  const loadHistory = async () => {
    try {
      const data = await api.get<any[]>('/api/lead-allocation/history?limit=20');
      setAllocationHistory(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/lead-allocation/config', config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Save failed:', err);
    }
    setSaving(false);
  };

  const addField = () => {
    if (!newFieldKey.trim() || !newFieldLabel.trim()) return;
    const field: RequiredField = {
      key: newFieldKey.trim().toLowerCase().replace(/\s+/g, '_'),
      label: newFieldLabel.trim(),
      type: 'text',
      order: config.requiredFields.length + 1,
    };
    setConfig((prev) => ({
      ...prev,
      requiredFields: [...prev.requiredFields, field],
    }));
    setNewFieldKey('');
    setNewFieldLabel('');
  };

  const removeField = (idx: number) => {
    setConfig((prev) => ({
      ...prev,
      requiredFields: prev.requiredFields.filter((_, i) => i !== idx).map((f, i) => ({ ...f, order: i + 1 })),
    }));
  };

  const moveField = (idx: number, dir: -1 | 1) => {
    const fields = [...config.requiredFields];
    const target = idx + dir;
    if (target < 0 || target >= fields.length) return;
    [fields[idx], fields[target]] = [fields[target], fields[idx]];
    setConfig((prev) => ({
      ...prev,
      requiredFields: fields.map((f, i) => ({ ...f, order: i + 1 })),
    }));
  };

  const toggleRepStatus = async (repId: string, current: boolean) => {
    try {
      await api.put('/api/sales-reps/status', { isAccepting: !current });
      setSalesReps((prev) =>
        prev.map((r) => (r.id === repId ? { ...r, is_accepting: !current } : r))
      );
    } catch (err) {
      console.error('Toggle failed:', err);
    }
  };

  const toggleHistory = async () => {
    const next = !showHistory;
    setShowHistory(next);
    if (next) await loadHistory();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-5 h-5 text-violet-600" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lead Allocation</span>
        </div>
        <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Lead Allocation Settings</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-xl">
          Configure what info the bot collects before allocating leads to Sales reps via round-robin
        </p>
      </div>

      {/* Sales Rep Toggle (for Sales Reps themselves) */}
      {isSalesRep && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${salesReps.find(r => r.id === user?.id)?.is_accepting ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">My Allocation Status</h4>
                <p className="text-[11px] text-slate-500">
                  {salesReps.find(r => r.id === user?.id)?.is_accepting ? 'Accepting new leads' : 'Not accepting leads'}
                </p>
              </div>
            </div>
            <button
              onClick={() => toggleRepStatus(user?.id || '', salesReps.find(r => r.id === user?.id)?.is_accepting || false)}
              className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl transition-all ${
                salesReps.find(r => r.id === user?.id)?.is_accepting
                  ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              {salesReps.find(r => r.id === user?.id)?.is_accepting ? (
                <><ToggleRight className="w-4 h-4" /> Turn Off</>
              ) : (
                <><ToggleLeft className="w-4 h-4" /> Turn On</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Sales Reps Status (for admins) */}
      {!isSalesRep && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h4 className="text-sm font-extrabold text-slate-900 mb-4">Sales Reps Status</h4>
          <div className="space-y-2">
            {salesReps.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">No active sales reps found</p>
            )}
            {salesReps.map((rep) => (
              <div key={rep.id} className="flex items-center justify-between px-4 py-2.5 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                    {rep.name.charAt(0)}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-900">{rep.name}</span>
                    <span className="text-[10px] text-slate-500 ml-2">{rep.email}</span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                  rep.is_accepting ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                }`}>
                  {rep.is_accepting ? 'Accepting' : 'Paused'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Required Fields Config (for admins) */}
      {!isSalesRep && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
                <Plus className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-extrabold text-slate-900">Required Fields</h4>
            </div>
            <label className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig((prev) => ({ ...prev, enabled: e.target.checked }))}
                className="rounded"
              />
              Enable auto-allocation
            </label>
          </div>

          <p className="text-[11px] text-slate-500 mb-4">
            These questions will be asked by the chatbot when a customer wants to speak to sales.
            Customers must answer all fields before the lead is allocated.
          </p>

          {/* Existing fields */}
          <div className="space-y-2 mb-4">
            {config.requiredFields.map((field, idx) => (
              <div key={field.key} className="flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-2.5">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveField(idx, -1)} className="text-slate-300 hover:text-slate-600"><ArrowUp className="w-3 h-3" /></button>
                  <button onClick={() => moveField(idx, 1)} className="text-slate-300 hover:text-slate-600"><ArrowDown className="w-3 h-3" /></button>
                </div>
                <div className="flex-1">
                  <span className="text-xs font-bold text-slate-800">{field.label}</span>
                  <span className="text-[10px] text-slate-400 ml-2">({field.key})</span>
                </div>
                <button onClick={() => removeField(idx)} className="p-1 text-slate-300 hover:text-rose-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add new field */}
          <div className="flex items-center gap-2">
            <input
              value={newFieldLabel}
              onChange={(e) => setNewFieldLabel(e.target.value)}
              placeholder="Question label (e.g. What's your phone number?)"
              className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
            />
            <input
              value={newFieldKey}
              onChange={(e) => setNewFieldKey(e.target.value)}
              placeholder="Key (e.g. phone)"
              className="w-32 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
            />
            <button
              onClick={addField}
              disabled={!newFieldKey.trim() || !newFieldLabel.trim()}
              className="bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white p-2 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Save (for admins) */}
      {!isSalesRep && (
        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
              <CheckCircle2 className="w-4 h-4" /> Saved
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Config
          </button>
        </div>
      )}

      {/* Allocation History */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <button
          onClick={toggleHistory}
          className="flex items-center gap-2 text-sm font-extrabold text-slate-900 mb-4"
        >
          <History className="w-4 h-4 text-slate-500" />
          Allocation History
          <span className="text-[10px] text-slate-400 font-normal ml-1">(click to expand)</span>
        </button>
        {showHistory && (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {allocationHistory.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">No allocation history yet</p>
            )}
            {allocationHistory.map((h: any) => (
              <div key={h.id} className="flex items-center justify-between px-4 py-2 bg-slate-50 rounded-lg text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">{h.sales_person_name || 'Unknown'}</span>
                  <span className="text-slate-400">→</span>
                  <span className="text-slate-600">{h.lead_id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    h.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                  }`}>{h.status}</span>
                  <span className="text-slate-400">{new Date(h.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
