import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { usePermissions } from '../../lib/permissions';
import {
  Headphones, MessageCircle, Users, Loader2, Send,
  X, AlertCircle, User, Filter, RefreshCw,
  Clock as ClockIcon, TrendingUp,
} from 'lucide-react';

interface CsSession {
  id: string;
  contact_name: string;
  contact_channel: string;
  assigned_to: string | null;
  assignee_name: string | null;
  status: 'waiting' | 'assigned' | 'active' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  assigned_at: string | null;
  closed_at: string | null;
  updated_at: string;
  message_count: number;
  first_response_at: string | null;
  waitMinutes?: number;
}

interface CsMessage {
  id: string;
  session_id: string;
  sender_id: string | null;
  sender_name: string;
  sender_type: 'cs_admin' | 'customer' | 'system';
  content: string;
  created_at: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar: string;
  isOnline: boolean;
  todaySchedule: { start: string; end: string } | null;
  activeChats: number;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600',
  normal: 'bg-blue-100 text-blue-600',
  high: 'bg-amber-100 text-amber-600',
  urgent: 'bg-rose-100 text-rose-600',
};

const STATUS_COLORS: Record<string, string> = {
  waiting: 'bg-amber-100 text-amber-700',
  assigned: 'bg-blue-100 text-blue-700',
  active: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-100 text-slate-500',
};

const CHANNEL_ICONS: Record<string, string> = {
  web: '🌐',
  facebook: '📘',
  line: '💬',
  phone: '📞',
};

