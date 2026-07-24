import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { Role, Permission } from '../../types/crm';
import { Shield, Plus, Save, Check } from 'lucide-react';

export const RoleManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [rolePerms, setRolePerms] = useState<Record<number, number[]>>({});
  const [editRoleId, setEditRoleId] = useState<number | null>(null);
  const [newRole, setNewRole] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [rRes, pRes] = await Promise.all([
        api.get<{ roles: Role[]; rolePermissions: { roleId: number; permissionId: number }[] }>('/api/roles'),
        api.get<Permission[]>('/api/permissions'),
      ]);
      setRoles(rRes.roles);
      setAllPermissions(pRes);
      const grouped: Record<number, number[]> = {};
      rRes.rolePermissions.forEach((rp: { roleId: number; permissionId: number }) => {
        if (!grouped[rp.roleId]) grouped[rp.roleId] = [];
        grouped[rp.roleId].push(rp.permissionId);
      });
      setRolePerms(grouped);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const togglePerm = (roleId: number, permId: number) => {
    setRolePerms(prev => {
      const current = prev[roleId] || [];
      const next = current.includes(permId) ? current.filter(p => p !== permId) : [...current, permId];
      return { ...prev, [roleId]: next };
    });
  };

  const savePerms = async (roleId: number) => {
    try {
      await api.patch(`/api/roles/${roleId}`, { permissionIds: rolePerms[roleId] || [] });
    } catch (err) { console.error(err); }
  };

  const createRole = async () => {
    if (!newRole.trim()) return;
    try {
      await api.post('/api/roles', { name: newRole.trim() });
      setNewRole('');
      load();
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="text-sm text-slate-500 p-6">Loading roles...</div>;

  const permsByModule: Record<string, Permission[]> = {};
  allPermissions.forEach(p => {
    if (!permsByModule[p.module]) permsByModule[p.module] = [];
    permsByModule[p.module].push(p);
  });

  return (
    <div className="space-y-5">
      {roles.map(role => {
        const isEditing = editRoleId === role.id;
        return (
          <div key={role.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-violet-600" />
                <div>
                  <span className="text-xs font-extrabold text-slate-900">{role.name}</span>
                  {role.isSystem && <span className="ml-2 text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">System</span>}
                </div>
              </div>
              <button onClick={() => { setEditRoleId(isEditing ? null : role.id); if (!isEditing) savePerms(role.id); }} className="text-xs font-bold text-blue-600 hover:text-blue-800">
                {isEditing ? 'Done' : 'Edit Permissions'}
              </button>
            </div>
            <div className="p-4 space-y-3">
              {Object.entries(permsByModule).map(([module, perms]) => (
                <div key={module}>
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">{module}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {perms.map(p => {
                      const selected = (rolePerms[role.id] || []).includes(p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => isEditing && togglePerm(role.id, p.id)}
                          disabled={!isEditing}
                          className={`text-[11px] font-bold px-2 py-1 rounded-lg border transition-all ${
                            selected
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'
                          } ${!isEditing ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                          <span className="flex items-center gap-1">
                            {isEditing && selected && <Check className="w-3 h-3" />}
                            {p.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {isEditing && (
                <button onClick={() => savePerms(role.id)} className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 mt-2">
                  <Save className="w-3.5 h-3.5" /> Save Changes
                </button>
              )}
            </div>
          </div>
        );
      })}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-2">
          <input
            value={newRole}
            onChange={e => setNewRole(e.target.value)}
            placeholder="New role name..."
            className="flex-1 text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400"
            onKeyDown={e => e.key === 'Enter' && createRole()}
          />
          <button onClick={createRole} disabled={!newRole.trim()} className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Role
          </button>
        </div>
      </div>
    </div>
  );
};
