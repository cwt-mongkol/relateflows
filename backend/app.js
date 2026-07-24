import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import pool from './db.js';
import { scopeToTenant, withTenantScope, getScopedClient, resolveTenantFromChannel } from './scopeToCompany.js';

dotenv.config();

// ===== Encryption for stored credentials =====
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
  ? crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY).digest()
  : crypto.randomBytes(32);
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
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/calendar/callback';

const googleOAuthClient = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);

const CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar'];

const app = express();
const PORT = process.env.PORT || 5000;

const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:8080').split(',').map(s => s.trim());
app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true,
}));
app.use(helmet());
app.use(express.json({ limit: '1mb' }));

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

// Rate limiting for auth endpoints
app.use('/api/auth', rateLimit(20, 60000)); // 20 requests/min per IP

// Global auth + tenant scoping for all /api routes (except auth and webhook)
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/api/auth/') || req.path.startsWith('/api/webhook/')) return next();
  authenticateToken(req, res, next);
});
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/api/auth/') || req.path.startsWith('/api/webhook/')) return next();
  loadUserPermissions(req, res, next);
});
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/api/auth/') || req.path.startsWith('/api/webhook/')) return next();
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

// Helper: ensure user exists in `users` table, return full user + role_id
async function ensureUser(user) {
  try {
    // Resolve tenant_id: from user if provided, or look up by email domain, or default
    let tenantId = user.tenant_id || null;
    if (!tenantId && user.email) {
      const domain = user.email.split('@')[1];
      const tRes = await pool.query('SELECT id FROM tenant_companies WHERE domain = $1 LIMIT 1', [domain]);
      if (tRes.rows.length > 0) tenantId = tRes.rows[0].id;
    }
    if (!tenantId) {
      const tRes = await pool.query('SELECT id FROM tenant_companies WHERE slug = $1 LIMIT 1', ['relateflows-demo']);
      if (tRes.rows.length > 0) tenantId = tRes.rows[0].id;
    }
    await pool.query(`
      INSERT INTO users (id, name, email, avatar, provider, role_id, tenant_id, status)
      VALUES ($1, $2, $3, $4, $5, COALESCE((SELECT id FROM roles WHERE name LIKE '%Sales Rep%' LIMIT 1), 3), $6, 'active')
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        avatar = EXCLUDED.avatar,
        provider = EXCLUDED.provider,
        tenant_id = COALESCE(users.tenant_id, EXCLUDED.tenant_id),
        updated_at = NOW()
    `, [user.id, user.name, user.email, user.avatar, user.provider, tenantId]);
    const result = await pool.query('SELECT u.*, r.name AS role_name FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = $1', [user.id]);
    return result.rows[0] || user;
  } catch (err) {
    console.error('Failed to ensure user:', err.message);
    return user;
  }
}

// POST /api/auth/google
app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'Missing credential' });
  try {
    if (!GOOGLE_CLIENT_ID) {
      return res.status(400).json({ error: 'Google authentication not configured on server' });
    }
    const ticket = await googleOAuthClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.sub) {
      return res.status(401).json({ error: 'Invalid Google credential' });
    }
    const user = {
      id: payload.sub,
      name: payload.name || 'Google User',
      email: payload.email || '',
      avatar: payload.picture || '',
      provider: 'google',
    };
    const fullUser = await ensureUser(user);
    res.json(issueTokens(fullUser));
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(401).json({ error: 'Invalid Google credential' });
  }
});

// POST /api/auth/line
app.post('/api/auth/line', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Missing LINE authorization code' });
  // TODO: In production, exchange LINE auth code for access token, then fetch profile
  return res.status(501).json({ error: 'LINE authentication not yet implemented on server' });
});

// POST /api/auth/facebook
app.post('/api/auth/facebook', async (req, res) => {
  const { accessToken } = req.body;
  if (!accessToken) return res.status(400).json({ error: 'Missing Facebook access token' });
  // TODO: In production, verify Facebook access token with /me endpoint
  return res.status(501).json({ error: 'Facebook authentication not yet implemented on server' });
});

