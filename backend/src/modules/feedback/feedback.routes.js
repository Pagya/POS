const router = require('express').Router();
const { query } = require('../../db');
const authMiddleware = require('../../middleware/auth');

// POST /feedback
router.post('/', async (req, res) => {
  const { order_id, rating, comment } = req.body;
  if (!order_id || !rating) return res.status(400).json({ error: 'order_id and rating required' });
  if (rating < 1 || rating > 5) return res.status(400).json({ error: 'rating must be 1–5' });

  const { rows: [order] } = await query('SELECT id, business_id, status FROM orders WHERE id=$1', [order_id]);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status !== 'completed') return res.status(400).json({ error: 'Feedback only for completed orders' });

  const { rows: existing } = await query('SELECT id FROM feedback WHERE order_id=$1', [order_id]);
  if (existing.length) return res.status(409).json({ error: 'Feedback already submitted' });

  const { rows } = await query(
    'INSERT INTO feedback (business_id, order_id, rating, comment) VALUES ($1,$2,$3,$4) RETURNING *',
    [order.business_id, order_id, rating, comment]
  );
  res.status(201).json(rows[0]);
});

// GET /feedback/:businessId — with insights
router.get('/:businessId', authMiddleware, async (req, res) => {
  const [feedbackRows, avgRow, trendRows] = await Promise.all([
    query(
      `SELECT f.*, o.customer_name FROM feedback f
       JOIN orders o ON o.id = f.order_id
       WHERE f.business_id=$1 ORDER BY f.created_at DESC LIMIT 50`,
      [req.params.businessId]
    ),
    query(
      'SELECT ROUND(AVG(rating)::numeric,1) AS average, COUNT(*) AS total FROM feedback WHERE business_id=$1',
      [req.params.businessId]
    ),
    // 7-day rating trend
    query(
      `SELECT created_at::date AS date, ROUND(AVG(rating)::numeric,1) AS avg_rating, COUNT(*) AS count
       FROM feedback WHERE business_id=$1 AND created_at >= NOW() - INTERVAL '7 days'
       GROUP BY date ORDER BY date ASC`,
      [req.params.businessId]
    ),
  ]);

  const feedback = feedbackRows.rows;

  // keyword frequency from comments (simple word count)
  const stopWords = new Set(['the','a','an','is','it','was','and','or','but','in','on','at','to','for','of','with','this','that','i','my','we','our','your','very','so','not','no','yes','good','bad']);
  const wordFreq: Record<string, number> = {};
  feedback.forEach((f: any) => {
    if (!f.comment) return;
    f.comment.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).forEach((w: string) => {
      if (w.length > 2 && !stopWords.has(w)) wordFreq[w] = (wordFreq[w] || 0) + 1;
    });
  });
  const topKeywords = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([word, count]) => ({ word, count }));

  const positive = feedback.filter((f: any) => f.rating >= 4);
  const negative = feedback.filter((f: any) => f.rating <= 2);

  res.json({
    average_rating: avgRow.rows[0].average,
    total_feedback: parseInt(avgRow.rows[0].total),
    trend: trendRows.rows,
    top_keywords: topKeywords,
    positive_count: positive.length,
    negative_count: negative.length,
    feedback,
  });
});

module.exports = router;
