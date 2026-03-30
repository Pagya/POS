const router = require('express').Router();
const { query } = require('../../db');
const authMiddleware = require('../../middleware/auth');

// helper — verify business belongs to user
async function ownsBusiness(userId, businessId) {
  const { rows } = await query(
    'SELECT id FROM businesses WHERE id=$1 AND owner_id=$2',
    [businessId, userId]
  );
  return rows.length > 0;
}

/* ── CATEGORIES ── */

// POST /catalog/:businessId/categories
router.post('/:businessId/categories', authMiddleware, async (req, res) => {
  if (!(await ownsBusiness(req.user.userId, req.params.businessId)))
    return res.status(403).json({ error: 'Forbidden' });

  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  const { rows } = await query(
    'INSERT INTO categories (business_id, name) VALUES ($1,$2) RETURNING *',
    [req.params.businessId, name]
  );
  res.status(201).json(rows[0]);
});

// GET /catalog/:businessId/categories
router.get('/:businessId/categories', authMiddleware, async (req, res) => {
  if (!(await ownsBusiness(req.user.userId, req.params.businessId)))
    return res.status(403).json({ error: 'Forbidden' });

  const { rows } = await query(
    'SELECT * FROM categories WHERE business_id=$1 ORDER BY name',
    [req.params.businessId]
  );
  res.json(rows);
});

/* ── ITEMS ── */

// POST /catalog/:businessId/items
router.post('/:businessId/items', authMiddleware, async (req, res) => {
  if (!(await ownsBusiness(req.user.userId, req.params.businessId)))
    return res.status(403).json({ error: 'Forbidden' });

  const { name, price, type, category_id, available } = req.body;
  if (!name || price == null || !type)
    return res.status(400).json({ error: 'name, price, type required' });

  const { rows } = await query(
    `INSERT INTO items (business_id, category_id, name, price, type, available)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [req.params.businessId, category_id || null, name, price, type, available !== false]
  );
  res.status(201).json(rows[0]);
});

// GET /catalog/:businessId/items
router.get('/:businessId/items', async (req, res) => {
  // public-safe — no auth needed (used by public ordering page too)
  const { rows } = await query(
    `SELECT i.*, c.name AS category_name
     FROM items i
     LEFT JOIN categories c ON c.id = i.category_id
     WHERE i.business_id=$1
     ORDER BY c.name, i.name`,
    [req.params.businessId]
  );
  res.json(rows);
});

// PATCH /catalog/:businessId/items/:id
router.patch('/:businessId/items/:id', authMiddleware, async (req, res) => {
  if (!(await ownsBusiness(req.user.userId, req.params.businessId)))
    return res.status(403).json({ error: 'Forbidden' });

  const fields = ['name', 'price', 'type', 'category_id', 'available'];
  const updates = [];
  const values = [];
  let i = 1;

  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f}=$${i++}`);
      values.push(req.body[f]);
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });

  values.push(req.params.id, req.params.businessId);
  const { rows } = await query(
    `UPDATE items SET ${updates.join(',')} WHERE id=$${i++} AND business_id=$${i} RETURNING *`,
    values
  );
  if (!rows.length) return res.status(404).json({ error: 'Item not found' });
  res.json(rows[0]);
});

// DELETE /catalog/:businessId/items/:id
router.delete('/:businessId/items/:id', authMiddleware, async (req, res) => {
  if (!(await ownsBusiness(req.user.userId, req.params.businessId)))
    return res.status(403).json({ error: 'Forbidden' });

  await query('DELETE FROM items WHERE id=$1 AND business_id=$2', [req.params.id, req.params.businessId]);
  res.json({ success: true });
});

module.exports = router;
