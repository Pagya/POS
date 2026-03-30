const router = require('express').Router();
const { query } = require('../../db');
const authMiddleware = require('../../middleware/auth');

async function ownsBusiness(userId, businessId) {
  const { rows } = await query('SELECT id FROM businesses WHERE id=$1 AND owner_id=$2', [businessId, userId]);
  return rows.length > 0;
}

// GET /analytics/:businessId?range=7d|30d|today
router.get('/:businessId', authMiddleware, async (req, res) => {
  if (!(await ownsBusiness(req.user.userId, req.params.businessId)))
    return res.status(403).json({ error: 'Forbidden' });

  const bid = req.params.businessId;
  const range = req.query.range || '7d';

  let interval;
  if (range === 'today') interval = `o.created_at::date = CURRENT_DATE`;
  else if (range === '30d') interval = `o.created_at >= NOW() - INTERVAL '30 days'`;
  else interval = `o.created_at >= NOW() - INTERVAL '7 days'`;

  const [revenue, topItems, daily, avgOrder] = await Promise.all([
    // total revenue + order count
    query(
      `SELECT COUNT(*) AS order_count, COALESCE(SUM(total),0) AS revenue
       FROM orders WHERE business_id=$1 AND ${interval} AND status != 'cancelled'`,
      [bid]
    ),
    // top selling items
    query(
      `SELECT oi.name, SUM(oi.quantity) AS qty, SUM(oi.price * oi.quantity) AS revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.business_id=$1 AND ${interval} AND o.status != 'cancelled'
       GROUP BY oi.name ORDER BY qty DESC LIMIT 8`,
      [bid]
    ),
    // daily revenue breakdown
    query(
      `SELECT o.created_at::date AS date,
         COUNT(*) AS orders,
         COALESCE(SUM(total),0) AS revenue
       FROM orders o
       WHERE business_id=$1 AND ${interval} AND status != 'cancelled'
       GROUP BY date ORDER BY date ASC`,
      [bid]
    ),
    // average order value
    query(
      `SELECT ROUND(AVG(total)::numeric,2) AS avg_order
       FROM orders WHERE business_id=$1 AND ${interval} AND status != 'cancelled'`,
      [bid]
    ),
  ]);

  res.json({
    order_count: parseInt(revenue.rows[0].order_count),
    revenue: parseFloat(revenue.rows[0].revenue),
    avg_order_value: parseFloat(avgOrder.rows[0].avg_order) || 0,
    top_items: topItems.rows,
    daily_breakdown: daily.rows,
  });
});

module.exports = router;
