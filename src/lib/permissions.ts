import { useAuth } from '../context/AuthContext';
import type { NavView, SettingsTab } from '../types/crm';

type RoleId = 1 | 2 | 3 | 4 | 5;

const NAV_ACCESS: Record<NavView, RoleId[]> = {
  dashboard:  [1, 2, 3, 4, 5],
  inbox:      [1, 2, 3, 4, 5],
  pipeline:   [1, 2, 3, 5],
  contacts:   [1, 2, 3, 4, 5],
  workflows:  [1, 2, 5],
  tasks:      [1, 2, 3, 4, 5],
  calendar:   [1, 2, 3, 4, 5],
  analytics:  [1, 2, 3, 5],
  settings:   [1, 2, 3, 4, 5],
};

const SETTINGS_TAB_ACCESS: Record<SettingsTab, RoleId[]> = {
  general:      [1, 2, 3, 4, 5],
  users:        [1, 2, 5],
  roles:        [1],
  channels:     [1],
  access:       [1, 2, 5],
  integrations: [1],
};

const PERMISSION_MAP: Record<string, RoleId[]> = {
  'social_inbox:lead_allocation': [1, 2, 5],
  'pipeline:view_deals': [1, 2, 3, 5],
  'pipeline:delete_deal': [1, 2],
  'pipeline:stage_crud_settings': [1],
  'contacts:delete': [1],
  'tasks:create_assign_others': [1, 2, 5],
  'calendar:edit_delete_others_appointment': [1, 2, 5],
  'calendar:google_sync_setup': [1],
  'workflows:view': [1, 2, 5],
  'workflows:create_toggle_edit': [1, 2, 5],
  'analytics:view': [1, 2, 3, 5],
  'settings_user_management:view_add_edit_deactivate_user': [1, 2, 5],
  'settings_roles_permissions:create_edit_role_matrix': [1],
  'settings_channel_management:add_remove_channel_credentials': [1],
  'settings_channel_access_matrix:map_user_channel': [1, 2, 5],
  'settings_integrations_api_keys:view_edit_credential_masked': [1],
  'audit_log:view': [1, 2, 5],
};

const ROLE_NAMES: Record<RoleId, string> = {
  1: 'Administrator',
  2: 'Manager',
  3: 'Sales Rep',
  4: 'Support Agent',
  5: 'CS Admin',
};

export function usePermissions() {
  const { user } = useAuth();
  const roleId = (user?.roleId ?? 3) as RoleId;

  const canNav = (view: NavView): boolean =>
    (NAV_ACCESS[view] ?? []).includes(roleId);

  const canSettingsTab = (tab: SettingsTab): boolean =>
    (SETTINGS_TAB_ACCESS[tab] ?? []).includes(roleId);

  const can = (module: string, action: string): boolean => {
    const key = `${module}:${action}`;
    const allowed = PERMISSION_MAP[key];
    if (allowed) return allowed.includes(roleId);
    if (roleId === 1) return true;
    return false;
  };

  const roleName = ROLE_NAMES[roleId] ?? 'Unknown';

  return { canNav, canSettingsTab, can, roleName, roleId, isAdmin: roleId === 1 };
}
