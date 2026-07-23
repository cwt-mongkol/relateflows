import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import pool from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'relateflows-dev-secret';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

// --- Helpers ---

function signAccessToken(userPayload) {
  return jwt.sign(userPayload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

function signRefreshToken(userPayload) {
  return jwt.sign(userPayload, JWT_SECRET + '-refresh', { expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d` });
}

// JWT auth middleware (access token)
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ error: 'Invalid or expired token', code: 'TOKEN_EXPIRED' });
    req.user = user;
    next();
  });
}

// --- Auth Routes ---

// Shared: return { accessToken, refreshToken, user }
function issueTokens(user) {
  const userPayload = { sub: user.id, name: user.name, email: user.email, picture: user.avatar, provider: user.provider };
  const accessToken = signAccessToken(userPayload);
  const refreshToken = signRefreshToken(userPayload);
  // Store refresh token in DB (for revocation)
  pool.query(
    `INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL '${REFRESH_TOKEN_EXPIRY_DAYS} days') ON CONFLICT DO NOTHING`,
    [refreshToken, user.id]
  ).catch(err => console.error('Failed to store refresh token:', err.message));
  return { accessToken, refreshToken, user };
}

// POST /api/auth/google
app.post('/api/auth/google', (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'Missing credential' });
  try {
    // In production: verify with Google's tokeninfo endpoint or google-auth-library
    const payload = JSON.parse(Buffer.from(credential.split('.')[1], 'base64').toString());
    const user = {
      id: payload.sub,
      name: payload.name || 'Google User',
      email: payload.email || '',
      avatar: payload.picture || '',
      provider: 'google',
    };
    res.json(issueTokens(user));
  } catch (err) {
    res.status(401).json({ error: 'Invalid Google credential' });
  }
});

// POST /api/auth/line
app.post('/api/auth/line', (req, res) => {
  // In production: exchange LINE auth code for access token, then fetch profile
  const user = {
    id: `line-${Date.now()}`,
    name: 'LINE User',
    email: '',
    avatar: '',
    provider: 'line',
  };
  res.json(issueTokens(user));
});

// POST /api/auth/facebook
app.post('/api/auth/facebook', (req, res) => {
  // In production: verify Facebook access token with /me endpoint
  const user = {
    id: `fb-${Date.now()}`,
    name: 'Facebook User',
    email: '',
    avatar: '',
    provider: 'facebook',
  };
  res.json(issueTokens(user));
});

// POST /api/auth/refresh — exchange refresh token for new access token
app.post('/api/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Missing refresh token' });

  // Verify the refresh token signature
  jwt.verify(refreshToken, JWT_SECRET + '-refresh', (err, userPayload) => {
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

// --- Product Routes (tb_products) ---

app.get('/api/products', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tb_products ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/products', authenticateToken, async (req, res) => {
  try {
    const { leadId, name, quantity, price, description, notes, status } = req.body;
    const result = await pool.query(
      `INSERT INTO tb_products (lead_id, name, quantity, price, description, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [leadId, name, quantity || 1, price || 0, description || '', notes || '', status || 'pending']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/products/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const fields = req.body;
    const setClauses = [];
    const values = [];
    let idx = 1;
    for (const [key, val] of Object.entries(fields)) {
      setClauses.push(`${key} = $${idx}`);
      values.push(val);
      idx++;
    }
    if (setClauses.length === 0) return res.status(400).json({ error: 'No fields to update' });
    setClauses.push(`updated_at = NOW()`);
    const query = `UPDATE tb_products SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`;
    values.push(parseInt(id));
    const result = await pool.query(query, values);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/products/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM tb_products WHERE id = $1 RETURNING id', [parseInt(id)]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted', id: parseInt(id) });
  } catch (err) {
    console.error('Error deleting product:', err);
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
      id, title, company, parseInt(value || 0), stage, parseInt(probability || 0), 
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
    
    const result = await pool.query(query, [stage, parseInt(probability), id]);
    
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
      id, name, email, phone, company, role, lifecycleStage, parseInt(leadScore || 0), 
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

export default app;