const DEMO_USERS = {
  admin:     { id: 'demo-admin-001',    name: 'Sarah Connor (Administrator)',     email: 'sarah.connor@relateflows.com',  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', provider: 'google', role_id: 1, tenant_id: 'tenant-default-001' },
  manager:   { id: 'demo-mgr-001',     name: 'Alex Rivera (Manager)',            email: 'alex.rivera@relateflows.com',   avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', provider: 'google', role_id: 2, tenant_id: 'tenant-default-001' },
  sales:     { id: 'demo-sales-001',   name: 'Marcus Brody (Sales Rep)',         email: 'marcus.brody@relateflows.com',  avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', provider: 'google', role_id: 3, tenant_id: 'tenant-default-001' },
  support:   { id: 'demo-support-001', name: 'Priya Sharma (Support)',           email: 'priya.sharma@relateflows.com',  avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80', provider: 'google', role_id: 4, tenant_id: 'tenant-default-001' },
  cs_admin:  { id: 'demo-csadmin-001', name: 'Kenji Tanaka (CS Admin)',          email: 'kenji.tanaka@relateflows.com',  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80', provider: 'google', role_id: 5, tenant_id: 'tenant-default-001' },
  super:     { id: 'demo-super-001',   name: 'Daisuke Yamamoto (Super Admin)',   email: 'daisuke@relateflows.com',       avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80', provider: 'google', role_id: 6, tenant_id: null },
};

// POST /api/auth/demo — demo login for any role (disabled in production, unless DEMO_MODE=enabled)
app.post('/api/auth/demo', async (req, res) => {
  if (process.env.NODE_ENV === 'production' && process.env.DEMO_MODE !== 'enabled') {
    return res.status(403).json({ error: 'Demo mode is disabled in production' });
  }
  const validRoles = ['admin', 'manager', 'sales', 'support', 'cs_admin', 'super'];
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

// GET /api/auth/me — verify token & return user
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json(req.user);
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
    const result = await pool.query(
      'INSERT INTO tb_categories (name, description) VALUES ($1, $2) RETURNING *',
      [name, description || '']
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
    const result = await pool.query(
      `INSERT INTO tb_products (lead_id, category_id, name, quantity, price, description, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [leadId, categoryId || null, name, quantity || 1, price || 0, description || '', notes || '', status || 'pending']
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
    const result = await pool.query(
      `INSERT INTO tb_appointments (lead_id, title, description, start_time, end_time, type, status, location, created_by, guests)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
       RETURNING *`,
      [leadId, title, description || '', startTime, endTime, type || 'meeting', status || 'scheduled', location || '', req.user?.sub || '', JSON.stringify(guests || [])]
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
app.post('/api/calendar/callback', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Missing authorization code' });
  try {
    const { tokens } = await googleOAuthClient.getToken(code);
    await pool.query(
      `INSERT INTO google_calendar_tokens (user_id, access_token, refresh_token, scope, token_type, expiry_date, connected)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       ON CONFLICT (user_id) DO UPDATE SET
         access_token = EXCLUDED.access_token,
         refresh_token = COALESCE(EXCLUDED.refresh_token, google_calendar_tokens.refresh_token),
         scope = EXCLUDED.scope,
         token_type = EXCLUDED.token_type,
         expiry_date = EXCLUDED.expiry_date,
         connected = true,
         updated_at = NOW()`,
      [req.user.sub, tokens.access_token, tokens.refresh_token || '', tokens.scope || '', tokens.token_type || 'Bearer', tokens.expiry_date || 0]
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
    const result = await pool.query(`
      SELECT id, title, company, value, stage, probability, owner, 
             lead_source AS "leadSource", priority, contact_name AS "contactName", 
             contact_email AS "contactEmail", created_at AS "createdAt", 
             expected_close_date AS "expectedCloseDate", notes, tags 
      FROM deals 
      ORDER BY created_at DESC, id DESC
    `);
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
    
    const query = `
      INSERT INTO deals (id, title, company, value, stage, probability, owner, lead_source, priority, contact_name, contact_email, created_at, expected_close_date, notes, tags)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id, title, company, value, stage, probability, owner, lead_source AS "leadSource", priority, contact_name AS "contactName", contact_email AS "contactEmail", created_at AS "createdAt", expected_close_date AS "expectedCloseDate", notes, tags
    `;
    
    const result = await pool.query(query, [
      id, title, company, parseInt(value || 0, 10), stage, parseInt(probability || 0, 10), 
      JSON.stringify(owner || {}), leadSource, priority, contactName, contactEmail, 
      createdAt, expectedCloseDate || '', notes, JSON.stringify(tags || [])
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
    const result = await pool.query(`
      SELECT id, name, email, phone, company, role, 
             lifecycle_stage AS "lifecycleStage", lead_score AS "leadScore", 
             status, avatar, last_contacted AS "lastContacted", 
             total_deals_value AS "totalDealsValue", tags, notes 
      FROM contacts 
      ORDER BY id DESC
    `);
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
    
    const query = `
      INSERT INTO contacts (id, name, email, phone, company, role, lifecycle_stage, lead_score, status, avatar, last_contacted, total_deals_value, tags, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id, name, email, phone, company, role, lifecycle_stage AS "lifecycleStage", lead_score AS "leadScore", status, avatar, last_contacted AS "lastContacted", total_deals_value AS "totalDealsValue", tags, notes
    `;
    
    const result = await pool.query(query, [
      id, name, email, phone, company, role, lifecycleStage, parseInt(leadScore || 0, 10), 
      status || 'active', avatar, lastContacted, totalDealsValue, JSON.stringify(tags || []), notes
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
    const result = await pool.query(`
      SELECT id, name, domain, industry, size, 
             annual_revenue AS "annualRevenue", location, 
             contacts_count AS "contactsCount", total_deals_value AS "totalDealsValue", logo 
      FROM companies 
      ORDER BY id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching companies:', err);
    res.status(500).json({ error: 'Server error fetching companies' });
  }
});

// 4. Activities
app.get('/api/activities', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, type, title, description, timestamp, "user", target_name AS "targetName" 
      FROM activities 
      ORDER BY id DESC
    `);
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
    
    const query = `
      INSERT INTO activities (id, type, title, description, timestamp, "user", target_name)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, type, title, description, timestamp, "user", target_name AS "targetName"
    `;
    
    const result = await pool.query(query, [
      id, type, title, description, timestamp, JSON.stringify(user || {}), targetName || ''
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
    
    const query = `
      INSERT INTO workflows (id, title, description, trigger_cond, action, status, executions_count, last_executed, category, accent_color)
      VALUES ($1, $2, $3, $4, $5, $6, 0, 'Never', $7, $8)
      RETURNING id, title, description, trigger_cond AS "trigger", action, status, executions_count AS "executionsCount", last_executed AS "lastExecuted", category, accent_color AS "accentColor"
    `;
    
    const result = await pool.query(query, [
      id, title, description, trigger, action, status || 'active', category, accentColor || '#2563EB'
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
    const result = await pool.query(`
      SELECT id, title, description, priority, status, due_date AS "dueDate",
             assignee, related_to AS "relatedTo", created_at AS "createdAt"
      FROM tasks ORDER BY created_at DESC
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
    const result = await pool.query(
      `INSERT INTO tasks (id, title, description, priority, status, due_date, assignee, related_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
       RETURNING id, title, description, priority, status, due_date AS "dueDate", assignee, related_to AS "relatedTo", created_at AS "createdAt"`,
      [id, title, description || '', priority || 'medium', status || 'todo', dueDate || '', JSON.stringify(assignee || {}), JSON.stringify(relatedTo || null)]
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

// ===== RBAC: Users =====
app.get('/api/users', authorize('settings_user_management:view_add_edit_deactivate_user'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, u.email, u.avatar, u.provider, u.role_id, u.status, u.created_at AS "createdAt",
             r.name AS "roleName"
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      ORDER BY u.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/users/:id', authorize('settings_user_management:view_add_edit_deactivate_user'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role_id, status } = req.body;
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
    const roles = await pool.query('SELECT id, name, description, is_system AS "isSystem", created_at AS "createdAt" FROM roles ORDER BY id ASC');
    const rp = await pool.query(`
      SELECT rp.role_id AS "roleId", p.id AS "permissionId", p.module, p.action, p.label
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      ORDER BY p.module, p.action
    `);
    res.json({ roles: roles.rows, rolePermissions: rp.rows });
  } catch (err) {
    console.error('Error fetching roles:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/roles', authorize('settings_roles_permissions:create_edit_role_matrix'), async (req, res) => {
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
    const result = await pool.query(
      `INSERT INTO social_channels (type, display_name, credentials, page_id, status, webhook_verify_token, created_by)
       VALUES ($1, $2, $3, $4, 'disconnected', $5, $6)
       RETURNING id, type, display_name AS "displayName", page_id AS "pageId", status, created_at AS "createdAt"`,
      [type, displayName, encrypted, pageId || '', webhookToken, req.user.sub]
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
    // Replace all access for this user
    await pool.query('DELETE FROM user_channel_access WHERE user_id = $1', [userId]);
    if (channelIds.length > 0) {
      for (const cid of channelIds) {
        if (typeof cid !== 'number' || !Number.isInteger(cid) || cid <= 0) continue;
        await pool.query('INSERT INTO user_channel_access (user_id, channel_id, granted_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [userId, cid, req.user.sub]);
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
      // In production: lookup by channel secret or source ID
      const ch = await pool.query('SELECT id FROM social_channels WHERE type = $1 LIMIT 1', ['line']);
      if (ch.rows.length > 0) channelId = ch.rows[0].id;
    }
  }
  if (channelId) {
    // Store incoming message
    console.log(`Webhook: ${platform} message for channel #${channelId}`);
  }
  // Always respond 200 to webhook
  res.status(200).send('OK');
});

// ===== Audit Log =====
app.get('/api/audit-log', authorize('settings_user_management:view_add_edit_deactivate_user'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, user_id AS "userId", action, target_type AS "targetType", target_id AS "targetId", details, created_at AS "createdAt" FROM audit_log ORDER BY created_at DESC LIMIT 100'
    );
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
      'INSERT INTO customer_tags (name, color) VALUES ($1, $2) RETURNING id, name, color, created_at AS "createdAt"',
      [name.trim(), color || '#6366f1']
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
      'INSERT INTO lead_tags (lead_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.params.id, tagId]
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
      `INSERT INTO allocation_history (lead_id, sales_person_id, sales_person_name, sales_person_avatar, project_name, notes, is_reallocation)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, lead_id AS "leadId", sales_person_id AS "salesPersonId",
         sales_person_name AS "salesPersonName", sales_person_avatar AS "salesPersonAvatar",
         project_name AS "projectName", status, notes, is_reallocation AS "isReallocation",
         created_at AS "createdAt", updated_at AS "updatedAt"`,
      [leadId, salesPersonId, salesPersonName || '', salesPersonAvatar || '', projectName || null, notes || null, !!isReallocation]
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

export default app;



