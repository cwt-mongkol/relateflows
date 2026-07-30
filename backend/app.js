import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import pool from './db.js';
import { scopeToTenant, withTenantScope, resolveTenantFromChannel } from './scopeToCompany.js';
import { sendInviteEmail } from './email.js';
import { keysetPaginate, paginationResult } from './pagination.js';
import { validate, stripSensitiveFields } from './validation.js';
import { routeAuthorize } from './routePermissions.js';
import { validateBody } from './schemas.js';
import { processMessage, trainKnowledge, getSuggestedQuestions, getChatbotConfig, checkAutoReplyAvailable, DEFAULT_CHATBOT_CONFIG, handleQualificationStep, detectIntent } from './chatbot-agent.js';

dotenv.config();

// Schema is managed via init.sql + migration system in db.js

// ===== Encryption for stored credentials =====
if (!process.env.ENCRYPTION_KEY) {
  console.error('FATAL: ENCRYPTION_KEY must be set in production. All encrypted data will be unrecoverable without it.');
  if (process.env.NODE_ENV === 'production') process.exit(1);
}
const ENCRYPTION_KEY = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY || 'fallback-dev-only').digest();
const ALGORITHM = 'aes-256-cbc';

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText) {
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const encrypted = parts.join(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
if (!process.env.GOOGLE_REDIRECT_URI) {
  console.warn('GOOGLE_REDIRECT_URI not set. Google Calendar sync may not work.');
}
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || '';

const googleOAuthClient = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);

const CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar'];

const app = express();
const PORT = process.env.PORT || 5000;

const corsOriginsStr = process.env.CORS_ORIGINS || '';
const CORS_ORIGINS = corsOriginsStr.split(',').filter(Boolean).map(s => s.trim());
if (CORS_ORIGINS.length === 0 && process.env.NODE_ENV === 'production') {
  console.warn('WARNING: CORS_ORIGINS is empty - all cross-origin requests will be denied.');
}
app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true,
}));
app.use(helmet());
app.use(express.json({ limit: '1mb' }));

// Input sanitization: strip HTML/script tags from all string values in request bodies
function sanitizeValue(val) {
  if (typeof val === 'string') {
    return val.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]*>/g, '');
  }
  return val;
}
function sanitizeObject(obj) {
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (obj && typeof obj === 'object') {
    const sanitized = {};
    for (const [key, val] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(val);
    }
    return sanitized;
  }
  return sanitizeValue(obj);
}
app.use((req, res, next) => {
  if (['POST', 'PATCH', 'PUT'].includes(req.method) && req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
});

// Simple in-memory rate limiter for auth endpoints
const rateLimitStore = new Map();
function rateLimit(maxRequests, windowMs) {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const key = `${ip}:${req.path}`;
    const now = Date.now();
    const entry = rateLimitStore.get(key);
    if (!entry || now - entry.resetAt > windowMs) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count++;
    if (entry.count > maxRequests) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    next();
  };
}
// Clean stale entries every 5 min
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now - entry.resetAt > 60000) rateLimitStore.delete(key);
  }
}, 300000).unref();

// General rate limit for all /api routes: 120 requests/min per IP
app.use('/api', rateLimit(120, 60000));
// Stricter limits for sensitive endpoints (overrides the general limit since they're registered after)
app.use('/api/auth', rateLimit(20, 60000));
app.use('/api/admin', rateLimit(60, 60000));
app.use('/api/channels', rateLimit(30, 60000));
app.use('/api/users', rateLimit(30, 60000));
app.use('/api/roles', rateLimit(30, 60000));

// Global auth + tenant scoping for all /api routes (except auth, webhook, oauth callbacks)
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth/') || req.path.startsWith('/webhook/') || req.path.includes('/callback')) return next();
  authenticateToken(req, res, next);
});
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth/') || req.path.startsWith('/webhook/') || req.path.includes('/callback')) return next();
  loadUserPermissions(req, res, next);
});
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth/') || req.path.startsWith('/webhook/') || req.path.includes('/callback')) return next();
  routeAuthorize(req, res, next);
});
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth/') || req.path.startsWith('/webhook/') || req.path.includes('/callback')) return next();
  if (['POST', 'PATCH', 'PUT'].includes(req.method)) validateBody(req, res, next);
  else next();
});
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth/') || req.path.startsWith('/webhook/') || req.path.includes('/callback')) return next();
  scopeToTenant(req, res, next);
});

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_JWT_SECRET = process.env.REFRESH_JWT_SECRET || process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET must be set to a strong random value (min 32 chars) in production');
  if (process.env.NODE_ENV === 'production') process.exit(1);
}
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

// --- Helpers ---

function signAccessToken(userPayload) {
  return jwt.sign(userPayload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY, algorithm: 'HS256' });
}

function signRefreshToken(userPayload) {
  return jwt.sign(userPayload, REFRESH_JWT_SECRET, { expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d`, algorithm: 'HS256' });
}

// JWT auth middleware (access token)
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }, (err, user) => {
    if (err) return res.status(401).json({ error: 'Invalid or expired token', code: 'TOKEN_EXPIRED' });
    req.user = user;
    next();
  });
}

// RBAC: check permission (module:action). Call after authenticateToken.
function authorize(...requiredPermissions) {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    // Admin bypass if role_id === 1
    if (req.user.role_id === 1) return next();
    if (!req.user.permissions || req.user.permissions.length === 0) {
      return res.status(403).json({ error: 'Forbidden: no permissions' });
    }
    const hasAll = requiredPermissions.every(p => req.user.permissions.includes(p));
    if (!hasAll) return res.status(403).json({ error: `Forbidden: missing ${requiredPermissions.join(', ')}` });
    next();
  };
}

// Load user role + permissions into req.user (call after authenticateToken)
async function loadUserPermissions(req, res, next) {
  try {
    const permResult = await pool.query(`
      SELECT DISTINCT p.module || ':' || p.action AS perm
      FROM users u
      JOIN role_permissions rp ON u.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE u.id = $1
    `, [req.user.sub]);
    const basePerms = permResult.rows.map(r => r.perm);

    // Apply overrides
    const overrideResult = await pool.query(`
      SELECT p.module || ':' || p.action AS perm, upo.effect
      FROM user_permissions_override upo
      JOIN permissions p ON upo.permission_id = p.id
      WHERE upo.user_id = $1
    `, [req.user.sub]);

    overrideResult.rows.forEach(o => {
      if (o.effect === 'deny') {
        const idx = basePerms.indexOf(o.perm);
        if (idx > -1) basePerms.splice(idx, 1);
      } else if (o.effect === 'allow' && !basePerms.includes(o.perm)) {
        basePerms.push(o.perm);
      }
    });

    req.user.permissions = basePerms;
    next();
  } catch (err) {
    console.error('Failed to load permissions:', err.message);
    req.user.permissions = [];
    next();
  }
}

// --- Auth Routes ---

// Shared: return { accessToken, refreshToken, user }
function issueTokens(user) {
  const userPayload = { sub: user.id, name: user.name, email: user.email, picture: user.avatar, provider: user.provider, role_id: user.role_id, tenant_id: user.tenant_id || null };
  const accessToken = signAccessToken(userPayload);
  const refreshToken = signRefreshToken(userPayload);
  // Store refresh token in DB (for revocation)
  pool.query(
    `INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL '${REFRESH_TOKEN_EXPIRY_DAYS} days') ON CONFLICT DO NOTHING`,
    [refreshToken, user.id]
  ).catch(err => console.error('Failed to store refresh token:', err.message));
  return { accessToken, refreshToken, user };
}

// Helper: resolve tenant filter params — Super Admin sees all, regular users scoped
function tenantFilter(req) {
  const isSuperAdmin = req.user?.role_id === 1;
  const tenantId = req.tenantId || req.user?.tenant_id || '';
  if (isSuperAdmin && !tenantId) return { clause: '', params: [] };
  return { clause: 'tenant_id = $1', params: [tenantId] };
}

// Helper: write audit log entry
async function auditLog(userId, tenantId, action, targetType, targetId, details = {}) {
  try {
    await pool.query(
      `INSERT INTO audit_log (user_id, tenant_id, action, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, tenantId || '', action, targetType, targetId, JSON.stringify(details)]
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

// Helper: ensure user exists in `users` table, return full user + role_id
async function ensureUser(user) {
  try {
    // ── Step 1: Look up existing account by email (cross-provider linking) ──
    // If a user signs in via LINE/Facebook with the same email as their Google account,
    // we reuse the existing user record instead of creating a duplicate.
    const existing = await pool.query(
      `SELECT id, tenant_id, role_id, provider FROM users WHERE email = $1 ORDER BY created_at ASC LIMIT 1`,
      [user.email]
    ).catch(() => ({ rows: [] }));

    const isLinking = existing.rows.length > 0 && existing.rows[0].id !== user.id;
    const isSameProvider = existing.rows.length > 0 && existing.rows[0].id === user.id;

    if (existing.rows.length > 0) {
      // Use the canonical (oldest/primary) account's ID and settings
      user.id = existing.rows[0].id;
      user.tenant_id = user.tenant_id || existing.rows[0].tenant_id;
      if (!user.role_id) user.role_id = existing.rows[0].role_id;
    } else {
      // ── INVITE-ONLY: reject any user not pre-registered in the system ──
      // Only users that have been invited (pre-created in the users table) can log in.
      // Super Admin (admin-primary) is always pre-seeded so this never blocks them.
      const notInvited = new Error('Access denied: You have not been invited to use this system.');
      notInvited.code = 'NOT_INVITED';
      throw notInvited;
    }

    // ── Step 2: Resolve tenant_id ──
    const isSuperAdmin = user.role_id === 1;
    let tenantId = user.tenant_id || null;
    if (!isSuperAdmin && !tenantId) {
      const tRes = await pool.query('SELECT id FROM tenant_companies WHERE slug = $1 LIMIT 1', ['relateflows-demo']);
      if (tRes.rows.length > 0) tenantId = tRes.rows[0].id;
    }
    const roleId = user.role_id || null;

    if (isLinking) {
      // ── Account Linking: email matched a different provider's account ──
      // Only update name/avatar. Keep the original provider as-is.
      // Log the linked provider for tracking.
      console.log(`[Auth] Account linking: ${user.provider} → existing account ${user.id} (primary provider: ${existing.rows[0].provider})`);
      await pool.query(`
        UPDATE users SET
          name   = COALESCE(NULLIF($2, ''), name),
          avatar = COALESCE(NULLIF($3, ''), avatar),
          updated_at = NOW()
        WHERE id = $1
      `, [user.id, user.name, user.avatar]);
    } else {
      // ── Normal upsert: same provider re-login or brand new user ──
      await pool.query(`
        INSERT INTO users (id, name, email, avatar, provider, role_id, tenant_id, status)
        VALUES ($1, $2, $3, $4, $5, COALESCE($7::int, (SELECT id FROM roles WHERE name LIKE '%Sales Rep%' LIMIT 1), 5), $6, 'active')
        ON CONFLICT (id) DO UPDATE SET
          name       = EXCLUDED.name,
          email      = EXCLUDED.email,
          avatar     = EXCLUDED.avatar,
          provider   = EXCLUDED.provider,
          role_id    = COALESCE($7::int, users.role_id, (SELECT id FROM roles WHERE name LIKE '%Sales Rep%' LIMIT 1), 5),
          tenant_id  = CASE WHEN $7::int = 1 THEN NULL ELSE COALESCE(users.tenant_id, EXCLUDED.tenant_id) END,
          updated_at = NOW()
      `, [user.id, user.name, user.email, user.avatar, user.provider, tenantId, roleId]);
    }

    // ── Step 3: Sync user_tenants mapping ──
    if (tenantId) {
      await pool.query(`
        INSERT INTO user_tenants (user_id, tenant_id, is_default, role_id)
        VALUES ($1, $2, TRUE, $3)
        ON CONFLICT (user_id, tenant_id) DO UPDATE SET
          is_default = TRUE,
          role_id    = COALESCE($3, user_tenants.role_id)
      `, [user.id, tenantId, roleId]).catch(() => {});
    }

    const result = await pool.query(
      'SELECT u.*, r.name AS role_name FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = $1',
      [user.id]
    );
    return result.rows[0] || user;
  } catch (err) {
    // Re-throw invite-only errors so the auth endpoints can return 403
    if (err.code === 'NOT_INVITED') throw err;
    console.error('Failed to ensure user:', err.message);
    throw err;
  }
}

// POST /api/auth/google
app.post('/api/auth/google', async (req, res) => {
  const { credential, access_token } = req.body;
  if (!credential && !access_token) return res.status(400).json({ error: 'Missing credential or access_token' });
  try {
    if (!GOOGLE_CLIENT_ID) {
      return res.status(400).json({ error: 'Google authentication not configured on server' });
    }
    let user;
    if (access_token) {
      // Implicit flow: exchange access_token for user profile via Google userinfo endpoint
      const infoRes = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (!infoRes.ok) return res.status(401).json({ error: 'Invalid Google access_token' });
      const payload = await infoRes.json();
      user = {
        id: payload.sub,
        name: payload.name || 'Google User',
        email: payload.email || '',
        avatar: payload.picture || '',
        provider: 'google',
      };
    } else {
      // One Tap / credential flow: verify id_token
      const ticket = await googleOAuthClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.sub) {
        return res.status(401).json({ error: 'Invalid Google credential' });
      }
      user = {
        id: payload.sub,
        name: payload.name || 'Google User',
        email: payload.email || '',
        avatar: payload.picture || '',
        provider: 'google',
      };
    }
    const fullUser = await ensureUser(user);
    res.json(issueTokens(fullUser));
  } catch (err) {
    if (err.code === 'NOT_INVITED') {
      return res.status(403).json({ error: 'not_invited', message: 'คุณยังไม่ได้รับการเชิญเข้าใช้งานระบบ กรุณาติดต่อผู้ดูแลระบบ' });
    }
    console.error('Google auth error:', err);
    res.status(401).json({ error: 'Invalid Google credential' });
  }
});

// POST /api/auth/line
app.post('/api/auth/line', async (req, res) => {
  const { code, redirect_uri } = req.body;
  if (!code) return res.status(400).json({ error: 'Missing LINE authorization code' });
  const lineChannelId = process.env.VITE_LINE_CLIENT_ID || '';
  const lineChannelSecret = process.env.LINE_CHANNEL_SECRET || '';
  if (!lineChannelId || !lineChannelSecret) {
    return res.status(400).json({ error: 'LINE authentication not configured on server' });
  }
  // redirect_uri MUST exactly match what is registered in LINE Developers Console
  // and what was used when initiating the OAuth flow
  const callbackUri = redirect_uri || req.headers.origin || '';
  try {
    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: callbackUri,
        client_id: lineChannelId,
        client_secret: lineChannelSecret,
      }),
    });
    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error('LINE token exchange error:', errBody);
      return res.status(401).json({ error: 'LINE token exchange failed', detail: errBody });
    }
    const tokenData = await tokenRes.json();
    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!profileRes.ok) {
      return res.status(401).json({ error: 'Failed to fetch LINE profile' });
    }
    const profile = await profileRes.json();
    const user = {
      id: `line-${profile.userId}`,
      name: profile.displayName || 'LINE User',
      email: '',
      avatar: profile.pictureUrl || '',
      provider: 'line',
    };
    const fullUser = await ensureUser(user);
    res.json(issueTokens(fullUser));
  } catch (err) {
    if (err.code === 'NOT_INVITED') {
      return res.status(403).json({ error: 'not_invited', message: 'คุณยังไม่ได้รับการเชิญเข้าใช้งานระบบ กรุณาติดต่อผู้ดูแลระบบ' });
    }
    console.error('LINE auth error:', err);
    res.status(401).json({ error: 'LINE authentication failed' });
  }
});

