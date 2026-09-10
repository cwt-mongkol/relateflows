import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { useSettings } from '../../context/SettingsContext';
import type { Contact, LifecycleStage } from '../../types/crm';
import { SortableTable, type SortableColumn } from '../ui/SortableTable';
import {
  Plus,
  Filter,
  Building2,
  Award,
  ChevronRight
} from 'lucide-react';

export const ContactsView: React.FC = () => {
  const { isLoading, contacts, searchQuery, setSelectedContact, setIsAddContactModalOpen } = useCRM();
  const { t } = useSettings();
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
          <h3 className="text-lg font-extrabold text-slate-900">{t('contacts.directory')}</h3>
          <p className="text-xs text-slate-500">
            {t('contacts.total').replace('{count}', String(filteredContacts.length)).replace('{high}', String(contacts.filter(c => c.leadScore > 80).length))}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Lifecycle Filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">{t('contacts.stage')}:</span>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="all">{t('contacts.stage.all')}</option>
              <option value="customer">{t('contacts.stage.customers')}</option>
              <option value="opportunity">{t('contacts.stage.opportunities')}</option>
              <option value="sql">{t('contacts.stage.sql')}</option>
              <option value="mql">{t('contacts.stage.mql')}</option>
              <option value="lead">{t('contacts.stage.leads')}</option>
            </select>
          </div>

          <button
            onClick={() => setIsAddContactModalOpen(true)}
            className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{t('contacts.addContact')}</span>
          </button>
        </div>
      </div>

      {/* Contacts Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <SortableTable<Contact>
          rowKey={(c) => c.id}
          emptyMessage={t('contacts.empty')}
          onRowClick={setSelectedContact}
          columns={contactColumns(t, getStageBadgeClass, setSelectedContact)}
          rows={filteredContacts}
        />
      </div>
    </div>
  );
};

function contactColumns(
  t: (key: string) => string,
  getStageBadgeClass: (stage: LifecycleStage) => string,
  setSelectedContact: (c: Contact) => void,
): SortableColumn<Contact>[] {
  return [
    {
      key: 'name', label: t('contacts.table.name'), sortable: true,
      sortValue: (c) => c.name,
      render: (contact) => (
        <div className="flex items-center gap-3">
          <img src={contact.avatar} alt={contact.name} className="w-10 h-10 rounded-xl object-cover ring-2 ring-slate-100" />
          <div>
            <h4 className="font-extrabold text-slate-900 flex items-center gap-1.5">
              {contact.name}
              {contact.leadScore >= 90 && (
                <span title="VIP High Score"><Award className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" /></span>
              )}
            </h4>
            <p className="text-[11px] text-slate-500 font-medium">{contact.role}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'company', label: t('contacts.table.company'), sortable: true,
      sortValue: (c) => c.company,
      render: (contact) => (
        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
          <Building2 className="w-3.5 h-3.5 text-slate-400" />
          <span>{contact.company}</span>
        </div>
      ),
    },
    {
      key: 'lifecycleStage', label: t('contacts.table.stage'), sortable: true,
      sortValue: (c) => c.lifecycleStage,
      render: (contact) => (
        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border uppercase tracking-wider ${getStageBadgeClass(contact.lifecycleStage)}`}>
          {contact.lifecycleStage}
        </span>
      ),
    },
    {
      key: 'leadScore', label: t('contacts.table.score'), sortable: true,
      sortValue: (c) => c.leadScore,
      render: (contact) => (
        <div className="flex items-center gap-2">
          <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
            <div className="h-full rounded-full bg-blue-500" style={{ width: `${contact.leadScore}%` }} />
          </div>
          <span className={`font-extrabold text-xs ${contact.leadScore >= 80 ? 'text-yellow-600' : 'text-slate-700'}`}>{contact.leadScore}</span>
        </div>
      ),
    },
    {
      key: 'totalDealsValue', label: t('contacts.table.value'), sortable: true,
      sortValue: (c) => c.totalDealsValue,
      render: (contact) => <span className="font-extrabold text-slate-900">${contact.totalDealsValue.toLocaleString()}</span>,
    },
    {
      key: 'lastContacted', label: t('contacts.table.contacted'), sortable: true,
      sortValue: (c) => c.lastContacted,
      render: (contact) => <span className="text-slate-500 font-medium text-[11px]">{contact.lastContacted}</span>,
    },
    {
      key: 'actions', label: t('contacts.table.actions'), align: 'right',
      render: (contact) => (
        <button
          onClick={(e) => { e.stopPropagation(); setSelectedContact(contact); }}
          className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200"
        >
          <span>{t('contacts.viewProfile')}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];
}
