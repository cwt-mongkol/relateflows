import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { SocialChannel } from '../../types/crm';
import { MessageCircle, Globe, Plus, RefreshCw, Trash2 } from 'lucide-react';

const platformIcons: Record<string, React.ReactNode> = {
  facebook: <Globe className="w-4 h-4" />,
  instagram: <MessageCircle className="w-4 h-4" />,
  line: <MessageCircle className="w-4 h-4" />,
};

const platformColors: Record<string, string> = {
  facebook: 'bg-blue-100 text-blue-600',
  instagram: 'bg-pink-100 text-pink-600',
  line: 'bg-green-100 text-green-600',
};

const statusBadge: Record<string, string> = {
  connected: 'bg-emerald-100 text-emerald-700',
  disconnected: 'bg-slate-100 text-slate-500',
  error: 'bg-rose-100 text-rose-700',
  expired: 'bg-amber-100 text-amber-700',
};

export const ChannelManagement: React.FC = () => {
  const [channels, setChannels] = useState<SocialChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ type: 'facebook' as SocialChannel['type'], displayName: '', pageId: '', credentials: '' });

  const load = async () => {
    try {
      const res = await api.get<SocialChannel[]>('/api/channels');
      setChannels(res);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const addChannel = async () => {
    try {
      let creds = {};
      try { creds = JSON.parse(form.credentials || '{}'); } catch {}
      await api.post('/api/channels', { ...form, credentials: creds });
      setShowAdd(false);
      setForm({ type: 'facebook', displayName: '', pageId: '', credentials: '' });
      load();
    } catch (err) { console.error(err); }
  };

  const testChannel = async (id: number) => {
    try {
      await api.post(`/api/channels/${id}/test`, {});
      load();
    } catch (err) { console.error(err); }
  };

  const deleteChannel = async (id: number) => {
    try {
      await api.delete(`/api/channels/${id}`);
      load();
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="text-sm text-slate-500 p-6">Loading channels...</div>;

  return (
    <div className="space-y-4">
      {channels.map(ch => (
        <div key={ch.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-4">
          <div className={`w-8 h-8 rounded-xl ${platformColors[ch.type]} flex items-center justify-center`}>
            {platformIcons[ch.type]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">{ch.displayName}</p>
            <p className="text-[10px] text-slate-500">{ch.type} {ch.pageId && `· ${ch.pageId}`}</p>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadge[ch.status]}`}>{ch.status}</span>
          <button onClick={() => testChannel(ch.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all" title="Test connection">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => deleteChannel(ch.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      {showAdd ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
          <select
            value={form.type}
            onChange={e => setForm(prev => ({ ...prev, type: e.target.value as SocialChannel['type'] }))}
            className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400"
          >
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
            <option value="line">LINE</option>
          </select>
          <input value={form.displayName} onChange={e => setForm(prev => ({ ...prev, displayName: e.target.value }))} placeholder="Display name" className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
          <input value={form.pageId} onChange={e => setForm(prev => ({ ...prev, pageId: e.target.value }))} placeholder="Page / Account ID (optional)" className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
          <input value={form.credentials} onChange={e => setForm(prev => ({ ...prev, credentials: e.target.value }))} placeholder='Credentials JSON: {"key":"value"}' className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
          <div className="flex gap-2">
            <button onClick={addChannel} disabled={!form.displayName.trim()} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs px-3 py-2 rounded-lg">Add</button>
            <button onClick={() => setShowAdd(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs px-3 py-2 rounded-lg">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)} className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-300 text-xs font-bold transition-all">
          <Plus className="w-4 h-4" /> Add Channel
        </button>
      )}
    </div>
  );
};
