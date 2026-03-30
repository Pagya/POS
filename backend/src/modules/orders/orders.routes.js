const router = require('express').Router();
const { query } = require('../../db');
const authMiddleware = require('../../middleware/auth');

async function ownsBusiness(userId, businessId) {
  const { rows } = await query('SELECT id FROM businesses WHERE id=$1 AND owner_id=$2', [businessId, userId]);
  return rows.length > 0;
}

function calcBill(items, discountType, discountValue, taxRate) {
  const subtotal = items.reduce((s, i) => s + (i.price - (i.discount || 0)) * i.quantity, 0);
  const discountAmt = discountType === 'percent' ? (subtotal * discountValue) / 100 : (discountValue || 0);
  const afterDiscount = Math.max(0, subtotal - discountAmt);
  const taxAmount = taxRate ? (afterDiscount * taxRate) / 100 : 0;
  return { subtotal, taxAmount, total: afterDiscount + taxAmount };
}

// upsert customer, return customer_id
async function upsertCustomer(businessId, name, phone) {
  if (!phone) return null;
  const { rows } = await query(
    `INSERT INTO customers (business_id, name, phone)
     VALUES ($1,$2,$3)
     ON CONFLICT (business_id, phone) DO UPDATE SET name=EXCLUDED.name
     RETURNING id`,
    [businessId, name || 'Guest', phone]
  );
  return rows[0].id;
}

// POST /orders/:businessId
router.post('/:businessId', async (req, res) => {
  const {
    customer_name, customer_phone, table_number, notes,
    source = 'pos', order_type = 'dine-in',
    discount_type, discount_value = 0,
    payment_mode, items, tax_rate
  } = req.body;

  if (!items || !items.length) return res.status(400).json({ error: 'items required' });

  const ids = items.map(i => i.item_id);
  const { rows: dbItems } = await query(
    'SELECT id, name, price, available FROM items WHERE id = ANY($1) AND business_id=$2',
    [ids, req.params.businessId]
  );
  const itemMap = Object.fromEntries(dbItems.map(i => [i.id, i]));

  for (const item of items) {
    if (!itemMap[item.item_id]) return res.status(400).json({ error: `Item ${item.item_id} not found` });
    if (!itemMap[item.item_id].available) return res.status(400).json({ error: `"${itemMap[item.item_id].name}" is unavailable` });
  }

  // get business tax rate if not provided
  let effectiveTaxRate = tax_rate;
  if (effectiveTaxRate == null) {
    const { rows: [biz] } = await query('SELECT tax_rate FROM businesses WHERE id=$1', [req.params.businessId]);
    effectiveTaxRate = biz?.tax_rate || 0;
  }

  const enriched = items.map(i => ({
    ...i,
    price: itemMap[i.item_id].price,
    name: itemMap[i.item_id].name,
    discount: i.discount || 0,
  }));

  const { subtotal, taxAmount, total } = calcBill(enriched, discount_type, discount_value, effectiveTaxRate);
  const customer_id = await upsertCustomer(req.params.businessId, customer_name, customer_phone);

  try {
    const { rows: [order] } = await query(
      `INSERT INTO orders (business_id, customer_id, customer_name, customer_phone, table_number, notes,
        source, order_type, discount_type, discount_value, payment_mode, subtotal, tax_rate, tax_amount, total)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [req.params.businessId, customer_id, customer_name, customer_phone, table_number, notes,
       source, order_type, discount_type, discount_value, payment_mode,
       subtotal, effectiveTaxRate, taxAmount, total]
    );

    for (const item of enriched) {
      await query(
        'INSERT INTO order_items (order_id, item_id, name, price, quantity, discount) VALUES ($1,$2,$3,$4,$5,$6)',
        [order.id, item.item_id, item.name, item.price, item.quantity, item.discount]
      );
    }
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /orders/:businessId
router.get('/:businessId', authMiddleware, async (req, res) => {
  if (!(await ownsBusiness(req.user.userId, req.params.businessId)))
    return res.status(403).json({ error: 'Forbidden' });

  const { status, date, range } = req.query;
  let sql = `SELECT o.*,
    json_agg(json_build_object('name', oi.name, 'price', oi.price, 'quantity', oi.quantity, 'discount', oi.discount)) AS items
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.business_id=$1`;
  const params = [req.params.businessId];
  let idx = 2;

  if (status && status !== 'all') { sql += ` AND o.status=$${idx++}`; params.push(status); }
  if (date === 'today') { sql += ` AND o.created_at::date=CURRENT_DATE`; }
  else if (date) { sql += ` AND o.created_at::date=$${idx++}`; params.push(date); }
  if (range === '7d') { sql += ` AND o.created_at >= NOW() - INTERVAL '7 days'`; }
  if (range === '30d') { sql += ` AND o.created_at >= NOW() - INTERVAL '30 days'`; }

  sql += ' GROUP BY o.id ORDER BY o.created_at DESC';
  const { rows } = await query(sql, params);
  res.json(rows);
});

// GET /orders/:businessId/:id
router.get('/:businessId/:id', authMiddleware, async (req, res) => {
  if (!(await ownsBusiness(req.user.userId, req.params.businessId)))
    return res.status(403).json({ error: 'Forbidden' });

  const { rows } = await query(
    `SELECT o.*,
      json_agg(json_build_object('id', oi.id, 'name', oi.name, 'price', oi.price, 'quantity', oi.quantity, 'discount', oi.discount)) AS items
     FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.id=$1 AND o.business_id=$2 GROUP BY o.id`,
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

// PATCH /orders/:businessId/:id/paid
router.patch('/:businessId/:id/paid', authMiddleware, async (req, res) => {
  if (!(await ownsBusiness(req.user.userId, req.params.businessId)))
    return res.status(403).json({ error: 'Forbidden' });

  const { rows } = await query(
    'UPDATE orders SET paid=true WHERE id=$1 AND business_id=$2 RETURNING *',
    [req.params.id, req.params.businessId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

module.exports = router;
