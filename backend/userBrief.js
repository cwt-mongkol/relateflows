// Shared {name, avatar} lookup for JSONB display snapshots (deals.owner, tasks.assignee, ...) — the
// snapshot is kept alongside a real assigned_to FK column so the UI can render an avatar without a join,
// while the FK column is what queries actually filter/scope on. Extracted from automation.js so app.js
// can reuse it when writing assign-to-rep routes.
import pool from './db.js';

export async function getUserBrief(userId) {
  if (!userId) return { name: 'Unassigned', avatar: '' };
  try {
    const res = await pool.query('SELECT name, avatar FROM users WHERE id = $1', [userId]);
    if (res.rows.length === 0) return { name: 'Unassigned', avatar: '' };
    return { name: res.rows[0].name, avatar: res.rows[0].avatar || '' };
  } catch {
    return { name: 'Unassigned', avatar: '' };
  }
}
