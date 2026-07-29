import { useAuth } from '../context/AuthContext';
import type { NavView, SettingsTab } from '../types/crm';

type RoleId = 1 | 2 | 3 | 4 | 5;

const NAV_ACCESS: Record<NavView, RoleId[]> = {
  dashboard:  [1, 2, 3, 4, 5],
  inbox:      [1, 2, 3, 4, 5],
  pipeline:   [1, 2, 3, 5],
  contacts:   [1, 2, 3, 4, 5],
  workflows:  [1, 2, 4],
  tasks:      [1, 2, 3, 4, 5],
  calendar:   [1, 2, 3, 4, 5],
  analytics:  [1, 2, 3, 5],
  settings:   [1, 2, 3, 4, 5],
  'cs-queue': [1, 2, 4],
};

const SETTINGS_TAB_ACCESS: Record<SettingsTab, RoleId[]> = {
  general:        [1, 2, 3, 4, 5],
  users:          [1, 2, 4],
  roles:          [1, 2],
  channels:       [1, 2],
  access:         [1, 2, 4],
  integrations:   [1, 2],
  companies:      [1, 2, 3, 4],
  'custom-objects': [1, 2],
  chatbot: [1, 2, 3, 4, 5],
  'cs-admin': [1, 2, 4],
  'lead-allocation': [1, 2, 3, 4],
};

const PERMISSION_MAP: Record<string, RoleId[]> = {
  'social_inbox:lead_allocation': [2, 3, 4],
  'pipeline:view_deals': [2, 3, 5, 4],
  'pipeline:delete_deal': [2, 3],
  'pipeline:stage_crud_settings': [2],
  'contacts:delete': [2],
  'tasks:create_assign_others': [2, 3, 4],
  'calendar:edit_delete_others_appointment': [2, 3, 4],
  'calendar:google_sync_setup': [2],
  'workflows:view': [2, 3, 4],
  'workflows:create_toggle_edit': [2, 3, 4],
  'analytics:view': [2, 3, 5],
  'settings_user_management:view_add_edit_deactivate_user': [2, 3, 4],
  'settings_roles_permissions:create_edit_role_matrix': [2],
  'settings_channel_management:add_remove_channel_credentials': [2],
  'settings_channel_access_matrix:map_user_channel': [2, 3, 4],
  'settings_integrations_api_keys:view_edit_credential_masked': [2],
  'audit_log:view': [2, 3, 4],
};

const ROLE_NAMES: Record<RoleId, string> = {
  1: 'Super Admin',
  2: 'Administrator',
  3: 'Manager',
  4: 'CS Admin',
  5: 'Sales Rep',
};

export function usePermissions() {
  const { user } = useAuth();
  const roleId = (user?.roleId ?? 5) as RoleId;

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