// POST /api/auth/facebook
app.post('/api/auth/facebook', async (req, res) => {
  const { accessToken } = req.body;
  if (!accessToken) return res.status(400).json({ error: 'Missing Facebook access token' });
  const fbAppId = process.env.VITE_FACEBOOK_APP_ID || process.env.FB_APP_ID || '';
  const fbAppSecret = process.env.FB_APP_SECRET || '';
  if (!fbAppId || !fbAppSecret) {
    return res.status(400).json({ error: 'Facebook authentication not configured on server' });
  }
  try {
    const verifyRes = await fetch(`https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${fbAppId}|${fbAppSecret}`);
    const verifyData = await verifyRes.json();
    if (!verifyData.data || !verifyData.data.is_valid) {
      return res.status(401).json({ error: 'Invalid Facebook access token' });
    }
    const userId = verifyData.data.user_id;
    const profileRes = await fetch(`https://graph.facebook.com/v22.0/me?fields=id,name,email,picture&access_token=${accessToken}`);
    if (!profileRes.ok) {
      return res.status(401).json({ error: 'Failed to fetch Facebook profile' });
    }
    const profile = await profileRes.json();
    const user = {
      id: `fb-${profile.id}`,
      name: profile.name || 'Facebook User',
      email: profile.email || '',
      avatar: profile.picture?.data?.url || '',
      provider: 'facebook',
    };
    const fullUser = await ensureUser(user);
    res.json(issueTokens(fullUser));
  } catch (err) {
    if (err.code === 'NOT_INVITED') {
      return res.status(403).json({ error: 'not_invited', message: 'คุณยังไม่ได้รับการเชิญเข้าใช้งานระบบ กรุณาติดต่อผู้ดูแลระบบ' });
    }
    console.error('Facebook auth error:', err);
    res.status(401).json({ error: 'Facebook authentication failed' });
  }
});

