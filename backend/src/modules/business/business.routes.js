const router = require('express').Router();
const { query } = require('../../db');
const authMiddleware = require('../../middleware/auth');

// POST /businesses — create business
router.post('/', authMiddleware, async (req, res) => {
  const { name, type } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'name and type required' });

  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();
  try {
    const { rows } = await query(
      'INSERT INTO businesses (owner_id, name, slug, type) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.user.userId, name, slug, type]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /businesses — list my businesses
router.get('/', authMiddleware, async (req, res) => {
  const { rows } = await query(
    'SELECT * FROM businesses WHERE owner_id=$1 ORDER BY created_at DESC',
    [req.user.userId]
  );
  res.json(rows);
});

// GET /businesses/:id
router.get('/:id', authMiddleware, async (req, res) => {
  const { rows } = await query(
    'SELECT * FROM businesses WHERE id=$1 AND owner_id=$2',
    [req.params.id, req.user.userId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

module.exports = router;
