// Keyset pagination helper — no OFFSET, uses cursor (last_seen values)
// Usage:
//   const { text, params, nextCursor } = keysetPaginate(
//     'SELECT id, title FROM deals WHERE tenant_id = $1',
//     [tenantId], req.query, { orderBy: 'created_at', tieBreaker: 'id' }
//   );
//   const result = await pool.query(text, params);
//   res.json({ items: result.rows.slice(0, limit), nextCursor });

export function keysetPaginate(baseQuery, baseParams, queryParams = {}, opts = {}) {
  const {
    orderBy = 'created_at',
    orderDir = 'DESC',
    tieBreaker = 'id',
    defaultLimit = 20,
    maxLimit = 100,
    cursorKey = null,   // key in cursor JSON (defaults to orderBy without table qualifier)
    cursorTieKey = null, // key in cursor JSON for tieBreaker
  } = opts;

  const cursorKeyActual = cursorKey || orderBy.replace(/^\w+\./, '');
  const cursorTieActual = cursorTieKey || tieBreaker.replace(/^\w+\./, '');

  // Parse & validate limit
  const limit = Math.min(Math.max(parseInt(queryParams.limit) || defaultLimit, 1), maxLimit);

  // Decode cursor: base64 JSON { created_at, id }
  let cursorValues = [];
  let cursorClause = '';
  const cursorRaw = queryParams.cursor;
  if (cursorRaw) {
    try {
      const buf = Buffer.from(cursorRaw, 'base64').toString('utf-8');
      const cursor = JSON.parse(buf);
      const cv = cursor[cursorKeyActual];
      const tv = cursor[cursorTieActual];
      if (cv !== undefined && tv !== undefined) {
        cursorValues = [cv, tv];
        const p1 = baseParams.length + 1;
        const p2 = baseParams.length + 2;
        const op = orderDir.toUpperCase() === 'DESC' ? '<' : '>';
        cursorClause = ` WHERE (${orderBy}, ${tieBreaker}) ${op} ($${p1}, $${p2})`;
      }
    } catch {
      // invalid cursor — treat as first page
    }
  }

  const allParams = [...baseParams, ...cursorValues, limit + 1];
  const text = `${baseQuery}${cursorClause} ORDER BY ${orderBy} ${orderDir}, ${tieBreaker} ${orderDir} LIMIT $${allParams.length}`;

  return { text, params: allParams, limit };
}

// After query, extract rows and generate nextCursor
export function paginationResult(rows, limit, cursorKey = 'created_at', cursorTieKey = 'id') {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  let nextCursor = null;
  if (hasMore && items.length > 0) {
    const last = items[items.length - 1];
    const payload = {};
    // Use the provided cursor keys, falling back to common aliases
    const ck = last[cursorKey] !== undefined ? cursorKey :
               last.created_at !== undefined ? 'created_at' :
               last.createdAt !== undefined ? 'createdAt' : null;
    const tk = last[cursorTieKey] !== undefined ? cursorTieKey :
               last.id !== undefined ? 'id' : null;
    if (ck && tk) {
      payload[ck] = last[ck];
      payload[tk] = last[tk];
      nextCursor = Buffer.from(JSON.stringify(payload)).toString('base64');
    }
  }
  return { items, nextCursor, hasMore };
}