const DEMO_USERS = {
  super:     { id: 'demo-super-001',   name: 'Daisuke Yamamoto (Super Admin)',   email: 'daisuke@relateflows.com',       avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80', provider: 'google', role_id: 1, tenant_id: null },
  admin:     { id: 'demo-admin-001',    name: 'Sarah Connor (Administrator)',     email: 'sarah.connor@relateflows.com',  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', provider: 'google', role_id: 2, tenant_id: 'tenant-default-001' },
  manager:   { id: 'demo-mgr-001',     name: 'Alex Rivera (Manager)',            email: 'alex.rivera@relateflows.com',   avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', provider: 'google', role_id: 3, tenant_id: 'tenant-default-001' },
  cs_admin:  { id: 'demo-csadmin-001', name: 'Kenji Tanaka (CS Admin)',          email: 'kenji.tanaka@relateflows.com',  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80', provider: 'google', role_id: 4, tenant_id: 'tenant-default-001' },
  sales:     { id: 'demo-sales-001',   name: 'Marcus Brody (Sales Rep)',         email: 'marcus.brody@relateflows.com',  avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', provider: 'google', role_id: 5, tenant_id: 'tenant-default-001' },
};

// POST /api/auth/demo — demo login for any role (disabled in production, unless DEMO_MODE=enabled)
app.post('/api/auth/demo', async (req, res) => {
  if (process.env.NODE_ENV === 'production' && process.env.DEMO_MODE !== 'enabled') {
    return res.status(403).json({ error: 'Demo mode is disabled in production' });
  }
  const validRoles = ['super', 'admin', 'manager', 'cs_admin', 'sales'];
  const { role } = req.body;
  if (!validRoles.includes(role)) return res.status(400).json({ error: 'Invalid role. Use: ' + validRoles.join(', ') });
  try {
    const demoUser = DEMO_USERS[role];
    const fullUser = await ensureUser(demoUser);
    res.json(issueTokens(fullUser));
  } catch (err) {
    console.error('Demo login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/refresh — exchange refresh token for new access token
app.post('/api/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Missing refresh token' });

  // Verify the refresh token signature
  jwt.verify(refreshToken, REFRESH_JWT_SECRET, { algorithms: ['HS256'] }, (err, userPayload) => {
    if (err) return res.status(401).json({ error: 'Invalid or expired refresh token', code: 'REFRESH_EXPIRED' });

    // Check it exists & hasn't been revoked in DB
    pool.query('SELECT id FROM refresh_tokens WHERE token = $1 AND revoked = false AND expires_at > NOW()', [refreshToken])
      .then(result => {
        if (result.rows.length === 0) {
          return res.status(401).json({ error: 'Refresh token revoked or expired', code: 'REFRESH_EXPIRED' });
        }
        // Issue new tokens (rotate: old refresh token is revoked)
        pool.query('UPDATE refresh_tokens SET revoked = true WHERE token = $1', [refreshToken]).catch(() => {});
        const user = {
          id: userPayload.sub,
          name: userPayload.name,
          email: userPayload.email,
          avatar: userPayload.picture || '',
          provider: userPayload.provider,
          role_id: userPayload.role_id,
        };
        res.json(issueTokens(user));
      })
      .catch(() => {
        // DB unavailable — fallback: issue tokens without rotation
        const user = {
          id: userPayload.sub,
          name: userPayload.name,
          email: userPayload.email,
          avatar: userPayload.picture || '',
          provider: userPayload.provider,
          role_id: userPayload.role_id,
        };
        res.json(issueTokens(user));
      });
  });
});

// POST /api/auth/logout — revoke refresh token
app.post('/api/auth/logout', (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    pool.query('UPDATE refresh_tokens SET revoked = true WHERE token = $1', [refreshToken]).catch(() => {});
  }
  res.json({ message: 'Logged out' });
});

// GET /api/auth/me — verify token & return user (camelCase for frontend)
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({
    id: req.user.sub,
    name: req.user.name,
    email: req.user.email,
    avatar: req.user.picture || '',
    provider: req.user.provider,
    roleId: req.user.role_id,
    isAdmin: req.user.role_id === 1,
    tenantId: req.user.tenant_id,
  });
});

// GET /api/auth/user-tenants — list tenants the current user can access
app.get('/api/auth/user-tenants', authenticateToken, async (req, res) => {
  try {
    const isSuperAdmin = req.user.role_id === 1;
    if (isSuperAdmin) {
      const result = await pool.query('SELECT id, name, slug, status FROM tenant_companies ORDER BY name');
      return res.json(result.rows.map(t => ({ tenantId: t.id, name: t.name, slug: t.slug, status: t.status, isDefault: t.id === req.user.tenant_id })));
    }
    const result = await pool.query(`
      SELECT tc.id, tc.name, tc.slug, tc.status, ut.is_default AS "isDefault"
      FROM user_tenants ut
      JOIN tenant_companies tc ON ut.tenant_id = tc.id
      WHERE ut.user_id = $1
      ORDER BY ut.is_default DESC, tc.name
    `, [req.user.sub]);
    res.json(result.rows.map(t => ({ tenantId: t.id, name: t.name, slug: t.slug, status: t.status, isDefault: t.isDefault })));
  } catch (err) {
    console.error('Error fetching user tenants:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/switch-tenant — switch active tenant, returns new tokens
app.post('/api/auth/switch-tenant', authenticateToken, async (req, res) => {
  try {
    const { tenantId } = req.body;
    if (!tenantId) return res.status(400).json({ error: 'Missing tenantId' });
    // Verify user has access to this tenant
    const isSuperAdmin = req.user.role_id === 1;
    if (!isSuperAdmin) {
      const access = await pool.query('SELECT 1 FROM user_tenants WHERE user_id = $1 AND tenant_id = $2', [req.user.sub, tenantId]);
      if (access.rows.length === 0) return res.status(403).json({ error: 'Access denied to this tenant' });
    }
    const tenantRes = await pool.query('SELECT id, name, status FROM tenant_companies WHERE id = $1', [tenantId]);
    if (tenantRes.rows.length === 0) return res.status(404).json({ error: 'Tenant not found' });
    if (tenantRes.rows[0].status !== 'active') return res.status(403).json({ error: 'Tenant is not active' });
    // Get the user's role for this tenant
    let roleId = req.user.role_id;
    if (!isSuperAdmin) {
      const roleRes = await pool.query('SELECT role_id FROM user_tenants WHERE user_id = $1 AND tenant_id = $2', [req.user.sub, tenantId]);
      if (roleRes.rows.length > 0 && roleRes.rows[0].role_id) {
        roleId = roleRes.rows[0].role_id;
      }
    }
    // Issue new tokens with updated tenant_id and role_id
    const userPayload = {
      sub: req.user.sub,
      name: req.user.name,
      email: req.user.email,
      picture: req.user.picture,
      provider: req.user.provider,
      tenant_id: tenantId,
      role_id: roleId,
      permissions: req.user.permissions || [],
    };
    const accessToken = signAccessToken(userPayload);
    const refreshToken = signRefreshToken(userPayload);
    await pool.query(
      'INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\') ON CONFLICT DO NOTHING',
      [refreshToken, req.user.sub]
    ).catch(() => {});
    res.json({ accessToken, refreshToken, tenantId, tenantName: tenantRes.rows[0].name });
  } catch (err) {
    console.error('Error switching tenant:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Tenant / Company Admin Routes (Super Admin only) ---

async function requireSuperAdmin(req, res, next) {
  if (!req.user || req.user.role_id !== 1) {
    return res.status(403).json({ error: 'Super Admin access required' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || (req.user.role_id !== 1 && req.user.role_id !== 2)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// GET /api/admin/tenants — list all companies
app.get('/api/admin/tenants', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, slug, logo_url, domain, brand_color_primary, brand_color_secondary, status, created_at, updated_at FROM tenant_companies ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('Error listing tenants:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/tenants — create a new company + initialize default data
app.post('/api/admin/tenants', authenticateToken, requireSuperAdmin, async (req, res) => {
  const { name, slug, domain } = req.body;
  if (!name || !slug) {
    return res.status(400).json({ error: 'Company name and slug are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tenantId = `tenant-${slug}`;
    const now = new Date().toISOString();
    const creatorId = req.user.sub;

    // 1. Find or create enterprise account for the creator
    let eaId = `enterprise-${slug}`;
    const existingEa = await client.query(
      `SELECT ea.id FROM enterprise_accounts ea
       JOIN tenant_companies tc ON tc.enterprise_account_id = ea.id
       WHERE tc.id = $1`,
      [req.user.tenant_id]
    );
    if (existingEa.rows.length > 0) {
      eaId = existingEa.rows[0].id;
    } else {
      await client.query(
        `INSERT INTO enterprise_accounts (id, name, email, billing_plan, status)
         VALUES ($1, $2, $3, 'enterprise', 'active')
         ON CONFLICT (id) DO NOTHING`,
        [eaId, `${name} Enterprise`, '']
      );
    }

    // 2. Create the company linked to enterprise
    await client.query(
      `INSERT INTO tenant_companies (id, name, slug, domain, enterprise_account_id, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'active', $6, $6)
       ON CONFLICT (id) DO NOTHING`,
      [tenantId, name, slug, domain || '', eaId, now]
    );

    // 3. Grant the creator access to the new tenant
    const creatorRole = await client.query(
      'SELECT id FROM roles WHERE name LIKE $1 LIMIT 1',
      ['%Admin%']
    );
    const adminRoleId = creatorRole.rows[0]?.id || 2;
    await client.query(
      `INSERT INTO user_tenants (user_id, tenant_id, is_default, role_id)
       VALUES ($1, $2, FALSE, $3)
       ON CONFLICT (user_id, tenant_id) DO NOTHING`,
      [creatorId, tenantId, adminRoleId]
    );

    // 4. Seed default customer_tags
    const defaultTags = [
      ['สอบถามข้อมูล', '#3b82f6'],
      ['ต้องการใบเสนอราคา', '#f59e0b'],
      ['นัดดูห้อง', '#10b981'],
      ['ต่อรองราคา', '#ef4444'],
      ['ลูกค้าใหม่', '#8b5cf6'],
      ['ลูกค้าเก่า', '#ec4899'],
      ['สนใจโครงการอื่น', '#06b6d4'],
      ['ต้องการสัญญา', '#84cc16'],
    ];
    for (const [tagName, color] of defaultTags) {
      await client.query(
        'INSERT INTO customer_tags (name, color, tenant_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [tagName, color, tenantId]
      );
    }

    // 5. Create default product categories
    await client.query(
      "INSERT INTO tb_categories (name, description, tenant_id) VALUES ('ทั่วไป', 'สินค้าทั่วไป', $1) ON CONFLICT DO NOTHING",
      [tenantId]
    );

    await client.query('COMMIT');
    res.status(201).json({ id: tenantId, name, slug, domain: domain || '', status: 'active' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating tenant:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// PUT /api/admin/tenants/:id — update an existing company
app.put('/api/admin/tenants/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, slug, domain, status } = req.body;
  if (!name || !slug) {
    return res.status(400).json({ error: 'Company name and slug are required' });
  }
  try {
    const { rowCount } = await pool.query(
      `UPDATE tenant_companies 
       SET name = $1, slug = $2, domain = $3, status = $4, updated_at = NOW() 
       WHERE id = $5`,
      [name, slug, domain || '', status || 'active', id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    res.json({ message: 'Company updated successfully' });
  } catch (err) {
    console.error('Error updating tenant:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/tenants/:id — delete a company (soft or hard)
app.delete('/api/admin/tenants/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const { type } = req.query; // 'soft' (deactivate/suspend) or 'hard' (delete permanently)
  try {
    if (type === 'hard') {
      const { rowCount } = await pool.query('DELETE FROM tenant_companies WHERE id = $1', [id]);
      if (rowCount === 0) {
        return res.status(404).json({ error: 'Company not found' });
      }
      res.json({ message: 'Company permanently deleted' });
    } else {
      // Default is soft delete: update status to 'suspended'
      const { rowCount } = await pool.query(
        "UPDATE tenant_companies SET status = 'suspended', updated_at = NOW() WHERE id = $1",
        [id]
      );
      if (rowCount === 0) {
        return res.status(404).json({ error: 'Company not found' });
      }
      res.json({ message: 'Company deactivated successfully (soft deleted)' });
    }
  } catch (err) {
    console.error('Error deleting/deactivating tenant:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// --- Category Routes (tb_categories) ---

app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tb_categories ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const { name, description } = req.body;
    const tenantId = req.tenantId || req.user?.tenant_id || '';
    const result = await pool.query(
      'INSERT INTO tb_categories (name, description, tenant_id) VALUES ($1, $2, $3) RETURNING *',
      [name, description || '', tenantId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const result = await pool.query(
      'UPDATE tb_categories SET name = COALESCE($1, name), description = COALESCE($2, description) WHERE id = $3 RETURNING *',
      [name, description, parseInt(id, 10)]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Category not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating category:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM tb_categories WHERE id = $1 RETURNING id', [parseInt(id, 10)]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Category not found' });
    res.json({ message: 'Category deleted', id: parseInt(id, 10) });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Product Routes (tb_products) ---

app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tb_products ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { leadId, categoryId, name, quantity, price, description, notes, status } = req.body;
    const tenantId = req.tenantId || req.user?.tenant_id || '';
    const result = await pool.query(
      `INSERT INTO tb_products (lead_id, category_id, name, quantity, price, description, notes, status, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [leadId, categoryId || null, name, quantity || 1, price || 0, description || '', notes || '', status || 'pending', tenantId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { leadId, categoryId, name, quantity, price, description, notes, status } = req.body;
    const result = await pool.query(
      `UPDATE tb_products SET
        lead_id = COALESCE($1, lead_id),
        category_id = COALESCE($2, category_id),
        name = COALESCE($3, name),
        quantity = COALESCE($4, quantity),
        price = COALESCE($5, price),
        description = COALESCE($6, description),
        notes = COALESCE($7, notes),
        status = COALESCE($8, status),
        updated_at = NOW()
       WHERE id = $9 RETURNING *`,
      [leadId, categoryId, name, quantity, price, description, notes, status, parseInt(id, 10)]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM tb_products WHERE id = $1 RETURNING id', [parseInt(id, 10)]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted', id: parseInt(id, 10) });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Appointment Routes (tb_appointments) ---

app.get('/api/appointments', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tb_appointments ORDER BY start_time DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching appointments:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/appointments', async (req, res) => {
  try {
    const { leadId, title, description, startTime, endTime, type, status, location, guests } = req.body;
    const tenantId = req.tenantId || req.user?.tenant_id || '';
    const result = await pool.query(
      `INSERT INTO tb_appointments (lead_id, title, description, start_time, end_time, type, status, location, created_by, guests, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11)
       RETURNING *`,
      [leadId, title, description || '', startTime, endTime, type || 'meeting', status || 'scheduled', location || '', req.user?.sub || '', JSON.stringify(guests || []), tenantId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating appointment:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/appointments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, startTime, endTime, type, status, location, guests } = req.body;
    const result = await pool.query(
      `UPDATE tb_appointments SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        start_time = COALESCE($3, start_time),
        end_time = COALESCE($4, end_time),
        type = COALESCE($5, type),
        status = COALESCE($6, status),
        location = COALESCE($7, location),
        guests = COALESCE($8::jsonb, guests),
        updated_at = NOW()
       WHERE id = $9 RETURNING *`,
      [
        title, 
        description, 
        startTime, 
        endTime, 
        type, 
        status, 
        location, 
        guests ? JSON.stringify(guests) : null,
        parseInt(id, 10)
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Appointment not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating appointment:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/appointments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM tb_appointments WHERE id = $1 RETURNING id', [parseInt(id, 10)]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Appointment not found' });
    res.json({ message: 'Appointment deleted', id: parseInt(id, 10) });
  } catch (err) {
    console.error('Error deleting appointment:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Google Calendar Routes ---

// GET /api/calendar/auth-url — returns the Google OAuth URL for Calendar scopes
app.get('/api/calendar/auth-url', (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(400).json({ error: 'Google Calendar not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.' });
  }
  const url = googleOAuthClient.generateAuthUrl({
    access_type: 'offline',
    scope: CALENDAR_SCOPES,
    prompt: 'consent',
    state: req.user.sub,
  });
  res.json({ url });
});

// POST /api/calendar/callback — exchange auth code for tokens
app.post('/api/calendar/callback', authenticateToken, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Missing authorization code' });
  try {
    const { tokens } = await googleOAuthClient.getToken(code);
    const tenantId = req.tenantId || req.user?.tenant_id || '';
    await pool.query(
      `INSERT INTO google_calendar_tokens (user_id, access_token, refresh_token, scope, token_type, expiry_date, connected, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, true, $7)
       ON CONFLICT (user_id) DO UPDATE SET
         access_token = EXCLUDED.access_token,
         refresh_token = COALESCE(EXCLUDED.refresh_token, google_calendar_tokens.refresh_token),
         scope = EXCLUDED.scope,
         token_type = EXCLUDED.token_type,
         expiry_date = EXCLUDED.expiry_date,
         connected = true,
         updated_at = NOW()`,
      [req.user.sub, tokens.access_token, tokens.refresh_token || '', tokens.scope || '', tokens.token_type || 'Bearer', tokens.expiry_date || 0, tenantId]
    );
    res.json({ connected: true });
  } catch (err) {
    console.error('Google Calendar callback error:', err);
    res.status(500).json({ error: 'Failed to exchange authorization code' });
  }
});

// GET /api/calendar/status — check if user is connected to Google Calendar
app.get('/api/calendar/status', async (req, res) => {
  try {
    const result = await pool.query('SELECT connected, calendar_id FROM google_calendar_tokens WHERE user_id = $1', [req.user.sub]);
    if (result.rows.length === 0) return res.json({ connected: false });
    res.json({ connected: result.rows[0].connected, calendarId: result.rows[0].calendar_id });
  } catch (err) {
    console.error('Error checking calendar status:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper: get fresh Google access token for a user
async function getGoogleAccessToken(userId) {
  const result = await pool.query('SELECT * FROM google_calendar_tokens WHERE user_id = $1 AND connected = true', [userId]);
  if (result.rows.length === 0) return null;
  const tokenData = result.rows[0];
  googleOAuthClient.setCredentials({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expiry_date: tokenData.expiry_date,
  });
  // Refresh if expired
  if (Date.now() >= tokenData.expiry_date) {
    try {
      const { credentials } = await googleOAuthClient.refreshAccessToken();
      await pool.query(
        'UPDATE google_calendar_tokens SET access_token = $1, expiry_date = $2, updated_at = NOW() WHERE user_id = $3',
        [credentials.access_token, credentials.expiry_date, userId]
      );
      return credentials.access_token;
    } catch (err) {
      console.error('Failed to refresh Google token:', err);
      await pool.query('UPDATE google_calendar_tokens SET connected = false WHERE user_id = $1', [userId]);
      return null;
    }
  }
  return tokenData.access_token;
}

// Helper: make Google Calendar API request
async function callGoogleCalendar(userId, method, path, body = null) {
  const accessToken = await getGoogleAccessToken(userId);
  if (!accessToken) throw new Error('Not connected to Google Calendar');
  const url = `https://www.googleapis.com/calendar/v3${path}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) options.body = JSON.stringify(body);
  const response = await fetch(url, options);
  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Google Calendar API error: ${response.status} ${errBody}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

// POST /api/calendar/events — create event in Google Calendar
app.post('/api/calendar/events', async (req, res) => {
  try {
    const { summary, description, startTime, endTime, location, guests } = req.body;
    const event = {
      summary,
      description: description || '',
      start: { dateTime: new Date(startTime).toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      end: { dateTime: new Date(endTime).toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    };
    if (location) event.location = location;
    if (guests && guests.length > 0) {
      event.attendees = guests.map((email) => ({ email }));
    }
    const calResult = await pool.query('SELECT calendar_id FROM google_calendar_tokens WHERE user_id = $1', [req.user.sub]);
    const calendarId = calResult.rows[0]?.calendar_id || 'primary';
    const data = await callGoogleCalendar(req.user.sub, 'POST', `/calendars/${encodeURIComponent(calendarId)}/events`, event);
    res.status(201).json({ googleEventId: data.id, htmlLink: data.htmlLink });
  } catch (err) {
    console.error('Error creating Google Calendar event:', err);
    res.status(500).json({ error: 'Failed to create Google Calendar event' });
  }
});

// PATCH /api/calendar/events/:googleEventId — update event in Google Calendar
app.patch('/api/calendar/events/:googleEventId', async (req, res) => {
  try {
    const { summary, description, startTime, endTime, location, guests } = req.body;
    const { googleEventId } = req.params;
    const event = {};
    if (summary !== undefined) event.summary = summary;
    if (description !== undefined) event.description = description;
    if (startTime) event.start = { dateTime: new Date(startTime).toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
    if (endTime) event.end = { dateTime: new Date(endTime).toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
    if (location !== undefined) event.location = location;
    if (guests) {
      event.attendees = guests.map((g) => ({ email: g }));
    }
    const calResult = await pool.query('SELECT calendar_id FROM google_calendar_tokens WHERE user_id = $1', [req.user.sub]);
    const calendarId = calResult.rows[0]?.calendar_id || 'primary';
    const data = await callGoogleCalendar(req.user.sub, 'PATCH', `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`, event);
    res.json({ googleEventId: data.id, htmlLink: data.htmlLink });
  } catch (err) {
    console.error('Error updating Google Calendar event:', err);
    res.status(500).json({ error: 'Failed to update Google Calendar event' });
  }
});

// DELETE /api/calendar/events/:googleEventId — delete event from Google Calendar
app.delete('/api/calendar/events/:googleEventId', async (req, res) => {
  try {
    const { googleEventId } = req.params;
    const calResult = await pool.query('SELECT calendar_id FROM google_calendar_tokens WHERE user_id = $1', [req.user.sub]);
    const calendarId = calResult.rows[0]?.calendar_id || 'primary';
    await callGoogleCalendar(req.user.sub, 'DELETE', `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`);
    res.json({ deleted: true });
  } catch (err) {
    console.error('Error deleting Google Calendar event:', err);
    res.status(500).json({ error: "Failed to process request" });
  }
});

// GET /api/calendar/events — list events from Google Calendar (optionally synced to app)
app.get('/api/calendar/events', async (req, res) => {
  try {
    const calResult = await pool.query('SELECT calendar_id FROM google_calendar_tokens WHERE user_id = $1', [req.user.sub]);
    if (calResult.rows.length === 0) return res.status(400).json({ error: 'Not connected' });
    const calendarId = calResult.rows[0]?.calendar_id || 'primary';
    const now = new Date();
    const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const timeMax = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59).toISOString();
    const params = `?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`;
    const data = await callGoogleCalendar(req.user.sub, 'GET', `/calendars/${encodeURIComponent(calendarId)}/events${params}`);
    res.json(data.items || []);
  } catch (err) {
    console.error('Error listing Google Calendar events:', err);
    res.status(500).json({ error: "Failed to process request" });
  }
});

// PATCH /api/calendar/calendar — update calendar id
app.patch('/api/calendar/calendar', async (req, res) => {
  try {
    const { calendarId } = req.body;
    await pool.query('UPDATE google_calendar_tokens SET calendar_id = $1, updated_at = NOW() WHERE user_id = $2', [calendarId, req.user.sub]);
    res.json({ calendarId });
  } catch (err) {
    console.error('Error updating calendar id:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/calendar/disconnect — disconnect Google Calendar
app.delete('/api/calendar/disconnect', async (req, res) => {
  try {
    await pool.query('UPDATE google_calendar_tokens SET connected = false, updated_at = NOW() WHERE user_id = $1', [req.user.sub]);
    res.json({ connected: false });
  } catch (err) {
    console.error('Error disconnecting calendar:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 1. Deals
app.get('/api/deals', async (req, res) => {
  try {
    const isSA = req.user.role_id === 1;
    const baseQuery = isSA
      ? `SELECT d.id, d.title, d.company, d.value, d.stage, d.probability, d.owner,
               d.lead_source AS "leadSource", d.priority, d.contact_name AS "contactName",
               d.contact_email AS "contactEmail", d.created_at AS "createdAt",
               d.expected_close_date AS "expectedCloseDate", d.notes, d.tags,
               d.tenant_id AS "tenantId", tc.name AS "companyName"
        FROM deals d LEFT JOIN tenant_companies tc ON d.tenant_id = tc.id`
      : `SELECT d.id, d.title, d.company, d.value, d.stage, d.probability, d.owner,
               d.lead_source AS "leadSource", d.priority, d.contact_name AS "contactName",
               d.contact_email AS "contactEmail", d.created_at AS "createdAt",
               d.expected_close_date AS "expectedCloseDate", d.notes, d.tags
        FROM deals d`;
    const { text, params, limit } = keysetPaginate(baseQuery, [], req.query, {
      orderBy: 'd.created_at', tieBreaker: 'd.id', orderDir: 'DESC',
    });
    const result = await pool.query(text, params);
    if (req.query.cursor) {
      const { items, nextCursor } = paginationResult(result.rows, limit, 'created_at', 'id');
      return res.json({ items, nextCursor, hasMore: !!nextCursor });
    }
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching deals:', err);
    res.status(500).json({ error: 'Server error fetching deals' });
  }
});

app.post('/api/deals', async (req, res) => {
  try {
    const { 
      title, company, value, stage, probability, owner, 
      leadSource, priority, contactName, contactEmail, notes, tags, expectedCloseDate 
    } = req.body;
    
    const id = `DEAL-${Math.floor(100 + Math.random() * 900)}`;
    const createdAt = new Date().toISOString().split('T')[0];
    const tenantId = req.tenantId || req.user?.tenant_id || '';
    
    const query = `
      INSERT INTO deals (id, title, company, value, stage, probability, owner, lead_source, priority, contact_name, contact_email, created_at, expected_close_date, notes, tags, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id, title, company, value, stage, probability, owner, lead_source AS "leadSource", priority, contact_name AS "contactName", contact_email AS "contactEmail", created_at AS "createdAt", expected_close_date AS "expectedCloseDate", notes, tags
    `;
    
    const result = await pool.query(query, [
      id, title, company, parseInt(value || 0, 10), stage, parseInt(probability || 0, 10), 
      JSON.stringify(owner || {}), leadSource, priority, contactName, contactEmail, 
      createdAt, expectedCloseDate || '', notes, JSON.stringify(tags || []), tenantId
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating deal:', err);
    res.status(500).json({ error: 'Server error creating deal' });
  }
});

app.patch('/api/deals/:id/stage', async (req, res) => {
  try {
    const { id } = req.params;
    const { stage, probability } = req.body;
    
    const query = `
      UPDATE deals 
      SET stage = $1, probability = $2
      WHERE id = $3
      RETURNING id, title, company, value, stage, probability, owner, lead_source AS "leadSource", priority, contact_name AS "contactName", contact_email AS "contactEmail", created_at AS "createdAt", expected_close_date AS "expectedCloseDate", notes, tags
    `;
    
    const result = await pool.query(query, [stage, parseInt(probability, 10), id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating deal stage:', err);
    res.status(500).json({ error: 'Server error updating deal stage' });
  }
});

app.delete('/api/deals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM deals WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    res.json({ message: 'Deal deleted successfully', id });
  } catch (err) {
    console.error('Error deleting deal:', err);
    res.status(500).json({ error: 'Server error deleting deal' });
  }
});

// 2. Contacts
app.get('/api/contacts', async (req, res) => {
  try {
    const isSA = req.user.role_id === 1;
    const baseQuery = isSA
      ? `SELECT c.id, c.name, c.email, c.phone, c.company, c.role,
               c.lifecycle_stage AS "lifecycleStage", c.lead_score AS "leadScore",
               c.status, c.avatar, c.last_contacted AS "lastContacted",
               c.total_deals_value AS "totalDealsValue", c.tags, c.notes,
               c.tenant_id AS "tenantId", tc.name AS "companyName"
        FROM contacts c LEFT JOIN tenant_companies tc ON c.tenant_id = tc.id`
      : `SELECT c.id, c.name, c.email, c.phone, c.company, c.role,
               c.lifecycle_stage AS "lifecycleStage", c.lead_score AS "leadScore",
               c.status, c.avatar, c.last_contacted AS "lastContacted",
               c.total_deals_value AS "totalDealsValue", c.tags, c.notes
        FROM contacts c`;
    const { text, params, limit } = keysetPaginate(baseQuery, [], req.query, {
      orderBy: 'c.created_at', tieBreaker: 'c.id', orderDir: 'DESC',
    });
    const result = await pool.query(text, params);
    if (req.query.cursor) {
      const { items, nextCursor } = paginationResult(result.rows, limit, 'created_at', 'id');
      return res.json({ items, nextCursor, hasMore: !!nextCursor });
    }
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching contacts:', err);
    res.status(500).json({ error: 'Server error fetching contacts' });
  }
});

app.post('/api/contacts', async (req, res) => {
  try {
    const { name, email, phone, company, role, lifecycleStage, leadScore, status, avatar, tags, notes } = req.body;
    const id = `CNT-${Math.floor(100 + Math.random() * 900)}`;
    const lastContacted = 'Just now';
    const totalDealsValue = 0;
    const tenantId = req.tenantId || req.user?.tenant_id || '';
    
    const query = `
      INSERT INTO contacts (id, name, email, phone, company, role, lifecycle_stage, lead_score, status, avatar, last_contacted, total_deals_value, tags, notes, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id, name, email, phone, company, role, lifecycle_stage AS "lifecycleStage", lead_score AS "leadScore", status, avatar, last_contacted AS "lastContacted", total_deals_value AS "totalDealsValue", tags, notes
    `;
    
    const result = await pool.query(query, [
      id, name, email, phone, company, role, lifecycleStage, parseInt(leadScore || 0, 10), 
      status || 'active', avatar, lastContacted, totalDealsValue, JSON.stringify(tags || []), notes, tenantId
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating contact:', err);
    res.status(500).json({ error: 'Server error creating contact' });
  }
});

app.delete('/api/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM contacts WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.json({ message: 'Contact deleted successfully', id });
  } catch (err) {
    console.error('Error deleting contact:', err);
    res.status(500).json({ error: 'Server error deleting contact' });
  }
});

// 3. Companies
app.get('/api/companies', async (req, res) => {
  try {
    const isSuperAdmin = req.user.role_id === 1;
    const tenantId = isSuperAdmin ? null : (req.user.tenant_id || 'tenant-default-001');
    const result = await pool.query(`
      SELECT id, name, domain, industry, size,
             annual_revenue AS "annualRevenue", location,
             contacts_count AS "contactsCount", total_deals_value AS "totalDealsValue", logo
      FROM companies
      ${tenantId ? 'WHERE tenant_id = $1' : ''}
      ORDER BY id ASC
    `, tenantId ? [tenantId] : []);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching companies:', err);
    res.status(500).json({ error: 'Server error fetching companies' });
  }
});

// 4. Activities
app.get('/api/activities', async (req, res) => {
  try {
    const isSA = req.user.role_id === 1;
    const baseQuery = isSA
      ? `SELECT a.id, a.type, a.title, a.description, a.timestamp, a."user", a.target_name AS "targetName",
               a.tenant_id AS "tenantId", tc.name AS "companyName"
        FROM activities a LEFT JOIN tenant_companies tc ON a.tenant_id = tc.id`
      : `SELECT a.id, a.type, a.title, a.description, a.timestamp, a."user", a.target_name AS "targetName"
        FROM activities a`;
    const { text, params, limit } = keysetPaginate(baseQuery, [], req.query, {
      orderBy: 'a.timestamp', tieBreaker: 'a.id', orderDir: 'DESC',
    });
    const result = await pool.query(text, params);
    if (req.query.cursor) {
      const { items, nextCursor } = paginationResult(result.rows, limit, 'timestamp', 'id');
      return res.json({ items, nextCursor, hasMore: !!nextCursor });
    }
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching activities:', err);
    res.status(500).json({ error: 'Server error fetching activities' });
  }
});

app.post('/api/activities', async (req, res) => {
  try {
    const { type, title, description, user, targetName } = req.body;
    const id = `ACT-${Date.now()}`;
    const timestamp = 'Just now';
    const tenantId = req.tenantId || req.user?.tenant_id || '';
    
    const query = `
      INSERT INTO activities (id, type, title, description, timestamp, "user", target_name, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, type, title, description, timestamp, "user", target_name AS "targetName"
    `;
    
    const result = await pool.query(query, [
      id, type, title, description, timestamp, JSON.stringify(user || {}), targetName || '', tenantId
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating activity:', err);
    res.status(500).json({ error: 'Server error creating activity' });
  }
});

// 5. Workflows
app.get('/api/workflows', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, title, description, trigger_cond AS "trigger", action, status, 
             executions_count AS "executionsCount", last_executed AS "lastExecuted", 
             category, accent_color AS "accentColor" 
      FROM workflows 
      ORDER BY id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching workflows:', err);
    res.status(500).json({ error: 'Server error fetching workflows' });
  }
});

app.post('/api/workflows', async (req, res) => {
  try {
    const { title, description, trigger, action, status, category, accentColor } = req.body;
    const id = `WF-${Math.floor(100 + Math.random() * 900)}`;
    const tenantId = req.tenantId || req.user?.tenant_id || '';
    
    const query = `
      INSERT INTO workflows (id, title, description, trigger_cond, action, status, executions_count, last_executed, category, accent_color, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6, 0, 'Never', $7, $8, $9)
      RETURNING id, title, description, trigger_cond AS "trigger", action, status, executions_count AS "executionsCount", last_executed AS "lastExecuted", category, accent_color AS "accentColor"
    `;
    
    const result = await pool.query(query, [
      id, title, description, trigger, action, status || 'active', category, accentColor || '#2563EB', tenantId
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating workflow:', err);
    res.status(500).json({ error: 'Server error creating workflow' });
  }
});

app.patch('/api/workflows/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    
    const checkWf = await pool.query('SELECT status FROM workflows WHERE id = $1', [id]);
    if (checkWf.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    const currentStatus = checkWf.rows[0].status;
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    
    const query = `
      UPDATE workflows 
      SET status = $1
      WHERE id = $2
      RETURNING id, title, description, trigger_cond AS "trigger", action, status, executions_count AS "executionsCount", last_executed AS "lastExecuted", category, accent_color AS "accentColor"
    `;
    
    const result = await pool.query(query, [newStatus, id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error toggling workflow:', err);
    res.status(500).json({ error: 'Server error toggling workflow' });
  }
});

// 7. Tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const isSA = req.user.role_id === 1;
    const result = await pool.query(isSA ? `
      SELECT t.id, t.title, t.description, t.priority, t.status, t.due_date AS "dueDate",
             t.assignee, t.related_to AS "relatedTo", t.created_at AS "createdAt",
             t.tenant_id AS "tenantId", tc.name AS "companyName"
      FROM tasks t LEFT JOIN tenant_companies tc ON t.tenant_id = tc.id ORDER BY t.created_at DESC
    ` : `
      SELECT t.id, t.title, t.description, t.priority, t.status, t.due_date AS "dueDate",
             t.assignee, t.related_to AS "relatedTo", t.created_at AS "createdAt"
      FROM tasks t ORDER BY t.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const { title, description, priority, status, dueDate, assignee, relatedTo } = req.body;
    const id = `TSK-${Date.now()}`;
    const tenantId = req.tenantId || req.user?.tenant_id || '';
    const result = await pool.query(
      `INSERT INTO tasks (id, title, description, priority, status, due_date, assignee, related_to, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
       RETURNING id, title, description, priority, status, due_date AS "dueDate", assignee, related_to AS "relatedTo", created_at AS "createdAt"`,
      [id, title, description || '', priority || 'medium', status || 'todo', dueDate || '', JSON.stringify(assignee || {}), JSON.stringify(relatedTo || null), tenantId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, priority, status, dueDate, assignee, relatedTo } = req.body;
    const setClauses = [];
    const values = [];
    let idx = 1;
    if (title !== undefined) { setClauses.push(`title = $${idx++}`); values.push(title); }
    if (description !== undefined) { setClauses.push(`description = $${idx++}`); values.push(description); }
    if (priority !== undefined) { setClauses.push(`priority = $${idx++}`); values.push(priority); }
    if (status !== undefined) { setClauses.push(`status = $${idx++}`); values.push(status); }
    if (dueDate !== undefined) { setClauses.push(`due_date = $${idx++}`); values.push(dueDate); }
    if (assignee !== undefined) { setClauses.push(`assignee = $${idx++}::jsonb`); values.push(JSON.stringify(assignee)); }
    if (relatedTo !== undefined) { setClauses.push(`related_to = $${idx++}::jsonb`); values.push(JSON.stringify(relatedTo)); }
    if (setClauses.length === 0) return res.status(400).json({ error: 'No fields' });
    values.push(id);
    const result = await pool.query(
      `UPDATE tasks SET ${setClauses.join(', ')} WHERE id = $${idx}
       RETURNING id, title, description, priority, status, due_date AS "dueDate", assignee, related_to AS "relatedTo", created_at AS "createdAt"`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 6. Metrics
app.get('/api/metrics', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, title, value, subtext, change, is_positive AS "isPositive", icon_name AS "iconName" 
      FROM metrics 
      ORDER BY id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching metrics:', err);
    res.status(500).json({ error: 'Server error fetching metrics' });
  }
});

// ===== Stub endpoints (return empty arrays — frontend falls back to mock data) =====
app.get('/api/stages', (req, res) => res.json([]));
app.get('/api/leads', (req, res) => res.json([]));
app.get('/api/chat-messages', (req, res) => res.json([]));
app.get('/api/leads/allocations', (req, res) => res.json([]));

// ===== RBAC: Users =====
app.get('/api/users', authorize('settings_user_management:view_add_edit_deactivate_user'), async (req, res) => {
  try {
    const isSuperAdmin = req.user.role_id === 1;
    const tenantId = req.tenantId || req.user?.tenant_id || '';
    if (isSuperAdmin) {
      const result = await pool.query(`
        SELECT u.id, u.name, u.email, u.avatar, u.provider,
               u.role_id AS "roleId", r.name AS "roleName",
               u.status, u.created_at AS "createdAt",
               u.tenant_id AS "tenantId", tc.name AS "companyName"
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        LEFT JOIN tenant_companies tc ON u.tenant_id = tc.id
        ORDER BY u.created_at DESC
      `);
      return res.json(result.rows);
    }
    const result = await pool.query(`
      SELECT u.id, u.name, u.email, u.avatar, u.provider,
             u.role_id AS "roleId", r.name AS "roleName",
             u.status, u.created_at AS "createdAt"
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.tenant_id = $1
      ORDER BY u.created_at DESC
    `, [tenantId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/users', authorize('settings_user_management:view_add_edit_deactivate_user'), validate({
  name: { required: true, type: 'string', minLength: 1, maxLength: 200 },
  email: { required: true, type: 'email' },
  role_id: { type: 'number', min: 1, max: 5 },
}), async (req, res) => {
  try {
    const { name, email, role_id, tenant_id } = req.body;
    let tenantId = req.tenantId || req.user?.tenant_id || tenant_id;
    if (!tenantId) return res.status(400).json({ error: 'No tenant context. Super Admin must switch to a company first or provide tenant_id.' });
    const trimmedName = name.trim();
    const trimmedEmail = (email || '').trim();
    const assignedRoleId = role_id || 5;
    if (assignedRoleId === 1) {
      return res.status(403).json({ error: 'Super Admin accounts cannot be created via invite. Only the platform owner can be Super Admin.' });
    }

    // UPSERT by email to prevent duplicates: if user exists, update their info for this tenant
    const existingUser = trimmedEmail ? (await pool.query('SELECT id, tenant_id FROM users WHERE email = $1', [trimmedEmail]).catch(() => ({ rows: [] }))).rows[0] : null;
    const targetId = existingUser?.id || `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(trimmedName)}&background=6366f1&color=fff&size=150`;
    const result = await pool.query(
      `INSERT INTO users (id, name, email, avatar, provider, role_id, tenant_id, status)
       VALUES ($1, $2, $3, $4, 'invite', $5, $6, 'active')
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         role_id = $5,
         tenant_id = $6,
         provider = 'invite',
         updated_at = NOW()
       RETURNING id, name, email, avatar, provider, role_id AS "roleId", tenant_id AS "tenantId", status, created_at AS "createdAt"`,
      [targetId, trimmedName, trimmedEmail, avatar, assignedRoleId, tenantId]
    );
    const userId = result.rows[0].id;
    // Remove old tenant access so the user is scoped only to this tenant
    await pool.query('DELETE FROM user_tenants WHERE user_id = $1 AND tenant_id != $2', [userId, tenantId]);
    await pool.query(
      `INSERT INTO user_tenants (user_id, tenant_id, is_default, role_id)
       VALUES ($1, $2, TRUE, $3) ON CONFLICT (user_id, tenant_id) DO UPDATE SET is_default = TRUE, role_id = $3`,
      [userId, tenantId, assignedRoleId]
    );
    await auditLog(req.user.sub, tenantId, 'user.invite', 'user', userId, { name, email, role_id });
    // Send invite email via Resend (non-blocking)
    if (trimmedEmail) {
      const tRes = await pool.query('SELECT name FROM tenant_companies WHERE id = $1', [tenantId]);
      const companyName = tRes.rows[0]?.name || 'RelateFlows';
      sendInviteEmail({ name: trimmedName, email: trimmedEmail, invitedByName: req.user.name || req.user.sub, companyName });
    }
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/users/:id', authorize('settings_user_management:view_add_edit_deactivate_user'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role_id, status } = req.body;
    if (role_id !== undefined && role_id !== null) {
      if (typeof role_id !== 'number' || role_id < 1 || role_id > 5) {
        return res.status(400).json({ error: 'role_id must be between 1 and 5' });
      }
      if (role_id === 1) {
        return res.status(403).json({ error: 'Super Admin role cannot be assigned to other users' });
      }
    }
    const result = await pool.query(
      `UPDATE users SET name = COALESCE($1, name), role_id = COALESCE($2, role_id), status = COALESCE($3, status), updated_at = NOW()
       WHERE id = $4 RETURNING id, name, email, avatar, provider, role_id, status`,
      [name, role_id, status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== RBAC: Roles & Permissions =====
app.get('/api/roles', authorize('settings_roles_permissions:create_edit_role_matrix'), async (req, res) => {
  try {
    const isSuperAdmin = req.user.role_id === 1;
    const roles = await pool.query('SELECT id, name, description, is_system AS "isSystem", created_at AS "createdAt" FROM roles ORDER BY id ASC');
    const rp = await pool.query(`
      SELECT rp.role_id AS "roleId", p.id AS "permissionId", p.module, p.action, p.label
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      ORDER BY p.module, p.action
    `);
    res.json({
      roles: isSuperAdmin ? roles.rows : roles.rows.filter(r => r.id !== 1),
      rolePermissions: isSuperAdmin ? rp.rows : rp.rows.filter(rp => rp.roleId !== 1),
    });
  } catch (err) {
    console.error('Error fetching roles:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/roles', authorize('settings_roles_permissions:create_edit_role_matrix'), validate({
  name: { required: true, type: 'string', minLength: 1, maxLength: 100 },
  description: { type: 'string', maxLength: 500 },
  permissionIds: { type: 'array' },
}), async (req, res) => {
  try {
    const { name, description, permissionIds } = req.body;
    const role = await pool.query(
      'INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING id, name, description, is_system AS "isSystem", created_at AS "createdAt"',
      [name, description || '']
    );
    if (permissionIds && permissionIds.length > 0) {
      const roleId = role.rows[0].id;
      for (const pid of permissionIds) {
        if (typeof pid !== 'number' || !Number.isInteger(pid) || pid <= 0) continue;
        await pool.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [roleId, pid]);
      }
    }
    res.status(201).json(role.rows[0]);
  } catch (err) {
    console.error('Error creating role:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/roles/:id', authorize('settings_roles_permissions:create_edit_role_matrix'), async (req, res) => {
  try {
    const { id } = req.params;
    const isSuperAdmin = req.user.role_id === 1;
    if (!isSuperAdmin && Number(id) === 1) {
      return res.status(403).json({ error: 'Only Super Admin can modify the Super Admin role' });
    }
    const { name, description, permissionIds } = req.body;
    if (name || description) {
      await pool.query('UPDATE roles SET name = COALESCE($1, name), description = COALESCE($2, description) WHERE id = $3', [name, description, id]);
    }
    if (permissionIds) {
      await pool.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);
      if (permissionIds.length > 0) {
        for (const pid of permissionIds) {
          if (typeof pid !== 'number' || !Number.isInteger(pid) || pid <= 0) continue;
          await pool.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, pid]);
        }
      }
    }
    const result = await pool.query('SELECT id, name, description, is_system AS "isSystem" FROM roles WHERE id = $1', [id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating role:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/roles/:id', authorize('settings_roles_permissions:create_edit_role_matrix'), async (req, res) => {
  try {
    const { id } = req.params;
    const check = await pool.query('SELECT is_system FROM roles WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Role not found' });
    if (check.rows[0].is_system) return res.status(400).json({ error: 'Cannot delete system role' });
    await pool.query('DELETE FROM roles WHERE id = $1', [id]);
    res.json({ message: 'Role deleted' });
  } catch (err) {
    console.error('Error deleting role:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/permissions — list all available permissions
app.get('/api/permissions', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, module, action, label FROM permissions ORDER BY module, action');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching permissions:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== Channel Management =====
app.get('/api/channels', authorize('settings_channel_management:add_remove_channel_credentials'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, type, display_name AS "displayName", page_id AS "pageId", status, 
             last_health_check AS "lastHealthCheck", created_by AS "createdBy", created_at AS "createdAt"
      FROM social_channels ORDER BY type, display_name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching channels:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/channels', authorize('settings_channel_management:add_remove_channel_credentials'), async (req, res) => {
  try {
    const { type, displayName, credentials, pageId } = req.body;
    const encrypted = encrypt(JSON.stringify(credentials || {}));
    const webhookToken = crypto.randomBytes(16).toString('hex');
    const tenantId = req.tenantId || req.user?.tenant_id || '';
    const result = await pool.query(
      `INSERT INTO social_channels (type, display_name, credentials, page_id, status, webhook_verify_token, created_by, tenant_id)
       VALUES ($1, $2, $3, $4, 'disconnected', $5, $6, $7)
       RETURNING id, type, display_name AS "displayName", page_id AS "pageId", status, created_at AS "createdAt"`,
      [type, displayName, encrypted, pageId || '', webhookToken, req.user.sub, tenantId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating channel:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/channels/:id', authorize('settings_channel_management:add_remove_channel_credentials'), async (req, res) => {
  try {
    const { id } = req.params;
    const { displayName, credentials, status } = req.body;
    const setClauses = [];
    const values = [];
    let idx = 1;
    if (displayName !== undefined) { setClauses.push(`display_name = $${idx++}`); values.push(displayName); }
    if (credentials !== undefined) { setClauses.push(`credentials = $${idx++}`); values.push(encrypt(JSON.stringify(credentials))); }
    if (status !== undefined) { setClauses.push(`status = $${idx++}`); values.push(status); }
    if (setClauses.length === 0) return res.status(400).json({ error: 'No fields' });
    setClauses.push(`updated_at = NOW()`);
    values.push(id);
    const result = await pool.query(
      `UPDATE social_channels SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING id, type, display_name AS "displayName", page_id AS "pageId", status`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Channel not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating channel:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/channels/:id', authorize('settings_channel_management:add_remove_channel_credentials'), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM user_channel_access WHERE channel_id = $1', [id]);
    const result = await pool.query('DELETE FROM social_channels WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Channel not found' });
    res.json({ message: 'Channel deleted' });
  } catch (err) {
    console.error('Error deleting channel:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/channels/:id/test — test connection by returning stored credential preview
app.post('/api/channels/:id/test', authorize('settings_channel_management:add_remove_channel_credentials'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT credentials, status FROM social_channels WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Channel not found' });
    let creds = {};
    try { creds = JSON.parse(decrypt(result.rows[0].credentials)); } catch {}
    const hasKeys = Object.keys(creds).length > 0;
    const newStatus = hasKeys ? 'connected' : 'error';
    await pool.query('UPDATE social_channels SET status = $1, last_health_check = NOW() WHERE id = $2', [newStatus, id]);
    res.json({ status: newStatus, message: hasKeys ? 'Connection successful' : 'Missing credentials' });
  } catch (err) {
    console.error('Error testing channel:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== OAuth Channel Connection (Facebook, Instagram, LINE) =====

// GET /api/channels/facebook/auth-url — returns Facebook Login URL for page management
app.get('/api/channels/facebook/auth-url', authenticateToken, (req, res) => {
  const fbAppId = process.env.FB_APP_ID || process.env.VITE_FACEBOOK_APP_ID || '';
  if (!fbAppId) return res.status(400).json({ error: 'FB_APP_ID not configured' });
  const redirectUri = `${process.env.VITE_API_URL || ''}/api/channels/facebook/callback`;
  const state = Buffer.from(JSON.stringify({ uid: req.user.sub, tenantId: req.user.tenant_id })).toString('base64');
  const scopes = [
    'pages_manage_metadata',
    'pages_messaging',
    'pages_read_engagement',
    'pages_show_list',
    'instagram_basic',
    'instagram_manage_messages',
    'business_management',
  ].join(',');
  const url = `https://www.facebook.com/v22.0/dialog/oauth?client_id=${fbAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent(scopes)}&response_type=code`;
  res.json({ url });
});

// GET /api/channels/facebook/callback — handle Facebook OAuth callback
app.get('/api/channels/facebook/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) return res.status(400).send('Missing authorization code');
    let stateData = {};
    try { stateData = JSON.parse(Buffer.from(state || '', 'base64').toString()); } catch {}
    const { uid, tenantId } = stateData;
    if (!uid || !tenantId) return res.status(400).send('Invalid state parameter');

    const fbAppId = process.env.FB_APP_ID || process.env.VITE_FACEBOOK_APP_ID || '';
    const fbAppSecret = process.env.FB_APP_SECRET || '';
    if (!fbAppId || !fbAppSecret) return res.status(400).send('Facebook not configured');

    const redirectUri = `${process.env.VITE_API_URL || ''}/api/channels/facebook/callback`;

    // Exchange code for short-lived user access token
    const tokenRes = await fetch(`https://graph.facebook.com/v22.0/oauth/access_token?client_id=${fbAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${fbAppSecret}&code=${code}`);
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return res.status(400).send('Failed to get access token');

    // Exchange for long-lived token
    const longRes = await fetch(`https://graph.facebook.com/v22.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${fbAppId}&client_secret=${fbAppSecret}&fb_exchange_token=${tokenData.access_token}`);
    const longData = await longRes.json();
    const longToken = longData.access_token || tokenData.access_token;

    // Get user's pages
    const pagesRes = await fetch(`https://graph.facebook.com/v22.0/me/accounts?access_token=${longToken}`);
    const pagesData = await pagesRes.json();
    const pages = (pagesData.data || []).map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      accessToken: p.access_token,
      picture: `https://graph.facebook.com/v22.0/${p.id}/picture`,
    }));

    // Store each page as a social channel
    for (const page of pages) {
      const existing = await pool.query('SELECT id FROM social_channels WHERE page_id = $1 AND tenant_id = $2', [page.id, tenantId]);
      if (existing.rows.length === 0) {
        const encrypted = encrypt(JSON.stringify({ accessToken: page.accessToken, userAccessToken: longToken }));
        const verifyToken = crypto.randomBytes(16).toString('hex');
        await pool.query(`
          INSERT INTO social_channels (type, display_name, credentials, page_id, status, webhook_verify_token, created_by, tenant_id)
          VALUES ($1, $2, $3, $4, 'connected', $5, $6, $7)
        `, ['facebook', page.name, encrypted, page.id, verifyToken, uid, tenantId]);
      }
    }

    // Redirect to frontend with success
    res.redirect(`/settings?tab=channels&connected=facebook&pages=${pages.length}`);
  } catch (err) {
    console.error('Facebook callback error:', err);
    res.status(500).send('OAuth failed');
  }
});

// GET /api/channels/line/auth-url — returns LINE Login URL for bot
app.get('/api/channels/line/auth-url', authenticateToken, (req, res) => {
  const lineChannelId = process.env.VITE_LINE_CLIENT_ID || '';
  if (!lineChannelId) return res.status(400).json({ error: 'LINE Client ID not configured' });
  const redirectUri = encodeURIComponent(`${process.env.VITE_API_URL || ''}/api/channels/line/callback`);
  const state = Buffer.from(JSON.stringify({ uid: req.user.sub, tenantId: req.user.tenant_id })).toString('base64');
  const url = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${lineChannelId}&redirect_uri=${redirectUri}&state=${encodeURIComponent(state)}&scope=profile%20openid%20bot`;
  res.json({ url });
});

// GET /api/channels/line/callback — handle LINE OAuth callback
app.get('/api/channels/line/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) return res.status(400).send('Missing authorization code');
    let stateData = {};
    try { stateData = JSON.parse(Buffer.from(state || '', 'base64').toString()); } catch {}
    const { uid, tenantId } = stateData;
    if (!uid || !tenantId) return res.status(400).send('Invalid state parameter');

    const lineChannelId = process.env.VITE_LINE_CLIENT_ID || '';
    const lineChannelSecret = process.env.LINE_CHANNEL_SECRET || '';
    if (!lineChannelId || !lineChannelSecret) return res.status(400).send('LINE not configured');

    const redirectUri = `${process.env.VITE_API_URL || ''}/api/channels/line/callback`;

    // Exchange code for access token
    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: lineChannelId,
        client_secret: lineChannelSecret,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return res.status(400).send('Failed to get LINE token');

    // Get bot basic info
    const profileRes = await fetch('https://api.line.me/v2/bot/info', {
      headers: { Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN || ''}` },
    });
    const botInfo = profileRes.ok ? await profileRes.json() : { displayName: 'LINE Channel', userId: 'line-bot' };

    // Store as social channel
    const existing = await pool.query('SELECT id FROM social_channels WHERE type = $1 AND tenant_id = $2', ['line', tenantId]);
    if (existing.rows.length === 0) {
      const encrypted = encrypt(JSON.stringify({
        accessToken: tokenData.access_token,
        idToken: tokenData.id_token || '',
      }));
      const verifyToken = crypto.randomBytes(16).toString('hex');
      await pool.query(`
        INSERT INTO social_channels (type, display_name, credentials, page_id, status, webhook_verify_token, created_by, tenant_id)
        VALUES ($1, $2, $3, $4, 'connected', $5, $6, $7)
      `, ['line', botInfo.displayName || 'LINE Channel', encrypted, botInfo.userId || 'line-bot', verifyToken, uid, tenantId]);
    }

    res.redirect('/settings?tab=channels&connected=line');
  } catch (err) {
    console.error('LINE callback error:', err);
    res.status(500).send('OAuth failed');
  }
});

// ===== Channel Access Control =====
app.get('/api/channel-access', authorize('settings_channel_access_matrix:map_user_channel'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT uca.user_id AS "userId", uca.channel_id AS "channelId", u.name AS "userName",
             sc.display_name AS "channelName", sc.type AS "channelType"
      FROM user_channel_access uca
      JOIN users u ON uca.user_id = u.id
      JOIN social_channels sc ON uca.channel_id = sc.id
      ORDER BY u.name, sc.type
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching channel access:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/channel-access', authorize('settings_channel_access_matrix:map_user_channel'), async (req, res) => {
  try {
    const { userId, channelIds } = req.body;
    if (!userId || !channelIds || !Array.isArray(channelIds)) return res.status(400).json({ error: 'Invalid payload' });
    const tenantId = req.tenantId || req.user?.tenant_id || '';
    // Replace all access for this user
    await pool.query('DELETE FROM user_channel_access WHERE user_id = $1', [userId]);
    if (channelIds.length > 0) {
      for (const cid of channelIds) {
        if (typeof cid !== 'number' || !Number.isInteger(cid) || cid <= 0) continue;
        await pool.query('INSERT INTO user_channel_access (user_id, channel_id, granted_by, tenant_id) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING', [userId, cid, req.user.sub, tenantId]);
      }
    }
    res.json({ message: 'Channel access updated' });
  } catch (err) {
    console.error('Error updating channel access:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/:id/channels — get which channels a user has access to
app.get('/api/users/:id/channels', authorize('settings_channel_access_matrix:map_user_channel'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT channel_id AS "channelId" FROM user_channel_access WHERE user_id = $1',
      [req.params.id]
    );
    res.json(result.rows.map(r => r.channelId));
  } catch (err) {
    console.error('Error fetching user channels:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== Enterprise Account Management =====

// GET /api/enterprise/profile — get current user's enterprise account info
app.get('/api/enterprise/profile', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    if (!tenantId) return res.json({ name: 'Super Admin', plan: 'enterprise' });
    const result = await pool.query(`
      SELECT ea.id, ea.name, ea.email, ea.phone, ea.billing_plan AS "billingPlan", ea.status,
             (SELECT COUNT(*) FROM tenant_companies WHERE enterprise_account_id = ea.id) AS "companyCount"
      FROM tenant_companies tc
      JOIN enterprise_accounts ea ON tc.enterprise_account_id = ea.id
      WHERE tc.id = $1
    `, [tenantId]);
    if (result.rows.length === 0) return res.json({ name: 'Individual', plan: 'free' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching enterprise profile:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/enterprise/profile — update enterprise account info
app.put('/api/enterprise/profile', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    if (!tenantId) return res.status(400).json({ error: 'No tenant context' });
    const { name, email, phone } = req.body;
    const enterpriseRes = await pool.query(
      'SELECT ea.id FROM tenant_companies tc JOIN enterprise_accounts ea ON tc.enterprise_account_id = ea.id WHERE tc.id = $1',
      [tenantId]
    );
    if (enterpriseRes.rows.length === 0) return res.status(404).json({ error: 'No enterprise account' });
    const eaId = enterpriseRes.rows[0].id;
    const sets = []; const vals = []; let idx = 1;
    if (name !== undefined) { sets.push(`name = $${idx++}`); vals.push(name); }
    if (email !== undefined) { sets.push(`email = $${idx++}`); vals.push(email); }
    if (phone !== undefined) { sets.push(`phone = $${idx++}`); vals.push(phone); }
    if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });
    vals.push(eaId);
    await pool.query(`UPDATE enterprise_accounts SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${idx}`, vals);
    res.json({ message: 'Profile updated' });
  } catch (err) {
    console.error('Error updating enterprise profile:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/enterprise/tenants — list companies under the user's enterprise
app.get('/api/enterprise/tenants', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    if (!tenantId) return res.json([]);
    const result = await pool.query(`
      SELECT tc.id, tc.name, tc.slug, tc.status, tc.domain,
             tc.brand_color_primary AS "brandColorPrimary",
             tc.brand_color_secondary AS "brandColorSecondary",
             (SELECT COUNT(*) FROM users WHERE tenant_id = tc.id) AS "userCount"
      FROM tenant_companies tc
      WHERE tc.enterprise_account_id = (
        SELECT enterprise_account_id FROM tenant_companies WHERE id = $1
      )
      ORDER BY tc.name
    `, [tenantId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching enterprise tenants:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== Scoped Inbox route — returns only channels user has access to =====
app.get('/api/inbox/channels', async (req, res) => {
  try {
    // Admin sees all
    let channelIds = [];
    if (req.user.role_id === 1) {
      const all = await pool.query('SELECT id FROM social_channels');
      channelIds = all.rows.map(r => r.id);
    } else {
      const result = await pool.query(
        'SELECT channel_id AS id FROM user_channel_access WHERE user_id = $1',
        [req.user.sub]
      );
      channelIds = result.rows.map(r => r.id);
    }
    const channels = await pool.query(
      `SELECT id, type, display_name AS "displayName", status, page_id AS "pageId"
       FROM social_channels WHERE id = ANY($1::int[]) ORDER BY type`,
      [channelIds.length > 0 ? channelIds : [0]]
    );
    res.json(channels.rows);
  } catch (err) {
    console.error('Error fetching inbox channels:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== Tenant Settings (encrypted integration keys) =====
// GET /api/settings/integrations — returns masked keys for the current tenant
app.get('/api/settings/integrations', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    if (!tenantId) return res.json({});
    const result = await pool.query('SELECT key, value_encrypted FROM tenant_settings WHERE tenant_id = $1', [tenantId]);
    const settings = {};
    for (const row of result.rows) {
      try {
        const decrypted = decrypt(row.value_encrypted);
        settings[row.key] = decrypted;
      } catch {
        settings[row.key] = '';
      }
    }
    res.json(settings);
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/settings/integrations — upsert encrypted keys for the current tenant
app.put('/api/settings/integrations', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    if (!tenantId) return res.status(400).json({ error: 'No tenant' });
    const { keys } = req.body;
    if (!keys || typeof keys !== 'object') return res.status(400).json({ error: 'Invalid payload' });
    for (const [key, value] of Object.entries(keys)) {
      if (typeof value !== 'string') continue;
      const encrypted = encrypt(value);
      await pool.query(`
        INSERT INTO tenant_settings (tenant_id, key, value_encrypted)
        VALUES ($1, $2, $3)
        ON CONFLICT (tenant_id, key) DO UPDATE SET
          value_encrypted = EXCLUDED.value_encrypted,
          updated_at = NOW()
      `, [tenantId, key, encrypted]);
    }
    res.json({ message: 'Integration keys saved' });
  } catch (err) {
    console.error('Error saving settings:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== Webhook endpoint for social platforms =====
app.post('/api/webhook/:platform', async (req, res) => {
  const { platform } = req.params;
  const body = req.body;

  // Facebook/Instagram verify token handshake
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token']) {
    const channel = await pool.query('SELECT id FROM social_channels WHERE webhook_verify_token = $1 AND type = $2', [req.query['hub.verify_token'], platform]);
    if (channel.rows.length > 0) {
      return res.status(200).send(req.query['hub.challenge']);
    }
    return res.status(403).send('Forbidden');
  }

  // Signature verification for incoming webhook payloads
  if (platform === 'line') {
    const signature = req.headers['x-line-signature'];
    const channelSecret = process.env.LINE_CHANNEL_SECRET || '';
    if (!channelSecret) {
      console.warn('LINE_CHANNEL_SECRET not configured. Skipping webhook signature verification.');
    } else if (!signature) {
      return res.status(401).send('Missing signature');
    } else {
      const expected = crypto.createHmac('SHA256', channelSecret).update(JSON.stringify(body)).digest('base64');
      if (signature !== expected) {
        return res.status(401).send('Invalid signature');
      }
    }
  } else if (platform === 'facebook' || platform === 'instagram') {
    const signature = req.headers['x-hub-signature-256'];
    const appSecret = process.env.FB_APP_SECRET || '';
    if (!appSecret) {
      console.warn('FB_APP_SECRET not configured. Skipping webhook signature verification.');
    } else if (!signature) {
      return res.status(401).send('Missing signature');
    } else {
      const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(JSON.stringify(body)).digest('hex');
      if (signature !== expected) {
        return res.status(401).send('Invalid signature');
      }
    }
  }

  // Identify channel from payload
  let channelId = null;
  if (platform === 'facebook' || platform === 'instagram') {
    const pageId = body?.entry?.[0]?.id || body?.entry?.[0]?.messaging?.[0]?.sender?.id || '';
    if (pageId) {
      const ch = await pool.query('SELECT id FROM social_channels WHERE page_id = $1', [pageId]);
      if (ch.rows.length > 0) channelId = ch.rows[0].id;
    }
  } else if (platform === 'line') {
    const source = body?.events?.[0]?.source;
    const groupOrRoomId = source?.groupId || source?.roomId || source?.userId || '';
    if (groupOrRoomId) {
      const ch = await pool.query('SELECT id FROM social_channels WHERE type = $1 LIMIT 1', ['line']);
      if (ch.rows.length > 0) channelId = ch.rows[0].id;
    }
  }
  if (channelId) {
    console.log(`Webhook: ${platform} message for channel #${channelId}`);
  }
  res.status(200).send('OK');
});

// ===== Audit Log =====
app.get('/api/audit-log', authorize('settings_user_management:view_add_edit_deactivate_user'), async (req, res) => {
  try {
    const { text, params, limit } = keysetPaginate(
      `SELECT id, user_id AS "userId", action, target_type AS "targetType", target_id AS "targetId", details, created_at AS "createdAt" FROM audit_log`,
      [], req.query, { orderBy: 'created_at', tieBreaker: 'id', orderDir: 'DESC', defaultLimit: 50 }
    );
    const result = await pool.query(text, params);
    if (req.query.cursor) {
      const { items, nextCursor } = paginationResult(result.rows, limit);
      return res.json({ items, nextCursor, hasMore: !!nextCursor });
    }
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching audit log:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== Customer Tags (CRUD + Search) =====
app.get('/api/tags', async (req, res) => {
  try {
    const { q } = req.query;
    let query = 'SELECT id, name, color, created_at AS "createdAt" FROM customer_tags';
    const params = [];
    if (q && typeof q === 'string' && q.trim()) {
      query += ' WHERE name ILIKE $1';
      params.push('%' + q.trim() + '%');
    }
    query += ' ORDER BY name ASC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching tags:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/tags', async (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Tag name is required' });
    }
    const result = await pool.query(
      'INSERT INTO customer_tags (name, color, tenant_id) VALUES ($1, $2, $3) RETURNING id, name, color, created_at AS "createdAt"',
      [name.trim(), color || '#6366f1', req.tenantId || req.user?.tenant_id || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Tag already exists' });
    }
    console.error('Error creating tag:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/tags/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;
    const setClauses = [];
    const values = [];
    let idx = 1;
    if (name !== undefined) { setClauses.push(`name = $${idx++}`); values.push(name.trim()); }
    if (color !== undefined) { setClauses.push(`color = $${idx++}`); values.push(color); }
    if (setClauses.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(parseInt(id, 10));
    const result = await pool.query(
      `UPDATE customer_tags SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING id, name, color, created_at AS "createdAt"`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Tag not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating tag:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/tags/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM lead_tags WHERE tag_id = $1', [parseInt(id, 10)]);
    const result = await pool.query('DELETE FROM customer_tags WHERE id = $1 RETURNING id', [parseInt(id, 10)]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Tag not found' });
    res.json({ message: 'Tag deleted' });
  } catch (err) {
    console.error('Error deleting tag:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== Lead Tags =====
app.get('/api/leads/:id/tags', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ct.id, ct.name, ct.color
       FROM lead_tags lt
       JOIN customer_tags ct ON lt.tag_id = ct.id
       WHERE lt.lead_id = $1
       ORDER BY ct.name`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching lead tags:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/leads/:id/tags', async (req, res) => {
  try {
    const { tagId } = req.body;
    if (!tagId || typeof tagId !== 'number') {
      return res.status(400).json({ error: 'tagId is required' });
    }
    await pool.query(
      'INSERT INTO lead_tags (lead_id, tag_id, tenant_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [req.params.id, tagId, req.tenantId || req.user?.tenant_id || '']
    );
    res.status(201).json({ message: 'Tag added to lead' });
  } catch (err) {
    console.error('Error adding tag to lead:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/leads/:id/tags/:tagId', async (req, res) => {
  try {
    const { id, tagId } = req.params;
    await pool.query(
      'DELETE FROM lead_tags WHERE lead_id = $1 AND tag_id = $2',
      [id, parseInt(tagId, 10)]
    );
    res.json({ message: 'Tag removed from lead' });
  } catch (err) {
    console.error('Error removing tag from lead:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== Enhanced Allocation with History =====
app.get('/api/leads/:id/allocation-history', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, lead_id AS "leadId", sales_person_id AS "salesPersonId",
              sales_person_name AS "salesPersonName", sales_person_avatar AS "salesPersonAvatar",
              project_name AS "projectName", status, notes, is_reallocation AS "isReallocation",
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM allocation_history
       WHERE lead_id = $1
       ORDER BY created_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching allocation history:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/leads/:id/allocate', async (req, res) => {
  try {
    const { salesPersonId, salesPersonName, salesPersonAvatar, projectName, notes, isReallocation } = req.body;
    const leadId = req.params.id;
    if (!salesPersonId) {
      return res.status(400).json({ error: 'salesPersonId is required' });
    }

    // If NOT a re-allocation, check if there's an existing active allocation for this lead
    if (!isReallocation) {
      const existing = await pool.query(
        `SELECT id FROM allocation_history WHERE lead_id = $1 AND status = 'active' LIMIT 1`,
        [leadId]
      );
      if (existing.rows.length > 0) {
        // Update existing active allocation instead of creating new one
        const result = await pool.query(
          `UPDATE allocation_history SET
            sales_person_id = $1, sales_person_name = $2, sales_person_avatar = $3,
            project_name = COALESCE($4, project_name), notes = COALESCE($5, notes),
            updated_at = NOW()
           WHERE id = $6
           RETURNING id, lead_id AS "leadId", sales_person_id AS "salesPersonId",
             sales_person_name AS "salesPersonName", sales_person_avatar AS "salesPersonAvatar",
             project_name AS "projectName", status, notes, is_reallocation AS "isReallocation",
             created_at AS "createdAt", updated_at AS "updatedAt"`,
          [salesPersonId, salesPersonName || '', salesPersonAvatar || '', projectName || null, notes || null, existing.rows[0].id]
        );
        return res.json(result.rows[0]);
      }
    }

    // Create new allocation (either re-allocation or first-time)
    const insertResult = await pool.query(
      `INSERT INTO allocation_history (lead_id, sales_person_id, sales_person_name, sales_person_avatar, project_name, notes, is_reallocation, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, lead_id AS "leadId", sales_person_id AS "salesPersonId",
         sales_person_name AS "salesPersonName", sales_person_avatar AS "salesPersonAvatar",
         project_name AS "projectName", status, notes, is_reallocation AS "isReallocation",
         created_at AS "createdAt", updated_at AS "updatedAt"`,
      [leadId, salesPersonId, salesPersonName || '', salesPersonAvatar || '', projectName || null, notes || null, !!isReallocation, req.tenantId || req.user?.tenant_id || '']
    );

    res.status(201).json(insertResult.rows[0]);
  } catch (err) {
    console.error('Error allocating lead:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/leads/:id/allocation/:allocationId', async (req, res) => {
  try {
    const { id, allocationId } = req.params;
    const { status, notes, projectName } = req.body;
    const setClauses = [];
    const values = [];
    let idx = 1;
    if (status !== undefined) { setClauses.push(`status = $${idx++}`); values.push(status); }
    if (notes !== undefined) { setClauses.push(`notes = $${idx++}`); values.push(notes); }
    if (projectName !== undefined) { setClauses.push(`project_name = $${idx++}`); values.push(projectName); }
    setClauses.push('updated_at = NOW()');
    values.push(allocationId);
    const result = await pool.query(
      `UPDATE allocation_history SET ${setClauses.join(', ')} WHERE id = $${idx} AND lead_id = $${idx + 1}
       RETURNING id, lead_id AS "leadId", sales_person_id AS "salesPersonId",
         sales_person_name AS "salesPersonName", sales_person_avatar AS "salesPersonAvatar",
         project_name AS "projectName", status, notes, is_reallocation AS "isReallocation",
         created_at AS "createdAt", updated_at AS "updatedAt"`,
      [...values, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Allocation not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating allocation:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== Lead Allocation System (V2) — Config, Sales Rep Toggle, Round-Robin =====

// GET /api/lead-allocation/config — get required fields config
app.get('/api/lead-allocation/config', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id;
    const result = await pool.query(
      `SELECT value_encrypted FROM tenant_settings WHERE tenant_id = $1 AND key = 'lead_allocation_config'`,
      [tenantId]
    );
    if (result.rows.length > 0) {
      return res.json(JSON.parse(result.rows[0].value_encrypted));
    }
    // Default config
    res.json({
      requiredFields: [
        { key: 'name', label: 'What is your name?', type: 'text', order: 1 },
        { key: 'phone', label: 'What is your phone number?', type: 'text', order: 2 },
        { key: 'email', label: 'What is your email?', type: 'text', order: 3 },
        { key: 'budget', label: 'What is your budget range?', type: 'text', order: 4 },
      ],
      enabled: true,
    });
  } catch (err) {
    console.error('Error getting allocation config:', err);
    res.status(500).json({ error: 'Failed to get config' });
  }
});

// PUT /api/lead-allocation/config — save required fields config
app.put('/api/lead-allocation/config', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id;
    const { requiredFields, enabled } = req.body;
    const config = { requiredFields: requiredFields || [], enabled: enabled !== false };
    await pool.query(
      `INSERT INTO tenant_settings (tenant_id, key, value_encrypted)
       VALUES ($1, 'lead_allocation_config', $2)
       ON CONFLICT (tenant_id, key) DO UPDATE SET value_encrypted = $2, updated_at = NOW()`,
      [tenantId, JSON.stringify(config)]
    );
    res.json({ ok: true, config });
  } catch (err) {
    console.error('Error saving allocation config:', err);
    res.status(500).json({ error: 'Failed to save config' });
  }
});

// GET /api/sales-reps/status — list Sales reps with their allocation toggle status
app.get('/api/sales-reps/status', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id;
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.avatar, u.status AS user_status,
              COALESCE(sras.is_accepting, true) AS is_accepting
       FROM users u
       LEFT JOIN sales_rep_allocation_status sras ON sras.user_id = u.id AND sras.tenant_id = $1
       WHERE u.tenant_id = $1 AND u.role_id = 5 AND u.status = 'active'
       ORDER BY u.name`,
      [tenantId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting sales rep status:', err);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// PUT /api/sales-reps/status — toggle own allocation status
app.put('/api/sales-reps/status', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id;
    const userId = req.user?.sub;
    const { isAccepting } = req.body;

    await pool.query(
      `INSERT INTO sales_rep_allocation_status (id, user_id, tenant_id, is_accepting)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, tenant_id) DO UPDATE SET is_accepting = $4, updated_at = NOW()`,
      [`sras-${userId}-${Date.now()}`, userId, tenantId, isAccepting !== false]
    );

    res.json({ ok: true, isAccepting: isAccepting !== false });
  } catch (err) {
    console.error('Error toggling sales rep status:', err);
    res.status(500).json({ error: 'Failed to toggle status' });
  }
});

// POST /api/lead-allocation/auto-allocate — round-robin allocate to next available Sales rep
app.post('/api/lead-allocation/auto-allocate', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id;
    const { contactName, contactPhone, contactEmail, notes } = req.body;

    // Get all active Sales reps who are accepting allocation, ordered by name
    const reps = await pool.query(
      `SELECT u.id, u.name, u.avatar
       FROM users u
       LEFT JOIN sales_rep_allocation_status sras ON sras.user_id = u.id AND sras.tenant_id = $1
       WHERE u.tenant_id = $1 AND u.role_id = 5 AND u.status = 'active'
         AND COALESCE(sras.is_accepting, true) = true
       ORDER BY u.name`,
      [tenantId]
    );

    if (reps.rows.length === 0) {
      return res.status(400).json({ error: 'No available sales reps' });
    }

    // Atomic round-robin via transaction + SELECT FOR UPDATE
    const client = await pool.connect();
    let rep, idx;
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        'SELECT allocation_round_robin_idx FROM tenant_companies WHERE id = $1 FOR UPDATE',
        [tenantId]
      );
      idx = rows.length > 0 ? (rows[0].allocation_round_robin_idx || 0) : 0;
      rep = reps.rows[idx % reps.rows.length];
      const nextIdx = (idx + 1) % reps.rows.length;
      await client.query(
        'UPDATE tenant_companies SET allocation_round_robin_idx = $1 WHERE id = $2',
        [nextIdx, tenantId]
      );
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    // Create a contact if doesn't exist
    const contactId = `CNT-ALLOC-${Date.now()}`;
    await pool.query(
      `INSERT INTO contacts (id, name, email, phone, notes, tenant_id, lifecycle_stage, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'lead', NOW())
       ON CONFLICT (id) DO NOTHING`,
      [contactId, contactName || 'Unknown', contactEmail || '', contactPhone || '', notes || '', tenantId]
    );

    // Create allocation
    const allocResult = await pool.query(
      `INSERT INTO allocation_history (lead_id, sales_person_id, sales_person_name, sales_person_avatar, project_name, notes, status, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'active', $7)
       RETURNING id, lead_id AS "leadId", sales_person_id AS "salesPersonId",
         sales_person_name AS "salesPersonName", sales_person_avatar AS "salesPersonAvatar",
         status, created_at AS "createdAt"`,
      [contactId, rep.id, rep.name, rep.avatar || '', contactName || 'Lead', notes || '', tenantId]
    );

    res.json({
      ok: true,
      allocation: allocResult.rows[0],
      rep: { id: rep.id, name: rep.name },
      contactId,
    });
  } catch (err) {
    console.error('Error auto-allocating:', err);
    res.status(500).json({ error: 'Failed to auto-allocate' });
  }
});

// GET /api/lead-allocation/history — get allocation history for tenant
app.get('/api/lead-allocation/history', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id;
    const limit = parseInt(req.query.limit || '50');
    const result = await pool.query(
      `SELECT ah.*, u.name AS sales_person_name, u.avatar AS sales_person_avatar
       FROM allocation_history ah
       LEFT JOIN users u ON u.id = ah.sales_person_id
       WHERE ah.tenant_id = $1
       ORDER BY ah.created_at DESC LIMIT $2`,
      [tenantId, limit]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting allocation history:', err);
    res.status(500).json({ error: 'Failed to get history' });
  }
});

// ===== Custom Objects API (Admin: role 1 or 6, tenant-scoped) =====

// ── Objects ──
app.get('/api/admin/objects', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const isSuperAdmin = req.user.role_id === 1;
    const tenantId = req.tenantId;
    const { rows } = await pool.query(
      `SELECT co.*, (SELECT COUNT(*) FROM custom_fields cf WHERE cf.owner_type = 'custom' AND cf.owner_id = co.id) AS field_count,
        (SELECT COUNT(*) FROM custom_records cr WHERE cr.object_id = co.id) AS record_count
       FROM custom_objects co ${!isSuperAdmin && tenantId ? 'WHERE co.tenant_id = $1' : ''} ORDER BY co.created_at DESC`,
      !isSuperAdmin && tenantId ? [tenantId] : []
    );
    res.json(rows);
  } catch (err) {
    console.error('Error listing objects:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/objects', authenticateToken, requireAdmin, async (req, res) => {
  const { name, slug, description, icon, color } = req.body;
  if (!name || !slug) return res.status(400).json({ error: 'Name and slug are required' });
  const isSuperAdmin = req.user.role_id === 1;
  const tenantId = req.tenantId || req.user?.tenant_id;
  if (!tenantId && !isSuperAdmin) return res.status(400).json({ error: 'No tenant context' });
  const id = `obj-${slug}-${Date.now()}`;
  try {
    const { rows } = await pool.query(
      `INSERT INTO custom_objects (id, tenant_id, name, slug, description, icon, color)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, tenantId || '', name, slug, description || '', icon || 'table', color || '#6366f1']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Slug already exists' });
    console.error('Error creating object:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/admin/objects/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { name, description, icon, color, status } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE custom_objects SET name = COALESCE($1, name), description = COALESCE($2, description),
        icon = COALESCE($3, icon), color = COALESCE($4, color), status = COALESCE($5, status),
        updated_at = NOW() WHERE id = $6 AND ($7 IS NULL OR tenant_id = $7) RETURNING *`,
      [name, description, icon, color, status, req.params.id, req.tenantId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Object not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating object:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/admin/objects/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM custom_objects WHERE id = $1 AND ($2 IS NULL OR tenant_id = $2)', [req.params.id, req.tenantId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Object not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting object:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Fields ──
app.get('/api/admin/objects/:id/fields', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM custom_fields WHERE ($1 IS NULL OR tenant_id = $1) AND owner_type = $2 AND owner_id = $3 ORDER BY ordering ASC, created_at ASC',
      [req.tenantId, req.query.ownerType || 'custom', req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error listing fields:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/fields', authenticateToken, requireAdmin, async (req, res) => {
  const { owner_type, owner_id, name, slug, field_type, options, reference_owner, required, placeholder, default_value } = req.body;
  if (!owner_type || !name || !slug) return res.status(400).json({ error: 'owner_type, name, slug required' });
  const isSuperAdmin = req.user.role_id === 1;
  const tenantId = req.tenantId || req.user?.tenant_id;
  if (!tenantId && !isSuperAdmin) return res.status(400).json({ error: 'No tenant context' });
  const id = `fld-${slug}-${Date.now()}`;
  try {
    const { rows } = await pool.query(
      `INSERT INTO custom_fields (id, tenant_id, owner_type, owner_id, name, slug, field_type, options, reference_owner, required, placeholder, default_value)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [id, tenantId || '', owner_type, owner_id || '', name, slug, field_type || 'text',
       JSON.stringify(options || []), reference_owner || '', !!required, placeholder || '', default_value || '']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Duplicate field slug' });
    console.error('Error creating field:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/admin/fields/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { name, field_type, options, reference_owner, required, placeholder, default_value, ordering, status } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE custom_fields SET name = COALESCE($1, name), field_type = COALESCE($2, field_type),
        options = COALESCE($3::jsonb, options), reference_owner = COALESCE($4, reference_owner),
        required = COALESCE($5, required), placeholder = COALESCE($6, placeholder),
        default_value = COALESCE($7, default_value), ordering = COALESCE($8, ordering),
        status = COALESCE($9, status), updated_at = NOW()
       WHERE id = $10 AND ($11 IS NULL OR tenant_id = $11) RETURNING *`,
      [name, field_type, options ? JSON.stringify(options) : null, reference_owner,
       required, placeholder, default_value, ordering, status, req.params.id, req.tenantId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Field not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating field:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/admin/fields/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM custom_fields WHERE id = $1 AND ($2 IS NULL OR tenant_id = $2)', [req.params.id, req.tenantId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Field not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting field:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Records ──
app.get('/api/admin/objects/:id/records', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT cr.*, u.name AS created_by_name, u.avatar AS created_by_avatar
       FROM custom_records cr LEFT JOIN users u ON cr.created_by = u.id
       WHERE ($1 IS NULL OR cr.tenant_id = $1) AND cr.object_id = $2 ORDER BY cr.created_at DESC`,
      [req.tenantId, req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error listing records:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/objects/:id/records', authenticateToken, requireAdmin, async (req, res) => {
  const { data } = req.body;
  if (!data) return res.status(400).json({ error: 'data object required' });
  const isSuperAdmin = req.user.role_id === 1;
  const tenantId = req.tenantId || req.user?.tenant_id;
  if (!tenantId && !isSuperAdmin) return res.status(400).json({ error: 'No tenant context' });
  const recordId = `rec-${req.params.id}-${Date.now()}`;
  try {
    const { rows } = await pool.query(
      'INSERT INTO custom_records (id, tenant_id, object_id, data, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [recordId, tenantId || '', req.params.id, JSON.stringify(data), req.user.sub]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating record:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/admin/records/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { data } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE custom_records SET data = $1, updated_at = NOW() WHERE id = $2 AND ($3 IS NULL OR tenant_id = $3) RETURNING *`,
      [JSON.stringify(data || {}), req.params.id, req.tenantId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Record not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating record:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/admin/records/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM custom_records WHERE id = $1 AND ($2 IS NULL OR tenant_id = $2)', [req.params.id, req.tenantId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Record not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting record:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Built-in object custom fields ──
app.get('/api/admin/builtin-fields/:type', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM custom_fields WHERE ($1 IS NULL OR tenant_id = $1) AND owner_type = $2 ORDER BY ordering ASC, created_at ASC`,
      [req.tenantId, `builtin:${req.params.type}`]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error listing builtin fields:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== AI Chatbot Routes =====

// POST /api/chat — send a message to the chatbot
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId, mode } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const tenantId = req.tenantId || req.user?.tenant_id;
    const isSuperAdmin = req.user?.role_id === 1;
    const chatMode = mode === 'global' && isSuperAdmin ? 'global' : 'tenant';

    // Get or create session
    let sid = sessionId;
    let sessionMetadata = {};
    if (!sid) {
      const newId = `CHAT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await pool.query(
        `INSERT INTO chat_sessions (id, tenant_id, user_id, title, mode)
         VALUES ($1, $2, $3, $4, $5)`,
        [newId, chatMode === 'global' ? null : tenantId, req.user.sub, message.slice(0, 100), chatMode]
      );
      sid = newId;
    } else {
      // Load existing session metadata
      try {
        const { rows } = await pool.query(
          `SELECT metadata FROM chat_sessions WHERE id = $1`,
          [sid]
        );
        if (rows.length > 0 && rows[0].metadata) {
          sessionMetadata = typeof rows[0].metadata === 'string' ? JSON.parse(rows[0].metadata) : rows[0].metadata;
        }
      } catch (e) {
        console.warn('Failed to load session metadata:', e.message);
      }
      // Update session timestamp
      await pool.query('UPDATE chat_sessions SET updated_at = NOW() WHERE id = $1', [sid]).catch(() => {});
    }

    // Save user message
    const userMsgId = `MSG-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await pool.query(
      `INSERT INTO chat_messages (id, session_id, tenant_id, role, content)
       VALUES ($1, $2, $3, 'user', $4)`,
      [userMsgId, sid, chatMode === 'global' ? null : tenantId, message]
    ).catch(err => console.error('Failed to save user message:', err.message));

    // Auto-train if knowledge base is empty (lazy learning)
    if (tenantId && chatMode !== 'global') {
      try {
        const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM knowledge_chunks WHERE tenant_id = $1', [tenantId]);
        if (rows[0].count === 0) {
          console.log(`Auto-training knowledge base for tenant ${tenantId}...`);
          await trainKnowledge(tenantId);
        }
      } catch (e) {
        console.warn('Auto-train check failed:', e.message);
      }
    }

    // Check if there's an active qualification in progress
    let response;
    let updatedMetadata = sessionMetadata;
    if (sessionMetadata?.qualification?.step === 'collecting' ||
        sessionMetadata?.qualification?.step === 'confirm' ||
        sessionMetadata?.qualification?.step === 'init') {
      // Route to qualification handler
      const result = await handleQualificationStep(message, sessionMetadata, tenantId);
      response = result.response;
      updatedMetadata = result.metadata;
    } else {
      // Check if this message triggers qualification start
      const intent = detectIntent(message);
      if (intent === 'talk_to_sales' && tenantId) {
        const result = await handleQualificationStep(message, {}, tenantId);
        response = result.response;
        updatedMetadata = result.metadata;
      } else {
        response = await processMessage(message, req);
      }
    }

    // Save updated metadata
    if (updatedMetadata !== sessionMetadata) {
      await pool.query(
        `UPDATE chat_sessions SET metadata = $1::jsonb WHERE id = $2`,
        [JSON.stringify(updatedMetadata), sid]
      ).catch(err => console.warn('Failed to save metadata:', err.message));
    }

    // Save assistant response
    const msgId = `MSG-${Date.now() + 1}-${Math.random().toString(36).slice(2, 6)}`;
    await pool.query(
      `INSERT INTO chat_messages (id, session_id, tenant_id, role, content)
       VALUES ($1, $2, $3, 'assistant', $4)`,
      [msgId, sid, chatMode === 'global' ? null : tenantId, response]
    ).catch(err => console.error('Failed to save assistant message:', err.message));

    res.json({
      sessionId: sid,
      message: response,
      intent: sessionMetadata?.qualification?.step ? 'lead_qualification' : 'auto_detected',
    });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Chat processing failed' });
  }
});

// GET /api/chat/sessions — list user's chat sessions
app.get('/api/chat/sessions', async (req, res) => {
  try {
    const userId = req.user.sub;
    const params = [userId];
    let tenantFilter = '';
    const isSuperAdmin = req.user?.role_id === 1;
    if (!isSuperAdmin) {
      tenantFilter = 'AND (tenant_id = $2 OR tenant_id IS NULL)';
      params.push(req.tenantId);
    }
    const { rows } = await pool.query(
      `SELECT id, title, mode, created_at, updated_at,
              (SELECT content FROM chat_messages WHERE session_id = s.id AND role = 'assistant' ORDER BY created_at DESC LIMIT 1) AS last_response
       FROM chat_sessions s
       WHERE user_id = $1 ${tenantFilter}
       ORDER BY updated_at DESC LIMIT 50`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('Error listing sessions:', err);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

// GET /api/chat/history/:sessionId — get messages for a session
app.get('/api/chat/history/:sessionId', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id;
    // Verify session belongs to user or tenant
    const session = await pool.query(
      `SELECT id FROM chat_sessions WHERE id = $1 AND (user_id = $2 OR tenant_id = $3)`,
      [req.params.sessionId, req.user.sub, tenantId]
    );
    if (session.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    const { rows } = await pool.query(
      `SELECT id, role, content, metadata, created_at
       FROM chat_messages WHERE session_id = $1
       ORDER BY created_at ASC`,
      [req.params.sessionId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error loading history:', err);
    res.status(500).json({ error: 'Failed to load history' });
  }
});

// DELETE /api/chat/sessions/:id — delete a session
app.delete('/api/chat/sessions/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id;
    // Verify session belongs to user or tenant
    const session = await pool.query(
      `SELECT id FROM chat_sessions WHERE id = $1 AND (user_id = $2 OR tenant_id = $3)`,
      [req.params.id, req.user.sub, tenantId]
    );
    if (session.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    await pool.query('DELETE FROM chat_messages WHERE session_id = $1', [req.params.id]);
    await pool.query('DELETE FROM chat_sessions WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting session:', err);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// POST /api/chat/train — (re)train knowledge base for current tenant
app.post('/api/chat/train', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }
    const result = await trainKnowledge(tenantId);
    res.json(result);
  } catch (err) {
    console.error('Error training chatbot:', err);
    res.status(500).json({ error: 'Training failed' });
  }
});

// GET /api/chat/settings — get chatbot settings for current tenant (or global for Super Admin)
app.get('/api/chat/settings', async (req, res) => {
  try {
    const isSuperAdmin = req.user?.role_id === 1;
    const isGlobal = req.query.scope === 'global' && isSuperAdmin;
    let tenantId = isGlobal ? null : (req.tenantId || req.user?.tenant_id);
    if (isSuperAdmin && req.query.companyId) {
      tenantId = req.query.companyId;
    }
    // For Super Admin in tenant mode without companyId, return default config
    if (isSuperAdmin && !isGlobal && !req.query.companyId) {
      return res.json({ ...DEFAULT_CHATBOT_CONFIG });
    }
    if (!tenantId && !isGlobal) {
      return res.status(400).json({ error: 'Tenant context required' });
    }
    const config = await getChatbotConfig(tenantId);
    res.json(config);
  } catch (err) {
    console.error('Error getting chatbot settings:', err);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// PUT /api/chat/settings — update chatbot settings
app.put('/api/chat/settings', async (req, res) => {
  try {
    const isSuperAdmin = req.user?.role_id === 1;
    const isGlobal = req.body.scope === 'global' && isSuperAdmin;
    let tenantId = isGlobal ? null : (req.tenantId || req.user?.tenant_id);
    if (isSuperAdmin && req.body.companyId) {
      tenantId = req.body.companyId;
    }
    if (!tenantId && !isGlobal) {
      return res.status(400).json({ error: 'Tenant context required — select a company' });
    }

    const existing = await getChatbotConfig(tenantId);
    const updated = { ...existing, ...req.body.config };
    delete updated.scope;

    await pool.query(
      `INSERT INTO tenant_settings (tenant_id, key, value_encrypted)
       VALUES ($1, 'chatbot_config', $2)
       ON CONFLICT (tenant_id, key) DO UPDATE SET value_encrypted = $2, updated_at = NOW()`,
      [tenantId, JSON.stringify(updated)]
    );

    res.json({ ok: true, config: updated });
  } catch (err) {
    console.error('Error saving chatbot settings:', err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// GET /api/chat/status — check if chatbot can auto-reply right now
app.get('/api/chat/status', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id;
    if (!tenantId) {
      return res.json({ enabled: false, withinSchedule: false, canAutoReply: false });
    }
    const status = await checkAutoReplyAvailable(tenantId);
    res.json(status);
  } catch (err) {
    console.error('Error checking chat status:', err);
    res.json({ enabled: false, withinSchedule: false, canAutoReply: false });
  }
});

// GET /api/chat/suggestions — get suggested questions
app.get('/api/chat/suggestions', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id;
    const isSuperAdmin = req.user?.role_id === 1;
    const suggestions = await getSuggestedQuestions(tenantId, isSuperAdmin);
    res.json(suggestions);
  } catch (err) {
    console.error('Error getting suggestions:', err);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// =====================================================================
// CS Admin — schedule, time logs, queue, and chat management
// =====================================================================

// GET /api/cs-admin/schedules — get schedules (own or team for supervisors)
app.get('/api/cs-admin/schedules', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id;
    const isSupervisor = req.user?.role_id === 1 || req.user?.role_id === 2 || req.user?.role_id === 4;
    const targetUserId = req.query.userId || null;

    let rows;
    if (targetUserId && isSupervisor) {
      const result = await pool.query(
        `SELECT * FROM cs_admin_schedules WHERE tenant_id = $1 AND user_id = $2 ORDER BY day_of_week`,
        [tenantId, targetUserId]
      );
      rows = result.rows;
    } else {
      const result = await pool.query(
        `SELECT * FROM cs_admin_schedules WHERE tenant_id = $1 AND user_id = $2 ORDER BY day_of_week`,
        [tenantId, req.user?.sub]
      );
      rows = result.rows;
    }
    res.json(rows);
  } catch (err) {
    console.error('Error getting CS schedules:', err);
    res.status(500).json({ error: 'Failed to get schedules' });
  }
});

// PUT /api/cs-admin/schedules — upsert own schedule (full replacement per day)
app.put('/api/cs-admin/schedules', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id;
    const userId = req.user?.sub;
    const { dayOfWeek, startTime, endTime, isActive } = req.body;

    if (dayOfWeek === undefined || dayOfWeek === null) {
      return res.status(400).json({ error: 'dayOfWeek is required (0-6)' });
    }

    await pool.query(
      `INSERT INTO cs_admin_schedules (id, user_id, tenant_id, day_of_week, start_time, end_time, is_active)
       VALUES ($1, $2, $3, $4, $5::time, $6::time, $7)
       ON CONFLICT (user_id, tenant_id, day_of_week)
       DO UPDATE SET start_time = $5::time, end_time = $6::time, is_active = $7, updated_at = NOW()`,
      [`csched-${userId}-${dayOfWeek}-${Date.now()}`, userId, tenantId, dayOfWeek, startTime || '09:00', endTime || '18:00', isActive !== false]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('Error saving CS schedule:', err);
    res.status(500).json({ error: 'Failed to save schedule' });
  }
});

// POST /api/cs-admin/clock-in — clock in for shift
app.post('/api/cs-admin/clock-in', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id;
    const userId = req.user?.sub;
    const { notes } = req.body;

    // Check if already clocked in
    const active = await pool.query(
      `SELECT id FROM cs_admin_time_logs WHERE user_id = $1 AND tenant_id = $2 AND status = 'active'`,
      [userId, tenantId]
    );
    if (active.rows.length > 0) {
      return res.status(400).json({ error: 'Already clocked in' });
    }

    const id = `cslog-${userId}-${Date.now()}`;
    await pool.query(
      `INSERT INTO cs_admin_time_logs (id, user_id, tenant_id, clock_in, notes, status)
       VALUES ($1, $2, $3, NOW(), $4, 'active')`,
      [id, userId, tenantId, notes || '']
    );

    res.json({ ok: true, id, clockIn: new Date().toISOString() });
  } catch (err) {
    console.error('Error clocking in:', err);
    res.status(500).json({ error: 'Failed to clock in' });
  }
});

// POST /api/cs-admin/clock-out — clock out
app.post('/api/cs-admin/clock-out', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id;
    const userId = req.user?.sub;
    const { notes } = req.body;

    const active = await pool.query(
      `SELECT id, clock_in FROM cs_admin_time_logs WHERE user_id = $1 AND tenant_id = $2 AND status = 'active'`,
      [userId, tenantId]
    );
    if (active.rows.length === 0) {
      return res.status(400).json({ error: 'Not clocked in' });
    }

    const log = active.rows[0];
    await pool.query(
      `UPDATE cs_admin_time_logs SET clock_out = NOW(), status = 'completed', notes = CASE WHEN $2::text <> '' THEN $2 ELSE notes END WHERE id = $1`,
      [log.id, notes || '']
    );

    const duration = Math.round((Date.now() - new Date(log.clock_in).getTime()) / 60000);
    res.json({ ok: true, durationMinutes: duration });
  } catch (err) {
    console.error('Error clocking out:', err);
    res.status(500).json({ error: 'Failed to clock out' });
  }
});

// GET /api/cs-admin/time-logs — get time logs for user or team
app.get('/api/cs-admin/time-logs', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id;
    const isSupervisor = req.user?.role_id === 1 || req.user?.role_id === 2 || req.user?.role_id === 4;
    const targetUserId = req.query.userId || req.user?.sub;
    const limit = parseInt(req.query.limit || '50');

    if (targetUserId !== req.user?.sub && !isSupervisor) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      `SELECT tl.*, u.name AS user_name FROM cs_admin_time_logs tl
       LEFT JOIN users u ON u.id = tl.user_id
       WHERE tl.tenant_id = $1 AND ($2::text IS NULL OR tl.user_id = $2)
       ORDER BY tl.clock_in DESC LIMIT $3`,
      [tenantId, targetUserId || null, limit]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting time logs:', err);
    res.status(500).json({ error: 'Failed to get time logs' });
  }
});

// GET /api/cs-admin/clock-status — get current clock status
app.get('/api/cs-admin/clock-status', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id;
    const userId = req.user?.sub;

    const active = await pool.query(
      `SELECT id, clock_in FROM cs_admin_time_logs WHERE user_id = $1 AND tenant_id = $2 AND status = 'active'`,
      [userId, tenantId]
    );

    const isClockedIn = active.rows.length > 0;
    res.json({
      isClockedIn,
      clockIn: isClockedIn ? active.rows[0].clock_in : null,
      logId: isClockedIn ? active.rows[0].id : null,
    });
  } catch (err) {
    console.error('Error getting clock status:', err);
    res.json({ isClockedIn: false, clockIn: null, logId: null });
  }
});

// GET /api/cs-admin/team-status — get all CS admins' online/offline/schedule status
app.get('/api/cs-admin/team-status', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id;

    // Get users with role_id = 4 (CS Admin) in this tenant
    const users = await pool.query(
      `SELECT u.id, u.name, u.email, u.avatar, u.status AS user_status
       FROM users u WHERE u.role_id = 4 AND u.tenant_id = $1 AND u.status = 'active'
       ORDER BY u.name`,
      [tenantId]
    );

    // Get who's clocked in now
    const clockedIn = await pool.query(
      `SELECT DISTINCT user_id FROM cs_admin_time_logs
       WHERE tenant_id = $1 AND status = 'active'`,
      [tenantId]
    );
    const clockedInIds = new Set(clockedIn.rows.map(r => r.user_id));

    // Get today's schedule for everyone
    const today = new Date().getDay();
    const schedules = await pool.query(
      `SELECT * FROM cs_admin_schedules
       WHERE tenant_id = $1 AND day_of_week = $2 AND is_active = true`,
      [tenantId, today]
    );
    const scheduleMap = {};
    for (const s of schedules.rows) {
      scheduleMap[s.user_id] = { start: s.start_time, end: s.end_time };
    }

    // Get active chat count per CS admin
    const activeChats = await pool.query(
      `SELECT assigned_to, COUNT(*) AS count FROM cs_chat_sessions
       WHERE tenant_id = $1 AND assigned_to IS NOT NULL AND status IN ('assigned', 'active')
       GROUP BY assigned_to`,
      [tenantId]
    );
    const chatCountMap = {};
    for (const c of activeChats.rows) {
      chatCountMap[c.assigned_to] = parseInt(c.count);
    }

    const teamStatus = users.rows.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.avatar,
      isOnline: clockedInIds.has(u.id),
      todaySchedule: scheduleMap[u.id] || null,
      activeChats: chatCountMap[u.id] || 0,
    }));

    res.json(teamStatus);
  } catch (err) {
    console.error('Error getting team status:', err);
    res.status(500).json({ error: 'Failed to get team status' });
  }
});

// GET /api/cs-admin/queue — get waiting/available chat queue
app.get('/api/cs-admin/queue', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id;

    const result = await pool.query(
      `SELECT cs.*, u.name AS assignee_name
       FROM cs_chat_sessions cs
       LEFT JOIN users u ON u.id = cs.assigned_to
       WHERE cs.tenant_id = $1 AND cs.status IN ('waiting', 'assigned', 'active')
       ORDER BY
         CASE cs.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 WHEN 'low' THEN 3 END,
         cs.created_at ASC`,
      [tenantId]
    );

    // For each waiting chat, calculate wait time
    const now = new Date();
    const queue = result.rows.map(r => ({
      ...r,
      waitMinutes: r.status === 'waiting' ? Math.round((now - new Date(r.created_at)) / 60000) : 0,
    }));

    res.json(queue);
  } catch (err) {
    console.error('Error getting queue:', err);
    res.status(500).json({ error: 'Failed to get queue' });
  }
});

// POST /api/cs-admin/queue/claim — claim a chat from the queue
app.post('/api/cs-admin/queue/claim', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id;
    const userId = req.user?.sub;
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const session = await pool.query(
      `SELECT id, status FROM cs_chat_sessions WHERE id = $1 AND tenant_id = $2`,
      [sessionId, tenantId]
    );
    if (session.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    if (session.rows[0].status !== 'waiting') {
      return res.status(400).json({ error: 'Session is already assigned or closed' });
    }

    await pool.query(
      `UPDATE cs_chat_sessions SET assigned_to = $1, status = 'active', assigned_at = NOW(), updated_at = NOW() WHERE id = $2`,
      [userId, sessionId]
    );

    res.json({ ok: true, assignedTo: userId });
  } catch (err) {
    console.error('Error claiming chat:', err);
    res.status(500).json({ error: 'Failed to claim chat' });
  }
});

// GET /api/cs-admin/chats — list CS chat sessions
app.get('/api/cs-admin/chats', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id;
    const userId = req.user?.sub;
    const status = req.query.status; // optional filter: waiting, assigned, active, closed
    const assignedToMe = req.query.mine === 'true';
    const limit = parseInt(req.query.limit || '100');
    const offset = parseInt(req.query.offset || '0');

    let conditions = `cs.tenant_id = $1`;
    const params = [tenantId];
    let paramIdx = 2;

    if (status) {
      conditions += ` AND cs.status = $${paramIdx++}`;
      params.push(status);
    }
    if (assignedToMe) {
      conditions += ` AND cs.assigned_to = $${paramIdx++}`;
      params.push(userId);
    }

    const result = await pool.query(
      `SELECT cs.*, u.name AS assignee_name,
              (SELECT COUNT(*) FROM cs_chat_messages WHERE session_id = cs.id) AS message_count
       FROM cs_chat_sessions cs
       LEFT JOIN users u ON u.id = cs.assigned_to
       WHERE ${conditions}
       ORDER BY
         CASE cs.status WHEN 'waiting' THEN 0 WHEN 'assigned' THEN 1 WHEN 'active' THEN 2 WHEN 'closed' THEN 3 END,
         cs.updated_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error listing CS chats:', err);
    res.status(500).json({ error: 'Failed to list chats' });
  }
});

// GET /api/cs-admin/chats/:id — get single session with messages
app.get('/api/cs-admin/chats/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id;
    const sessionId = req.params.id;

    const session = await pool.query(
      `SELECT cs.*, u.name AS assignee_name FROM cs_chat_sessions cs
       LEFT JOIN users u ON u.id = cs.assigned_to
       WHERE cs.id = $1 AND cs.tenant_id = $2`,
      [sessionId, tenantId]
    );
    if (session.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const messages = await pool.query(
      `SELECT * FROM cs_chat_messages WHERE session_id = $1 ORDER BY created_at ASC`,
      [sessionId]
    );

    res.json({ session: session.rows[0], messages: messages.rows });
  } catch (err) {
    console.error('Error getting CS chat:', err);
    res.status(500).json({ error: 'Failed to get chat' });
  }
});

// POST /api/cs-admin/chats/:id/message — send a message in a session
app.post('/api/cs-admin/chats/:id/message', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id;
    const userId = req.user?.sub;
    const userName = req.user?.name || 'CS Admin';
    const sessionId = req.params.id;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Check session exists, is accessible, and user is the assigned agent
    const session = await pool.query(
      `SELECT id, status, first_response_at, assigned_to FROM cs_chat_sessions WHERE id = $1 AND tenant_id = $2`,
      [sessionId, tenantId]
    );
    if (session.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const s = session.rows[0];
    if (s.assigned_to && s.assigned_to !== userId) {
      return res.status(403).json({ error: 'This chat is assigned to another agent' });
    }

    // If this is the first CS admin response, mark first_response_at
    if (!s.first_response_at) {
      await pool.query(
        `UPDATE cs_chat_sessions SET first_response_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [sessionId]
      );
    }

    const msgId = `csmsg-${sessionId}-${Date.now()}`;
    await pool.query(
      `INSERT INTO cs_chat_messages (id, session_id, tenant_id, sender_id, sender_name, sender_type, content)
       VALUES ($1, $2, $3, $4, $5, 'cs_admin', $6)`,
      [msgId, sessionId, tenantId, userId, userName, content.trim()]
    );

    res.json({ ok: true, id: msgId });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// PUT /api/cs-admin/chats/:id/close — close a session
app.put('/api/cs-admin/chats/:id/close', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id;
    const sessionId = req.params.id;

    await pool.query(
      `UPDATE cs_chat_sessions SET status = 'closed', closed_at = NOW(), updated_at = NOW() WHERE id = $1 AND tenant_id = $2`,
      [sessionId, tenantId]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('Error closing session:', err);
    res.status(500).json({ error: 'Failed to close session' });
  }
});

// GET /api/cs-admin/performance — get CS admin response time stats
app.get('/api/cs-admin/performance', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id;
    const days = parseInt(req.query.days || '7');

    const result = await pool.query(
      `SELECT
         cs.assigned_to,
         u.name AS user_name,
         u.avatar,
         COUNT(DISTINCT cs.id) AS total_chats,
         COUNT(DISTINCT CASE WHEN cs.first_response_at IS NOT NULL THEN cs.id END) AS responded_chats,
         AVG(
           CASE WHEN cs.first_response_at IS NOT NULL
             THEN EXTRACT(EPOCH FROM (cs.first_response_at - cs.created_at)) / 60
             ELSE NULL
           END
         )::numeric(10,1) AS avg_response_minutes,
         COUNT(DISTINCT CASE WHEN cs.status = 'closed' THEN cs.id END) AS closed_chats,
         SUM(CASE WHEN cs.status = 'closed' AND cs.closed_at IS NOT NULL
           THEN EXTRACT(EPOCH FROM (cs.closed_at - cs.created_at)) / 3600
           ELSE 0 END)::numeric(10,1) AS total_hours_spent
       FROM cs_chat_sessions cs
       LEFT JOIN users u ON u.id = cs.assigned_to
       WHERE cs.tenant_id = $1
         AND cs.created_at >= NOW() - INTERVAL '1 day' * $2
         AND cs.assigned_to IS NOT NULL
       GROUP BY cs.assigned_to, u.name, u.avatar
       ORDER BY total_chats DESC`,
      [tenantId, days]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error getting CS performance:', err);
    res.status(500).json({ error: 'Failed to get performance' });
  }
});

// ===== Global error boundary =====
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Server error' });
});

export default app;
