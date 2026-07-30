import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { CrmUser } from '../../types/crm';
import { Shield, CheckCircle2, XCircle, AlertCircle, UserPlus, Loader2, X, Building2 } from 'lucide-react';

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  status: string;
}

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [roles, setRoles] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role_id: 5 });
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [currentTenantId, setCurrentTenantId] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const me = await api.get<{ role_id: number; tenant_id: string }>('/api/auth/me').catch(() => null);
      if (me) {
        setIsSuperAdmin(me.role_id === 1);
        setCurrentTenantId(me.tenant_id || '');
      }
      const [usersRes, rolesRes] = await Promise.all([
        api.get<CrmUser[]>('/api/users'),
        api.get<{ roles: { id: number; name: string }[] }>('/api/roles'),
      ]);
      setUsers(usersRes);
      setRoles(rolesRes.roles);
      if (me?.role_id === 1) {
        const tenantList = await api.get<TenantInfo[]>('/api/admin/tenants').catch(() => []);
        setTenants(tenantList);
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const updateUser = async (id: string, data: { role_id?: number; status?: string }) => {
    try {
      const res = await api.patch<CrmUser>(`/api/users/${id}`, data);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...res } : u));
    } catch (err) { console.error(err); }
  };

  const [selectedTenantId, setSelectedTenantId] = useState('');

  const handleInvite = async () => {
    if (!inviteForm.name.trim()) return;
    setInviting(true);
    setInviteError('');
    try {
      const body: Record<string, unknown> = { ...inviteForm };
      if (isSuperAdmin) {
        body.tenant_id = currentTenantId || selectedTenantId;
      }
      await api.post<CrmUser>('/api/users', body);
      setShowInvite(false);
      setInviteError('');
      setInviteForm({ name: '', email: '', role_id: 5 });
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to invite user. Make sure you have switched to a company first.';
      setInviteError(msg);
    }
    setInviting(false);
  };

  if (loading) return <div className="text-sm text-slate-500 p-6">Loading users...</div>;

  const statusIcon = (s: string) => {
    if (s === 'active') return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
    if (s === 'inactive') return <XCircle className="w-3.5 h-3.5 text-slate-400" />;
    return <AlertCircle className="w-3.5 h-3.5 text-amber-500" />;
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-violet-600" />
            <h3 className="text-sm font-extrabold text-slate-900">User Management</h3>
          </div>
          <button onClick={() => setShowInvite(!showInvite)} className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all">
            <UserPlus className="w-3.5 h-3.5" />
            Invite User
          </button>
        </div>

        {showInvite && (
          <div className="bg-violet-50/50 border-b border-violet-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-violet-800">Invite a new user to this company</p>
              <button onClick={() => setShowInvite(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input value={inviteForm.name} onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })} placeholder="Full name *" className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500" />
              <input value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="Email address" className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500" />
              <select value={inviteForm.role_id} onChange={e => setInviteForm({ ...inviteForm, role_id: Number(e.target.value) })} className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500">
                {roles.filter(r => r.id > 1).map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            {isSuperAdmin && !currentTenantId && tenants.length > 0 && (
              <div>
                <select value={selectedTenantId} onChange={e => setSelectedTenantId(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="">Select a company...</option>
                  {tenants.filter(t => t.status === 'active').map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}
            {inviteError && (
              <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{inviteError}</p>
            )}
            <div className="flex items-center gap-2 pt-1">
              <button onClick={handleInvite} disabled={inviting || !inviteForm.name.trim() || (isSuperAdmin && !currentTenantId && !selectedTenantId)} className="bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5">
                {inviting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {inviting ? 'Inviting...' : 'Send Invite'}
              </button>
            </div>
          </div>
        )}

        <div className="divide-y divide-slate-100">
          {users.map(user => (
            <div key={user.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
              <img src={user.avatar} alt="" className="w-8 h-8 rounded-full ring-2 ring-slate-200" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                {user.companyName && (
                  <p className="text-[10px] text-violet-500 truncate flex items-center gap-1 mt-0.5">
                    <Building2 className="w-3 h-3" />
                    {user.companyName}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">{statusIcon(user.status)}</div>
              <select
                value={user.status}
                onChange={e => updateUser(user.id, { status: e.target.value })}
                className="text-[11px] font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
              <select
                value={user.roleId ?? ''}
                onChange={e => updateUser(user.id, { role_id: Number(e.target.value) })}
                className="text-[11px] font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400"
              >
                <option value="" disabled>Role</option>
                {roles.filter(r => r.id > 1).map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
