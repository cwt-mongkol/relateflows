// Route-to-permission mapping — single middleware for all routes
// Auto-checks permission based on request method + path pattern

const RULES = [
  // ── Dashboard ──
  { methods: ['GET'], pattern: /^\/api\/metrics/, permission: 'analytics:view' },
  { methods: ['GET'], pattern: /^\/api\/stages$/, permission: 'pipeline:view_deals' },

  // ── Pipeline / Deals ──
  { methods: ['GET'], pattern: /^\/api\/deals$/, permission: 'pipeline:view_deals' },
  { methods: ['POST'], pattern: /^\/api\/deals$/, permission: 'pipeline:create_edit_deal' },
  { methods: ['PATCH'], pattern: /^\/api\/deals\/[^/]+\/stage$/, permission: 'pipeline:create_edit_deal' },
  { methods: ['DELETE'], pattern: /^\/api\/deals\/[^/]+$/, permission: 'pipeline:delete_deal' },

  // ── Contacts ──
  { methods: ['GET'], pattern: /^\/api\/contacts$/, permission: 'contacts:view_search' },
  { methods: ['POST'], pattern: /^\/api\/contacts$/, permission: 'contacts:create_edit' },
  { methods: ['DELETE'], pattern: /^\/api\/contacts\/[^/]+$/, permission: 'contacts:delete' },

  // ── Tasks ──
  { methods: ['GET'], pattern: /^\/api\/tasks$/, permission: 'tasks:view' },
  { methods: ['POST'], pattern: /^\/api\/tasks$/, permission: 'tasks:create_assign_others' },
  { methods: ['PATCH'], pattern: /^\/api\/tasks\/[^/]+$/, permission: 'tasks:edit_delete' },
  { methods: ['DELETE'], pattern: /^\/api\/tasks\/[^/]+$/, permission: 'tasks:edit_delete' },

  // ── Workflows ──
  { methods: ['GET'], pattern: /^\/api\/workflows$/, permission: 'workflows:view' },
  { methods: ['POST'], pattern: /^\/api\/workflows$/, permission: 'workflows:create_toggle_edit' },
  { methods: ['PATCH'], pattern: /^\/api\/workflows\/[^/]+\/toggle$/, permission: 'workflows:create_toggle_edit' },

  // ── Calendar ──
  { methods: ['GET'], pattern: /^\/api\/calendar\/events$/, permission: 'calendar:view_create_appointment' },
  { methods: ['POST'], pattern: /^\/api\/calendar\/events$/, permission: 'calendar:view_create_appointment' },
  { methods: ['PATCH'], pattern: /^\/api\/calendar\/events\/[^/]+$/, permission: 'calendar:edit_delete_others_appointment' },
  { methods: ['DELETE'], pattern: /^\/api\/calendar\/events\/[^/]+$/, permission: 'calendar:edit_delete_others_appointment' },
  { methods: ['GET'], pattern: /^\/api\/calendar\/auth-url$/, permission: 'calendar:google_sync_setup' },
  { methods: ['POST'], pattern: /^\/api\/calendar\/callback$/, permission: 'calendar:google_sync_setup' },
  { methods: ['GET'], pattern: /^\/api\/calendar\/status$/, permission: 'calendar:view_create_appointment' },
  { methods: ['PATCH'], pattern: /^\/api\/calendar\/calendar$/, permission: 'calendar:edit_delete_others_appointment' },
  { methods: ['DELETE'], pattern: /^\/api\/calendar\/disconnect$/, permission: 'calendar:google_sync_setup' },

  // ── Activities ──
  { methods: ['GET'], pattern: /^\/api\/activities$/, permission: 'pipeline:view_deals' },
  { methods: ['POST'], pattern: /^\/api\/activities$/, permission: 'pipeline:create_edit_deal' },

  // ── Companies ──
  { methods: ['GET'], pattern: /^\/api\/companies$/, permission: 'settings_company:view' },

  // ── Products / Categories / Appointments (Product Catalog) ──
  { methods: ['GET'], pattern: /^\/api\/categories$/, permission: 'pipeline:view_deals' },
  { methods: ['POST'], pattern: /^\/api\/categories$/, permission: 'pipeline:create_edit_deal' },
  { methods: ['PATCH'], pattern: /^\/api\/categories\/[^/]+$/, permission: 'pipeline:create_edit_deal' },
  { methods: ['DELETE'], pattern: /^\/api\/categories\/[^/]+$/, permission: 'pipeline:delete_deal' },
  { methods: ['GET'], pattern: /^\/api\/products$/, permission: 'pipeline:view_deals' },
  { methods: ['POST'], pattern: /^\/api\/products$/, permission: 'pipeline:create_edit_deal' },
  { methods: ['PATCH'], pattern: /^\/api\/products\/[^/]+$/, permission: 'pipeline:create_edit_deal' },
  { methods: ['DELETE'], pattern: /^\/api\/products\/[^/]+$/, permission: 'pipeline:delete_deal' },
  { methods: ['GET'], pattern: /^\/api\/appointments$/, permission: 'calendar:view_create_appointment' },
  { methods: ['POST'], pattern: /^\/api\/appointments$/, permission: 'calendar:view_create_appointment' },
  { methods: ['PATCH'], pattern: /^\/api\/appointments\/[^/]+$/, permission: 'calendar:edit_delete_others_appointment' },
  { methods: ['DELETE'], pattern: /^\/api\/appointments\/[^/]+$/, permission: 'calendar:edit_delete_others_appointment' },

  // ── Tags / Leads / Allocation ──
  { methods: ['GET'], pattern: /^\/api\/tags$/, permission: 'pipeline:view_deals' },
  { methods: ['POST'], pattern: /^\/api\/tags$/, permission: 'pipeline:create_edit_deal' },
  { methods: ['PATCH'], pattern: /^\/api\/tags\/[^/]+$/, permission: 'pipeline:create_edit_deal' },
  { methods: ['DELETE'], pattern: /^\/api\/tags\/[^/]+$/, permission: 'pipeline:delete_deal' },
  { methods: ['GET'], pattern: /^\/api\/leads\/[^/]+\/tags$/, permission: 'pipeline:view_deals' },
  { methods: ['POST'], pattern: /^\/api\/leads\/[^/]+\/tags$/, permission: 'pipeline:create_edit_deal' },
  { methods: ['DELETE'], pattern: /^\/api\/leads\/[^/]+\/tags\/[^/]+$/, permission: 'pipeline:delete_deal' },
  { methods: ['GET'], pattern: /^\/api\/leads\/[^/]+\/allocation-history$/, permission: 'social_inbox:lead_allocation' },
  { methods: ['POST'], pattern: /^\/api\/leads\/[^/]+\/allocate$/, permission: 'social_inbox:lead_allocation' },
  { methods: ['PATCH'], pattern: /^\/api\/leads\/[^/]+\/allocation\/[^/]+$/, permission: 'social_inbox:lead_allocation' },

  // ── Settings: Enterprise / Company Profile ──
  { methods: ['GET'], pattern: /^\/api\/enterprise\/profile$/, permission: 'settings_company:view' },
  { methods: ['PUT'], pattern: /^\/api\/enterprise\/profile$/, permission: 'settings_company:edit' },
  { methods: ['GET'], pattern: /^\/api\/enterprise\/tenants$/, permission: 'settings_company:view' },

  // ── Settings: Integrations ──
  { methods: ['GET'], pattern: /^\/api\/settings\/integrations$/, permission: 'settings_integrations_api_keys:view_edit_credential_masked' },
  { methods: ['PUT'], pattern: /^\/api\/settings\/integrations$/, permission: 'settings_integrations_api_keys:view_edit_credential_masked' },

  // ── Social Inbox / Channels ──
  { methods: ['GET'], pattern: /^\/api\/inbox\/channels$/, permission: 'social_inbox:view_channel' },

  // ── Channel Management ──
  { methods: ['GET'], pattern: /^\/api\/channels$/, permission: 'settings_channel_management:add_remove_channel_credentials' },
  { methods: ['POST'], pattern: /^\/api\/channels$/, permission: 'settings_channel_management:add_remove_channel_credentials' },
  { methods: ['PATCH'], pattern: /^\/api\/channels\/[^/]+$/, permission: 'settings_channel_management:add_remove_channel_credentials' },
  { methods: ['DELETE'], pattern: /^\/api\/channels\/[^/]+$/, permission: 'settings_channel_management:add_remove_channel_credentials' },
  { methods: ['POST'], pattern: /^\/api\/channels\/[^/]+\/test$/, permission: 'settings_channel_management:add_remove_channel_credentials' },

  // ── Channel Access Matrix ──
  { methods: ['GET'], pattern: /^\/api\/channel-access$/, permission: 'settings_channel_access_matrix:map_user_channel' },
  { methods: ['POST'], pattern: /^\/api\/channel-access$/, permission: 'settings_channel_access_matrix:map_user_channel' },
  { methods: ['GET'], pattern: /^\/api\/users\/[^/]+\/channels$/, permission: 'settings_channel_access_matrix:map_user_channel' },

  // ── User Management ──
  { methods: ['GET'], pattern: /^\/api\/users$/, permission: 'settings_user_management:view_add_edit_deactivate_user' },
  { methods: ['POST'], pattern: /^\/api\/users$/, permission: 'settings_user_management:view_add_edit_deactivate_user' },
  { methods: ['PATCH'], pattern: /^\/api\/users\/[^/]+$/, permission: 'settings_user_management:view_add_edit_deactivate_user' },

  // ── Role Management ──
  { methods: ['GET'], pattern: /^\/api\/roles$/, permission: 'settings_roles_permissions:create_edit_role_matrix' },
  { methods: ['POST'], pattern: /^\/api\/roles$/, permission: 'settings_roles_permissions:create_edit_role_matrix' },
  { methods: ['PATCH'], pattern: /^\/api\/roles\/[^/]+$/, permission: 'settings_roles_permissions:create_edit_role_matrix' },
  { methods: ['DELETE'], pattern: /^\/api\/roles\/[^/]+$/, permission: 'settings_roles_permissions:create_edit_role_matrix' },

  // ── Audit Log ──
  { methods: ['GET'], pattern: /^\/api\/audit-log$/, permission: 'settings_user_management:view_add_edit_deactivate_user' },

  // ── Permissions listing ──
  { methods: ['GET'], pattern: /^\/api\/permissions$/, permission: 'settings_roles_permissions:create_edit_role_matrix' },

  // ── Stubs (low-risk, no strict permission needed) ──
  { methods: ['GET'], pattern: /^\/api\/leads$/, permission: 'pipeline:view_deals' },
  { methods: ['GET'], pattern: /^\/api\/chat-messages$/, permission: 'social_inbox:view_channel' },
  { methods: ['GET'], pattern: /^\/api\/leads\/allocations$/, permission: 'social_inbox:lead_allocation' },
];

// Skip auth-check for exact paths (auth, webhook, callback)
const SKIP_PREFIXES = ['/api/auth/', '/api/webhook/', '/api/channels/facebook/callback', '/api/channels/line/callback'];

export function routeAuthorize(req, res, next) {
  // Super Admin bypass
  if (req.user?.role_id === 1) return next();

  // req.path is relative to the mount point (/api), so reconstruct full path
  const fullPath = req.baseUrl + req.path;
  const method = req.method;

  // Skip auth routes
  for (const prefix of SKIP_PREFIXES) {
    if (fullPath.startsWith(prefix)) return next();
  }

  // Find matching rule
  for (const rule of RULES) {
    if (rule.methods.includes(method) && rule.pattern.test(fullPath)) {
      if (!req.user?.permissions?.includes(rule.permission)) {
        return res.status(403).json({
          error: 'Forbidden',
          required: rule.permission,
          path: fullPath,
        });
      }
      return next();
    }
  }

  // No matching rule — allow
  next();
}
