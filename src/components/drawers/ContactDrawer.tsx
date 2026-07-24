import React, { useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import { X, Mail, Phone, Building2, Award, Clock, Trash2, Lightbulb } from 'lucide-react';

export const ContactDrawer: React.FC = () => {
  const { selectedContact, setSelectedContact, deleteContact, deals, activities, setCurrentView } = useCRM();

  const linkedDeals = useMemo(() => {
    if (!selectedContact) return [];
    return deals.filter(d =>
      d.contactName === selectedContact.name ||
      d.contactEmail === selectedContact.email ||
      d.company === selectedContact.company
    );
  }, [deals, selectedContact]);

  const linkedActivities = useMemo(() => {
    if (!selectedContact) return [];
    return activities.filter(a =>
      a.targetName?.includes(selectedContact.name) ||
      a.targetName?.includes(selectedContact.company)
    );
  }, [activities, selectedContact]);

  if (!selectedContact) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fadeIn">
      <div onClick={() => setSelectedContact(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200">
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-blue-900 to-blue-800 text-white flex items-center justify-between relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-yellow-400/15 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center gap-4 relative z-10">
              <div className="relative">
                <img src={selectedContact.avatar} alt={selectedContact.name} className="w-14 h-14 rounded-2xl object-cover ring-2 ring-yellow-400 shadow-md" />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" title="Active Contact" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white">{selectedContact.name}</h3>
                <p className="text-xs text-blue-200 font-medium">{selectedContact.role} at {selectedContact.company}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-yellow-500 text-white shadow-xs">
                    Score: {selectedContact.leadScore}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white uppercase tracking-wider">
                    {selectedContact.lifecycleStage}
                  </span>
                </div>
              </div>
            </div>

            <button onClick={() => setSelectedContact(null)} className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-all relative z-10">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <a href={`mailto:${selectedContact.email}`} className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all">
                <Mail className="w-4 h-4" /><span>Send Email</span>
              </a>
              <a href={`tel:${selectedContact.phone}`} className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-white font-bold text-xs shadow-md rf-yellow-glow transition-all">
                <Phone className="w-4 h-4" /><span>Log Call</span>
              </a>
            </div>

            {/* Contact Details */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contact Details</h4>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3 text-xs">
                {[
                  { icon: <Mail className="w-4 h-4 text-slate-400" />, label: 'Email', value: selectedContact.email, mono: true },
                  { icon: <Phone className="w-4 h-4 text-slate-400" />, label: 'Phone', value: selectedContact.phone },
                  { icon: <Building2 className="w-4 h-4 text-slate-400" />, label: 'Company', value: selectedContact.company, blue: true },
                  { icon: <Award className="w-4 h-4 text-slate-400" />, label: 'Total Value', value: `$${selectedContact.totalDealsValue.toLocaleString()}`, bold: true },
                  { icon: <Clock className="w-4 h-4 text-slate-400" />, label: 'Last Activity', value: selectedContact.lastContacted },
                ].map((row, i) => (
                  <div key={i} className={`flex items-center justify-between ${i > 0 ? 'pt-2 border-t border-slate-200/60' : ''}`}>
                    <span className="text-slate-500 flex items-center gap-2">{row.icon}{row.label}</span>
                    <span className={`font-bold ${row.mono ? 'text-slate-900 select-all text-[10px]' : row.blue ? 'text-blue-600' : row.bold ? 'font-extrabold text-slate-900' : 'text-slate-900'}`}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tags & Categories</h4>
              <div className="flex flex-wrap gap-2">
                {selectedContact.tags.map((tag, idx) => (
                  <span key={idx} className="text-xs font-bold px-3 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">#{tag}</span>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">CRM Notes</h4>
              <div className={`p-3.5 rounded-xl border text-xs leading-relaxed font-medium ${selectedContact.notes ? 'bg-yellow-50/60 border-yellow-200 text-slate-800' : 'bg-slate-50 border-slate-200 text-slate-300 italic'}`}>
                {selectedContact.notes || 'No notes recorded.'}
              </div>
            </div>

            {/* Linked Deals */}
            {linkedDeals.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Linked Deals ({linkedDeals.length})</h4>
                <div className="space-y-2">
                  {linkedDeals.map((deal) => (
                    <div
                      key={deal.id}
                      onClick={() => { setSelectedContact(null); setCurrentView('pipeline'); }}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between hover:border-blue-200 hover:bg-blue-50/50 cursor-pointer transition-all"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{deal.title}</p>
                        <p className="text-[10px] text-slate-500">{deal.company} · {deal.stage}</p>
                      </div>
                      <span className="text-xs font-extrabold text-blue-600 shrink-0 ml-2">${deal.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            {linkedActivities.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Activity</h4>
                <div className="space-y-2.5">
                  {linkedActivities.slice(0, 4).map((act) => (
                    <div key={act.id} className="flex gap-2.5 text-xs">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">
                        {act.type === 'deal_won' ? '🎉' : act.type === 'meeting' ? '📅' : act.type === 'email' ? '📧' : act.type === 'call' ? '📞' : '⚡'}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{act.title}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{act.description}</p>
                        <span className="text-[9px] text-slate-400 mt-0.5 inline-block">{act.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Recommendation */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-yellow-50 border border-blue-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-extrabold text-blue-900">
                <Lightbulb className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                RelateFlows Recommendation
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Contact has a high lead score ({selectedContact.leadScore}/100). Recommended action: Schedule a 15-minute executive review call before Friday.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <button onClick={() => deleteContact(selectedContact.id)} className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1.5 p-2 rounded-xl hover:bg-rose-50 transition-all">
              <Trash2 className="w-4 h-4" /><span>Delete Contact</span>
            </button>
            <button onClick={() => setSelectedContact(null)} className="text-xs text-slate-600 font-bold px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 transition-all">
              Close Drawer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
