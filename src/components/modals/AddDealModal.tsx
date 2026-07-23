import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import type { Priority } from '../../types/crm';
import { X, Sparkles, Plus } from 'lucide-react';

export const AddDealModal: React.FC = () => {
  const { isAddDealModalOpen, setIsAddDealModalOpen, addDeal, stages } = useCRM();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [value, setValue] = useState(50000);
  const [stage, setStage] = useState('proposal');
  const [probability] = useState(60);
  const [priority, setPriority] = useState<Priority>('medium');
  const [contactName, setContactName] = useState('');
  const [contactEmail] = useState('');
  const [leadSource, setLeadSource] = useState('Inbound Website');
  const [notes, setNotes] = useState('');

  if (!isAddDealModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !company || !contactName || isSubmitting) return;

    setIsSubmitting(true);
    await addDeal({
      title,
      company,
      value: Number(value),
      stage,
      probability: Number(probability),
      owner: {
        name: 'Sarah Connor',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      },
      leadSource,
      priority,
      contactName,
      contactEmail: contactEmail || `${contactName.toLowerCase().replace(/\s+/g, '.')}@${company.toLowerCase().replace(/\s+/g, '')}.com`,
      expectedCloseDate: '2026-08-30',
      notes,
      tags: ['Sales', 'New Lead']
    });

    setIsSubmitting(false);
    setIsAddDealModalOpen(false);
    setTitle('');
    setCompany('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden space-y-0">
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-blue-900 via-blue-800 to-yellow-950 text-white flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500 text-white flex items-center justify-center font-bold shadow-md rf-yellow-glow">
              <Sparkles className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">Create New Sales Deal</h3>
              <p className="text-xs text-blue-200">Add opportunity to RelateFlows pipeline</p>
            </div>
          </div>

          <button
            onClick={() => setIsAddDealModalOpen(false)}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Deal Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Enterprise Cloud License"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Company Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Acme Tech Global"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Deal Value ($ USD)</label>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-extrabold text-blue-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Initial Stage</label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {stages.filter((s) => !s.id.startsWith('closed')).map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Priority Level</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Primary Contact Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. John Doe"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Lead Source</label>
              <input
                type="text"
                placeholder="e.g. Inbound Website / Referral"
                value={leadSource}
                onChange={(e) => setLeadSource(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Deal Notes & Requirements</label>
            <textarea
              rows={3}
              placeholder="Enter deal background or SLA requirements..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddDealModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-400 disabled:cursor-not-allowed text-white shadow-md rf-yellow-glow flex items-center gap-2"
            >
              {isSubmitting ? <span className="loading loading-spinner loading-xs" /> : <Plus className="w-4 h-4 stroke-[3]" />}
              <span>{isSubmitting ? 'Saving...' : 'Save & Add Deal'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
