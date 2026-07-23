import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import type { LifecycleStage } from '../../types/crm';
import { 
  Plus, 
  Filter, 
  Building2, 
  Sparkles,
  ChevronRight
} from 'lucide-react';

export const ContactsView: React.FC = () => {
  const { isLoading, contacts, searchQuery, setSelectedContact, setIsAddContactModalOpen } = useCRM();
  const [stageFilter, setStageFilter] = useState<string>('all');

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.role.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStage = stageFilter === 'all' || c.lifecycleStage === stageFilter;

    return matchesSearch && matchesStage;
  });

  const getStageBadgeClass = (stage: LifecycleStage) => {
    switch (stage) {
      case 'customer': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'opportunity': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'sql': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'mql': return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'lead': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="skeleton h-20 w-full rounded-2xl" />
        <div className="skeleton h-96 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Filter Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900">Contacts & Accounts Directory</h3>
          <p className="text-xs text-slate-500">
            Total Contacts: <span className="font-bold text-slate-800">{filteredContacts.length}</span> • High Lead Score (&gt;80): <span className="font-bold text-yellow-600">{contacts.filter(c => c.leadScore > 80).length} contacts</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Lifecycle Filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Stage:</span>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="all">All Stages</option>
              <option value="customer">Customers</option>
              <option value="opportunity">Opportunities</option>
              <option value="sql">SQL (Sales Qualified)</option>
              <option value="mql">MQL (Marketing Qualified)</option>
              <option value="lead">Leads</option>
            </select>
          </div>

          <button
            onClick={() => setIsAddContactModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md flex items-center gap-1.5 transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Contact</span>
          </button>
        </div>
      </div>

      {/* Contacts Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-5">Contact Name & Role</th>
                <th className="py-3.5 px-4">Company</th>
                <th className="py-3.5 px-4">Lifecycle Stage</th>
                <th className="py-3.5 px-4">Lead Score</th>
                <th className="py-3.5 px-4">Total Value</th>
                <th className="py-3.5 px-4">Last Contacted</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    No contacts found matching your query.
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact) => (
                  <tr
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                  >
                    {/* Contact Name & Avatar */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <img
                          src={contact.avatar}
                          alt={contact.name}
                          className="w-10 h-10 rounded-xl object-cover ring-2 ring-slate-100 group-hover:ring-blue-400 transition-all"
                        />
                        <div>
                          <h4 className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                            {contact.name}
                            {contact.leadScore >= 90 && (
                              <span title="VIP High Score">
                                <Sparkles className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                              </span>
                            )}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium">{contact.role}</p>
                        </div>
                      </div>
                    </td>

                    {/* Company */}
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{contact.company}</span>
                      </div>
                    </td>

                    {/* Lifecycle Stage */}
                    <td className="py-3.5 px-4">
                      <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border uppercase tracking-wider ${getStageBadgeClass(contact.lifecycleStage)}`}>
                        {contact.lifecycleStage}
                      </span>
                    </td>

                    {/* Lead Score Progress Pill */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              contact.leadScore >= 80 ? 'bg-blue-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${contact.leadScore}%` }}
                          />
                        </div>
                        <span className={`font-extrabold text-xs ${contact.leadScore >= 80 ? 'text-yellow-600' : 'text-slate-700'}`}>
                          {contact.leadScore}
                        </span>
                      </div>
                    </td>

                    {/* Total Deals Value */}
                    <td className="py-3.5 px-4 font-extrabold text-slate-900">
                      ${contact.totalDealsValue.toLocaleString()}
                    </td>

                    {/* Last Contacted */}
                    <td className="py-3.5 px-4 text-slate-500 font-medium text-[11px]">
                      {contact.lastContacted}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedContact(contact);
                        }}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200"
                      >
                        <span>View Profile</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
