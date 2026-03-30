const router = require('express').Router();
const { query } = require('../../db');
const authMiddleware = require('../../middleware/auth');

// POST /feedback — submit feedback after order completed
router.post('/', async (req, res) => {
  const { order_id, rating, comment } = req.body;
  if (!order_id || !rating) return res.status(400).json({ error: 'order_id and rating required' });
  if (rating < 1 || rating > 5) return res.status(400).json({ error: 'rating must be 1–5' });

  // verify order exists and is completed
  const { rows: [order] } = await query(
    'SELECT id, business_id, status FROM orders WHERE id=$1',
    [order_id]
  );
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status !== 'completed') return res.status(400).json({ error: 'Feedback only for completed orders' });

  // prevent duplicate feedback
  const { rows: existing } = await query('SELECT id FROM feedback WHERE order_id=$1', [order_id]);
  if (existing.length) return res.status(409).json({ error: 'Feedback already submitted' });

  const { rows } = await query(
    'INSERT INTO feedback (business_id, order_id, rating, comment) VALUES ($1,$2,$3,$4) RETURNING *',
    [order.business_id, order_id, rating, comment]
  );
  res.status(201).json(rows[0]);
});

// GET /feedback/:businessId — dashboard feedback list
router.get('/:businessId', authMiddleware, async (req, res) => {
  const { rows } = await query(
    `SELECT f.*, o.customer_name
     FROM feedback f
     JOIN orders o ON o.id = f.order_id
     WHERE f.business_id=$1
     ORDER BY f.created_at DESC
     LIMIT 50`,
    [req.params.businessId]
  );

  const { rows: [avg] } = await query(
    'SELECT ROUND(AVG(rating)::numeric, 1) AS average FROM feedback WHERE business_id=$1',
    [req.params.businessId]
  );

  res.json({ average_rating: avg.average, feedback: rows });
});

module.exports = router;
