import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { CrmUser, SocialChannel, ChannelAccessRow } from '../../types/crm';
import { Users, Save } from 'lucide-react';

export const AccessControl: React.FC = () => {
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [channels, setChannels] = useState<SocialChannel[]>([]);
  const [access, setAccess] = useState<ChannelAccessRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<CrmUser[]>('/api/users'),
      api.get<SocialChannel[]>('/api/channels'),
      api.get<ChannelAccessRow[]>('/api/channel-access'),
    ]).then(([uRes, cRes, aRes]) => {
      setUsers(uRes);
      setChannels(cRes);
      setAccess(aRes);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const selectUser = async (userId: string) => {
    setSelectedUserId(userId);
    try {
      const res = await api.get<number[]>(`/api/users/${userId}/channels`);
      setSelected(res);
    } catch {
      const userAccess = access.filter(a => a.userId === userId).map(a => a.channelId);
      setSelected(userAccess);
    }
  };

  const toggleChannel = (chId: number) => {
    setSelected(prev => prev.includes(chId) ? prev.filter(id => id !== chId) : [...prev, chId]);
  };

  const saveAccess = async () => {
    if (!selectedUserId) return;
    setSaving(true);
    try {
      await api.post('/api/channel-access', { userId: selectedUserId, channelIds: selected });
      const chMap = new Map(channels.map(c => [c.id, c]));
      const uMap = new Map(users.map(u => [u.id, u]));
      const newRows: ChannelAccessRow[] = selected.map(chId => ({
        userId: selectedUserId,
        channelId: chId,
        userName: uMap.get(selectedUserId)?.name || '',
        channelName: chMap.get(chId)?.displayName || '',
        channelType: chMap.get(chId)?.type || '',
      }));
      setAccess(prev => [...prev.filter(a => a.userId !== selectedUserId), ...newRows]);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="text-sm text-slate-500 p-6">Loading...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-600" />
            <h3 className="text-xs font-extrabold text-slate-900">Users</h3>
          </div>
        </div>
        <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
          {users.filter(u => u.status === 'active').map(user => (
            <button
              key={user.id}
              onClick={() => selectUser(user.id)}
              className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${selectedUserId === user.id ? 'bg-blue-50 border-l-2 border-l-blue-600' : 'hover:bg-slate-50'}`}
            >
              <img src={user.avatar} alt="" className="w-7 h-7 rounded-full ring-2 ring-slate-200" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{user.roleName || 'No role'}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {selectedUserId ? (
          <>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-900">Channel Access</h3>
              <button onClick={saveAccess} disabled={saving} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-all">
                <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
            <div className="p-4 space-y-2">
              {channels.map(ch => {
                const isSel = selected.includes(ch.id);
                return (
                  <button
                    key={ch.id}
                    onClick={() => toggleChannel(ch.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${isSel ? 'bg-blue-50 border-blue-300' : 'bg-slate-50 border-slate-200 hover:border-blue-200'}`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isSel ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                      {isSel && <div className="w-2 h-2 rounded-sm bg-white" />}
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{ch.displayName}</p>
                      <p className="text-[10px] text-slate-500">{ch.type} · {ch.status}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-40">
            <p className="text-xs text-slate-400">Select a user to manage channel access</p>
          </div>
        )}
      </div>
    </div>
  );
};
