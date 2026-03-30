const router = require('express').Router();
const { query } = require('../../db');
const authMiddleware = require('../../middleware/auth');

async function ownsBusiness(userId, businessId) {
  const { rows } = await query('SELECT id FROM businesses WHERE id=$1 AND owner_id=$2', [businessId, userId]);
  return rows.length > 0;
}

// GET /customers/:businessId/lookup?phone=xxx — auto-lookup returning customer
router.get('/:businessId/lookup', authMiddleware, async (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: 'phone required' });

  const { rows: [customer] } = await query(
    'SELECT * FROM customers WHERE business_id=$1 AND phone=$2',
    [req.params.businessId, phone]
  );
  if (!customer) return res.json(null);

  // last 5 orders
  const { rows: orders } = await query(
    `SELECT o.id, o.total, o.status, o.created_at,
      json_agg(json_build_object('name', oi.name, 'quantity', oi.quantity)) AS items
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.customer_id=$1
     GROUP BY o.id ORDER BY o.created_at DESC LIMIT 5`,
    [customer.id]
  );
  res.json({ ...customer, recent_orders: orders });
});

// GET /customers/:businessId — list all customers
router.get('/:businessId', authMiddleware, async (req, res) => {
  if (!(await ownsBusiness(req.user.userId, req.params.businessId)))
    return res.status(403).json({ error: 'Forbidden' });

  const { rows } = await query(
    `SELECT c.*, COUNT(o.id) AS order_count, COALESCE(SUM(o.total),0) AS total_spent
     FROM customers c
     LEFT JOIN orders o ON o.customer_id = c.id
     WHERE c.business_id=$1
     GROUP BY c.id ORDER BY c.created_at DESC`,
    [req.params.businessId]
  );
  res.json(rows);
});

module.exports = router;
