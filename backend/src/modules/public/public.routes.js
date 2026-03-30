const router = require('express').Router();
const { query } = require('../../db');

// GET /public/:slug — get business info + catalog for public ordering page
router.get('/:slug', async (req, res) => {
  const { rows: [business] } = await query(
    'SELECT id, name, type FROM businesses WHERE slug=$1',
    [req.params.slug]
  );
  if (!business) return res.status(404).json({ error: 'Business not found' });

  const { rows: items } = await query(
    `SELECT i.id, i.name, i.price, i.type, i.available, c.name AS category
     FROM items i
     LEFT JOIN categories c ON c.id = i.category_id
     WHERE i.business_id=$1 AND i.available=true
     ORDER BY c.name, i.name`,
    [business.id]
  );

  res.json({ business, items });
});

module.exports = router;
