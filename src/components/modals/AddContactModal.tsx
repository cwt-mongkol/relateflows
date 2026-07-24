import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import type { LifecycleStage } from '../../types/crm';
import { X, UserPlus, Plus } from 'lucide-react';

export const AddContactModal: React.FC = () => {
  const { isAddContactModalOpen, setIsAddContactModalOpen, addContact } = useCRM();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [lifecycleStage, setLifecycleStage] = useState<LifecycleStage>('lead');
  const [leadScore, setLeadScore] = useState(65);
  const [notes, setNotes] = useState('');

  if (!isAddContactModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !company || isSubmitting) return;

    setIsSubmitting(true);
    await addContact({
      name,
      email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@${company.toLowerCase().replace(/\s+/g, '')}.com`,
      phone: phone || '+1 (555) 000-1234',
      company,
      role: role || 'Manager',
      lifecycleStage,
      leadScore: Number(leadScore),
      status: 0,
      avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random()*100000)}?w=150&auto=format&fit=crop&q=80`,
      tags: ['New Lead', 'CRM'],
      notes
    });

    setIsSubmitting(false);
    setIsAddContactModalOpen(false);
    setName('');
    setCompany('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden space-y-0">
        <div className="p-6 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">Add New Contact</h3>
              <p className="text-xs text-blue-200">Save lead details to RelateFlows directory</p>
            </div>
          </div>

          <button
            onClick={() => setIsAddContactModalOpen(false)}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Alex Morgan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Company Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Apex Global"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Job Title / Role</label>
              <input
                type="text"
                placeholder="e.g. VP of Procurement"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Email Address</label>
              <input
                type="email"
                placeholder="e.g. alex@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Lifecycle Stage</label>
              <select
                value={lifecycleStage}
                onChange={(e) => setLifecycleStage(e.target.value as LifecycleStage)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="lead">Lead</option>
                <option value="mql">MQL</option>
                <option value="sql">SQL</option>
                <option value="opportunity">Opportunity</option>
                <option value="customer">Customer</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Lead Score (0-100)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={leadScore}
                onChange={(e) => setLeadScore(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-extrabold text-blue-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Initial Contact Notes</label>
            <textarea
              rows={2}
              placeholder="Background notes about this contact..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddContactModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white shadow-md flex items-center gap-2"
            >
              {isSubmitting ? <span className="loading loading-spinner loading-xs" /> : <Plus className="w-4 h-4 stroke-[3]" />}
              <span>{isSubmitting ? 'Saving...' : 'Save Contact'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
