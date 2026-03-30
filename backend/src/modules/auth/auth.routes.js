const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../../db');

// POST /auth/signup
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'name, email, password required' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await query(
      'INSERT INTO users (name, email, password) VALUES ($1,$2,$3) RETURNING id, name, email',
      [name, email, hash]
    );
    const token = jwt.sign({ userId: rows[0].id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ user: rows[0], token });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: err.message });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await query('SELECT * FROM users WHERE email=$1', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, rows[0].password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: rows[0].id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id: rows[0].id, name: rows[0].name, email: rows[0].email }, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
