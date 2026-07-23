import React from 'react';
import { useCRM } from '../../context/CRMContext';
import { MessageCircle, User, CheckCircle2, ArrowRight, Globe } from 'lucide-react';

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

export const InboxView: React.FC = () => {
  const { isLoading, leads, chatMessages, selectedLead, setSelectedLead, allocateLead } = useCRM();

  const leadChats = leads.map((lead) => {
    const msgs = chatMessages.filter((m) => m.leadId === lead.id);
    return { lead, messages: msgs };
  });

  const selectedMessages = selectedLead
    ? chatMessages.filter((m) => m.leadId === selectedLead.id)
    : [];

  const unreadTotal = leads.reduce((sum, l) => sum + l.unreadCount, 0);

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
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-extrabold text-slate-900">Inbox</h3>
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{unreadTotal} unread</span>
          </div>
          <p className="text-xs text-slate-500">{leads.length} conversations</p>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {leadChats.map(({ lead, messages }) => {
            const unreadMsg = messages.filter((m) => !m.isRead && m.from === 'contact').length;
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

      {/* Chat Thread */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        {selectedLead ? (
          <>
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
                </div>
              </div>

              {!selectedLead.isAllocated && (
                <button
                  onClick={() => allocateLead(selectedLead.id, 'sales-1')}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all"
                >
                  <User className="w-3.5 h-3.5" />
                  Assign to me
                </button>
              )}
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
            <div className="p-4 border-t border-slate-100">
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
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
            <MessageCircle className="w-12 h-12 stroke-[1.5]" />
            <p className="text-sm font-medium">Select a conversation</p>
            <p className="text-xs">Choose a lead from the left to view messages</p>
          </div>
        )}
      </div>
    </div>
  );
};