export const CsQueueView: React.FC = () => {
  const { user } = useAuth();
  const { t } = useSettings();
  const { roleName } = usePermissions();

  const [queue, setQueue] = useState<CsSession[]>([]);
  const [myChats, setMyChats] = useState<CsSession[]>([]);
  const [teamStatus, setTeamStatus] = useState<TeamMember[]>([]);
  const [performance, setPerformance] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'queue' | 'my-chats' | 'team' | 'performance'>('queue');
  const [selectedSession, setSelectedSession] = useState<CsSession | null>(null);
  const [messages, setMessages] = useState<CsMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('waiting');
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      api.get<CsSession[]>('/api/cs-admin/queue'),
      api.get<TeamMember[]>('/api/cs-admin/team-status'),
      api.get<any[]>('/api/cs-admin/performance?days=7'),
    ]);

    if (results[0].status === 'fulfilled') setQueue(results[0].value);
    if (results[1].status === 'fulfilled') setTeamStatus(results[1].value);
    if (results[2].status === 'fulfilled') setPerformance(results[2].value);

    try {
      const myChatsData = await api.get<CsSession[]>('/api/cs-admin/chats?mine=true');
      setMyChats(myChatsData);
    } catch (err) {
      console.error('Failed to load my chats:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-refresh queue only when tab is visible and user is on queue tab
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible' && activeTab === 'queue') {
        api.get<CsSession[]>('/api/cs-admin/queue').then(setQueue).catch(() => {});
      }
    };
    const interval = setInterval(refresh, 30000);
    const onVisible = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [activeTab]);

  const handleClaim = async (sessionId: string) => {
    setClaiming(sessionId);
    try {
      await api.post('/api/cs-admin/queue/claim', { sessionId });
      await loadData();
    } catch (err: any) {
      setError(err?.message || t('csQueue.failedClaim'));
      setTimeout(() => setError(''), 3000);
    }
    setClaiming(null);
  };

  const openChat = async (session: CsSession) => {
    setSelectedSession(session);
    try {
      const data = await api.get<{ session: CsSession; messages: CsMessage[] }>(`/api/cs-admin/chats/${session.id}`);
      setMessages(data.messages);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedSession) return;
    setSendingMessage(true);
    try {
      await api.post(`/api/cs-admin/chats/${selectedSession.id}/message`, { content: messageInput.trim() });
      setMessageInput('');
      // Reload messages
      const data = await api.get<{ session: CsSession; messages: CsMessage[] }>(`/api/cs-admin/chats/${selectedSession.id}`);
      setMessages(data.messages);
      setSelectedSession(data.session);
      await loadData();
    } catch (err) {
      console.error('Failed to send message:', err);
    }
    setSendingMessage(false);
  };

  const closeChat = async (sessionId: string) => {
    try {
      await api.put(`/api/cs-admin/chats/${sessionId}/close`, {});
      setSelectedSession(null);
      setMessages([]);
      await loadData();
    } catch (err) {
      console.error('Failed to close chat:', err);
    }
  };

  const filteredQueue = queue.filter(s => statusFilter === 'all' || s.status === statusFilter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Headphones className="w-5 h-5 text-blue-600" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('csQueue.title')}</span>
        </div>
        <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">{t('csQueue.title')}</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-xl">
          {t('csQueue.subtitle').replace('{waiting}', String(queue.filter(s => s.status === 'waiting').length)).replace('{active}', String(myChats.filter(s => s.status !== 'closed').length))}
        </p>
        <span className="inline-flex items-center gap-1.5 mt-3 text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
          <User className="w-3 h-3" /> {t('csQueue.userInfo').replace('{name}', user?.name || t('csQueue.unknown')).replace('{role}', roleName)}
        </span>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-bold text-rose-700">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex gap-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-1.5 overflow-x-auto">
        {(['queue', 'my-chats', 'team', 'performance'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === tab ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            {tab === 'queue' && <MessageCircle className="w-3.5 h-3.5" />}
            {tab === 'my-chats' && <User className="w-3.5 h-3.5" />}
            {tab === 'team' && <Users className="w-3.5 h-3.5" />}
            {tab === 'performance' && <TrendingUp className="w-3.5 h-3.5" />}
            {tab === 'queue' && t('csQueue.tab.queue').replace('{count}', String(queue.filter(s => s.status === 'waiting').length))}
            {tab === 'my-chats' && t('csQueue.tab.myChats').replace('{count}', String(myChats.filter(s => s.status !== 'closed').length))}
            {tab === 'team' && t('csQueue.tab.team').replace('{count}', String(teamStatus.filter(m => m.isOnline).length))}
            {tab === 'performance' && t('csQueue.tab.performance')}
          </button>
        ))}
      </div>

      {/* Refresh */}
      <div className="flex justify-end">
        <button onClick={loadData} className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-700 transition-colors">
          <RefreshCw className="w-3 h-3" /> {t('csQueue.refresh')}
        </button>
      </div>

      {/* Selected chat view (overlay when a session is selected) */}
      {selectedSession && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Chat header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
                {selectedSession.contact_name.charAt(0)}
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">{selectedSession.contact_name}</h4>
                <p className="text-[10px] text-slate-500">
                  {CHANNEL_ICONS[selectedSession.contact_channel] || '🌐'} {selectedSession.contact_channel}
                  <span className={`ml-2 inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${STATUS_COLORS[selectedSession.status]}`}>
                    {selectedSession.status}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedSession.status !== 'closed' && (
                <button
                  onClick={() => closeChat(selectedSession.id)}
                  className="text-xs font-bold text-slate-500 hover:text-rose-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {t('csQueue.closeChat')}
                </button>
              )}
              <button
                onClick={() => { setSelectedSession(null); setMessages([]); }}
                className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="h-80 overflow-y-auto p-5 space-y-3">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <p className="text-xs text-slate-400">{t('csQueue.noMessages')}</p>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender_type === 'cs_admin' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  msg.sender_type === 'cs_admin'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : msg.sender_type === 'system'
                    ? 'bg-slate-100 text-slate-500 italic text-[11px] rounded-br-md'
                    : 'bg-slate-100 text-slate-800 rounded-bl-md'
                }`}>
                  <p className={`text-xs ${msg.sender_type === 'cs_admin' ? 'text-white/80' : 'text-slate-500'} font-bold mb-0.5`}>
                    {msg.sender_name}
                  </p>
                  <p className="text-sm">{msg.content}</p>
                  <p className={`text-[9px] mt-1 ${msg.sender_type === 'cs_admin' ? 'text-white/60' : 'text-slate-400'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          {selectedSession.status !== 'closed' && (
            <div className="border-t border-slate-100 p-3">
              <div className="flex items-center gap-2">
                <input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder={t('csQueue.typeResponse')}
                  className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
                <button
                  onClick={sendMessage}
                  disabled={!messageInput.trim() || sendingMessage}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white p-2.5 rounded-xl transition-colors"
                >
                  {sendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab content */}
      {activeTab === 'queue' && !selectedSession && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Filter */}
          <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-bold bg-transparent border border-slate-200 rounded-lg px-2 py-1 focus:outline-none"
            >
              <option value="all">{t('csQueue.status.all')}</option>
              <option value="waiting">{t('csQueue.status.waiting')}</option>
              <option value="assigned">{t('csQueue.status.assigned')}</option>
              <option value="active">{t('csQueue.status.active')}</option>
              <option value="closed">{t('csQueue.status.closed')}</option>
            </select>
            <span className="text-[10px] text-slate-400 ml-auto">{t('csQueue.sessions').replace('{count}', String(filteredQueue.length))}</span>
          </div>

          {/* List */}
          <div className="divide-y divide-slate-50">
            {filteredQueue.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <MessageCircle className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-xs font-bold">{t('csQueue.queueEmpty')}</p>
              </div>
            )}
            {filteredQueue.map((session) => (
              <div key={session.id} className="px-5 py-3 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                      {session.contact_name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 truncate">{session.contact_name}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${PRIORITY_COLORS[session.priority]}`}>
                          {session.priority}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                        <span>{CHANNEL_ICONS[session.contact_channel] || '🌐'} {session.contact_channel}</span>
                        <span className={`inline-block px-1.5 py-0.5 rounded font-bold ${STATUS_COLORS[session.status]}`}>
                          {session.status}
                        </span>
                        {session.waitMinutes !== undefined && session.waitMinutes > 0 && (
                          <span className="flex items-center gap-0.5 text-amber-600">
                            <ClockIcon className="w-3 h-3" /> {session.waitMinutes}m
                          </span>
                        )}
                        {session.assignee_name && (
                          <span>→ {session.assignee_name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <button
                      onClick={() => openChat(session)}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      {t('csQueue.view')}
                    </button>
                    {session.status === 'waiting' && (
                      <button
                        onClick={() => handleClaim(session.id)}
                        disabled={claiming === session.id}
                        className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {claiming === session.id ? <Loader2 className="w-3 h-3 animate-spin" /> : t('csQueue.claim')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Chats tab */}
      {activeTab === 'my-chats' && !selectedSession && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-50">
          {myChats.filter(s => s.status !== 'closed').length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <User className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-xs font-bold">{t('csQueue.myChatsEmpty')}</p>
            </div>
          )}
          {myChats.filter(s => s.status !== 'closed').map((session) => (
            <div key={session.id} className="px-5 py-3 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                    {session.contact_name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-bold text-slate-900 truncate">{session.contact_name}</span>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                      <span>{CHANNEL_ICONS[session.contact_channel] || '🌐'} {session.contact_channel}</span>
                      <span className={`inline-block px-1.5 py-0.5 rounded font-bold ${STATUS_COLORS[session.status]}`}>
                        {session.status}
                      </span>
                      <span>{t('csQueue.messages').replace('{count}', String(session.message_count))}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => openChat(session)}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors shrink-0 ml-3"
                >
                  {t('csQueue.open')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Team status tab */}
      {activeTab === 'team' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamStatus.map((member) => (
            <div key={member.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
                    {member.name.charAt(0)}
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${member.isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">{member.name}</h4>
                  <p className="text-[10px] text-slate-500">{member.isOnline ? t('csQueue.online') : t('csQueue.offline')}</p>
                </div>
              </div>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{t('csQueue.activeChats')}</span>
                  <span className="font-bold text-slate-800">{member.activeChats}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{t('csQueue.todaySchedule')}</span>
                  <span className="font-bold text-slate-800">
                    {member.todaySchedule
                      ? `${member.todaySchedule.start.slice(0, 5)} - ${member.todaySchedule.end.slice(0, 5)}`
                      : t('csQueue.dayOff')}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {teamStatus.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-400">
              <Users className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-xs font-bold">{t('csQueue.noTeam')}</p>
            </div>
          )}
        </div>
      )}

      {/* Performance tab */}
      {activeTab === 'performance' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <h4 className="text-sm font-extrabold text-slate-900">{t('csQueue.performance')}</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold">
                  <th className="text-left px-5 py-3">{t('csQueue.table.agent')}</th>
                  <th className="text-center px-3 py-3">{t('csQueue.table.totalChats')}</th>
                  <th className="text-center px-3 py-3">{t('csQueue.table.responded')}</th>
                  <th className="text-center px-3 py-3">{t('csQueue.table.avgResponse')}</th>
                  <th className="text-center px-3 py-3">{t('csQueue.table.closed')}</th>
                  <th className="text-center px-3 py-3">{t('csQueue.table.hoursSpent')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {performance.map((p: any) => (
                  <tr key={p.assigned_to} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[9px] font-bold">
                          {p.user_name?.charAt(0) || '?'}
                        </div>
                        <span className="font-bold text-slate-800">{p.user_name || t('csQueue.unknown')}</span>
                      </div>
                    </td>
                    <td className="text-center px-3 py-3 font-bold text-slate-800">{p.total_chats}</td>
                    <td className="text-center px-3 py-3">{p.responded_chats}</td>
                    <td className="text-center px-3 py-3">
                      <span className="font-bold text-blue-600">{t('csQueue.min').replace('{count}', p.avg_response_minutes || '-')}</span>
                    </td>
                    <td className="text-center px-3 py-3">{p.closed_chats}</td>
                    <td className="text-center px-3 py-3">{t('csQueue.hrs').replace('{count}', p.total_hours_spent || '0')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {performance.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <TrendingUp className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-xs font-bold">{t('csQueue.noPerformance')}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
