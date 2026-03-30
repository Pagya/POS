const router = require('express').Router();
const { query } = require('../../db');
const authMiddleware = require('../../middleware/auth');

async function ownsBusiness(userId, businessId) {
  const { rows } = await query(
    'SELECT id FROM businesses WHERE id=$1 AND owner_id=$2',
    [businessId, userId]
  );
  return rows.length > 0;
}

function calcTotal(items, discountType, discountValue) {
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  if (!discountValue) return subtotal;
  if (discountType === 'percent') return subtotal - (subtotal * discountValue) / 100;
  return subtotal - discountValue;
}

// POST /orders/:businessId  — create order (POS or online)
router.post('/:businessId', async (req, res) => {
  const {
    customer_name, customer_phone, table_number, notes,
    source = 'pos', discount_type, discount_value = 0,
    payment_mode, items
  } = req.body;

  if (!items || !items.length)
    return res.status(400).json({ error: 'items required' });

  // fetch item prices from DB to avoid price tampering
  const ids = items.map(i => i.item_id);
  const { rows: dbItems } = await query(
    `SELECT id, name, price, available FROM items WHERE id = ANY($1) AND business_id=$2`,
    [ids, req.params.businessId]
  );

  const itemMap = Object.fromEntries(dbItems.map(i => [i.id, i]));

  for (const item of items) {
    if (!itemMap[item.item_id]) return res.status(400).json({ error: `Item ${item.item_id} not found` });
    if (!itemMap[item.item_id].available) return res.status(400).json({ error: `Item "${itemMap[item.item_id].name}" is unavailable` });
  }

  const enriched = items.map(i => ({ ...i, price: itemMap[i.item_id].price, name: itemMap[i.item_id].name }));
  const total = calcTotal(enriched, discount_type, discount_value);

  const client = await require('../../db').query; // reuse pool
  try {
    const { rows: [order] } = await query(
      `INSERT INTO orders (business_id, customer_name, customer_phone, table_number, notes, source,
        discount_type, discount_value, payment_mode, total)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [req.params.businessId, customer_name, customer_phone, table_number, notes,
       source, discount_type, discount_value, payment_mode, total]
    );

    for (const item of enriched) {
      await query(
        'INSERT INTO order_items (order_id, item_id, name, price, quantity) VALUES ($1,$2,$3,$4,$5)',
        [order.id, item.item_id, item.name, item.price, item.quantity]
      );
    }

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /orders/:businessId — list orders (with optional date filter)
router.get('/:businessId', authMiddleware, async (req, res) => {
  if (!(await ownsBusiness(req.user.userId, req.params.businessId)))
    return res.status(403).json({ error: 'Forbidden' });

  const { status, date } = req.query;
  let sql = `SELECT o.*, 
    json_agg(json_build_object('name', oi.name, 'price', oi.price, 'quantity', oi.quantity)) AS items
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.business_id=$1`;
  const params = [req.params.businessId];
  let idx = 2;

  if (status) { sql += ` AND o.status=$${idx++}`; params.push(status); }
  if (date)   { sql += ` AND o.created_at::date=$${idx++}`; params.push(date); }

  sql += ' GROUP BY o.id ORDER BY o.created_at DESC';

  const { rows } = await query(sql, params);
  res.json(rows);
});

// GET /orders/:businessId/:id — single order
router.get('/:businessId/:id', authMiddleware, async (req, res) => {
  if (!(await ownsBusiness(req.user.userId, req.params.businessId)))
    return res.status(403).json({ error: 'Forbidden' });

  const { rows } = await query(
    `SELECT o.*,
      json_agg(json_build_object('id', oi.id, 'name', oi.name, 'price', oi.price, 'quantity', oi.quantity)) AS items
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.id=$1 AND o.business_id=$2
     GROUP BY o.id`,
    [req.params.id, req.params.businessId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// PATCH /orders/:businessId/:id/status
router.patch('/:businessId/:id/status', authMiddleware, async (req, res) => {
  if (!(await ownsBusiness(req.user.userId, req.params.businessId)))
    return res.status(403).json({ error: 'Forbidden' });

  const { status } = req.body;
  const valid = ['new', 'processing', 'completed', 'cancelled'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const { rows } = await query(
    'UPDATE orders SET status=$1 WHERE id=$2 AND business_id=$3 RETURNING *',
    [status, req.params.id, req.params.businessId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

module.exports = router;
