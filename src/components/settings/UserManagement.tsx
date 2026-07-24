import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { CrmUser } from '../../types/crm';
import { Shield, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [roles, setRoles] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<CrmUser[]>('/api/users'),
      api.get<{ roles: { id: number; name: string }[] }>('/api/roles'),
    ]).then(([usersRes, rolesRes]) => {
      setUsers(usersRes);
      setRoles(rolesRes.roles);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const updateUser = async (id: string, data: { role_id?: number; status?: string }) => {
    try {
      const res = await api.patch<CrmUser>(`/api/users/${id}`, data);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...res } : u));
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="text-sm text-slate-500 p-6">Loading users...</div>;

  const statusIcon = (s: string) => {
    if (s === 'active') return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
    if (s === 'inactive') return <XCircle className="w-3.5 h-3.5 text-slate-400" />;
    return <AlertCircle className="w-3.5 h-3.5 text-amber-500" />;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-violet-600" />
          <h3 className="text-sm font-extrabold text-slate-900">User Management</h3>
        </div>
        <p className="text-xs text-slate-500 mt-1">Manage user roles and account status</p>
      </div>
      <div className="divide-y divide-slate-100">
        {users.map(user => (
          <div key={user.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
            <img src={user.avatar} alt="" className="w-8 h-8 rounded-full ring-2 ring-slate-200" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
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
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
};
