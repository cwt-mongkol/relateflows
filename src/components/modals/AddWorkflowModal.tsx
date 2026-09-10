import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { X, Zap } from 'lucide-react';
import type { WorkflowTriggerType, WorkflowActionType } from '../../types/crm';
import { TRIGGER_TYPES, ACTION_TYPES } from '../../data/workflowMeta';

export const AddWorkflowModal: React.FC = () => {
  const { isAddWorkflowModalOpen, setIsAddWorkflowModalOpen, addWorkflow } = useCRM();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [triggerType, setTriggerType] = useState<WorkflowTriggerType>('lead.created');
  const [actionType, setActionType] = useState<WorkflowActionType>('create_task');
  const [actionValue, setActionValue] = useState('');
  const [category, setCategory] = useState<'Lead Nurturing' | 'Sales Operations' | 'Deal Routing' | 'Customer Success'>('Sales Operations');
  const [description, setDescription] = useState('');

  if (!isAddWorkflowModalOpen) return null;

  const actionDef = ACTION_TYPES.find((a) => a.value === actionType)!;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addWorkflow({
        title,
        description: description || `Automatically runs when: ${TRIGGER_TYPES.find((t) => t.value === triggerType)?.label}.`,
        status: 'active',
        category,
        accentColor: '#1D4ED8',
        triggerType,
        conditions: [],
        actions: actionValue ? [{ type: actionType, params: { [actionDef.paramKey]: actionValue } }] : [],
      });
      setIsAddWorkflowModalOpen(false);
      setTitle('');
      setActionValue('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden space-y-0">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-50 text-yellow-700 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Create Workflow Rule</h3>
              <p className="text-xs text-slate-500">Set up trigger and action workflow</p>
            </div>
          </div>

          <button
            onClick={() => setIsAddWorkflowModalOpen(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Workflow Rule Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Auto-Assign Enterprise Leads"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">WHEN (Trigger) *</label>
            <select
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value as WorkflowTriggerType)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-blue-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {TRIGGER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">THEN (Action)</label>
              <select
                value={actionType}
                onChange={(e) => { setActionType(e.target.value as WorkflowActionType); setActionValue(''); }}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-blue-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {ACTION_TYPES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">{actionDef.paramLabel}</label>
              <input
                type="text"
                placeholder={actionDef.placeholder}
                value={actionValue}
                onChange={(e) => setActionValue(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Workflow Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as 'Lead Nurturing' | 'Sales Operations' | 'Deal Routing' | 'Customer Success')}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="Lead Nurturing">Lead Nurturing</option>
              <option value="Sales Operations">Sales Operations</option>
              <option value="Deal Routing">Deal Routing</option>
              <option value="Customer Success">Customer Success</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Rule Description</label>
            <textarea
              rows={2}
              placeholder="Explain how this workflow helps the sales team..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddWorkflowModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white shadow-sm flex items-center gap-2"
            >
              {isSubmitting ? <span className="loading loading-spinner loading-xs" /> : <Zap className="w-4 h-4 fill-current" />}
              <span>{isSubmitting ? 'Enabling...' : 'Enable Workflow'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
