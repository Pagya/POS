const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const OpenAI = require('openai');
const { query } = require('../../db');
const authMiddleware = require('../../middleware/auth');

// ── File upload setup ──────────────────────────────────────
const uploadDir = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ── OpenAI client (lazy — only needed for image parse) ─────
function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// ── Auth helper ────────────────────────────────────────────
async function ownsBusiness(userId, businessId) {
  const { rows } = await query(
    'SELECT id FROM businesses WHERE id=$1 AND owner_id=$2',
    [businessId, userId]
  );
  return rows.length > 0;
}

// ── POST /menus/:businessId/parse-image ────────────────────
// Upload an image and get back parsed menu text (no DB save yet)
router.post('/:businessId/parse-image', authMiddleware, upload.single('image'), async (req, res) => {
  if (!(await ownsBusiness(req.user.userId, req.params.businessId)))
    return res.status(403).json({ error: 'Forbidden' });

  if (!req.file) return res.status(400).json({ error: 'image file required' });

  try {
    const openai = getOpenAI();
    const imageData = fs.readFileSync(req.file.path);
    const base64 = imageData.toString('base64');
    const mimeType = req.file.mimetype;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are a menu parser. Extract all menu items from this restaurant menu image.
Format the output as a clean, readable text menu with:
- Section/category headers in ALL CAPS
- Each item on its own line: "Item Name - Price"
- Include descriptions if visible
- Preserve the original structure as much as possible
Only output the menu content, nothing else.`,
            },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
          ],
        },
      ],
      max_tokens: 2000,
    });

    const parsedText = response.choices[0].message.content;
    // Return the temp filename so the client can reference it when saving
    res.json({ parsed_text: parsedText, temp_file: req.file.filename });
  } catch (err) {
    // Clean up uploaded file on error
    fs.unlink(req.file.path, () => {});
    res.status(500).json({ error: err.message });
  }
});

// ── POST /menus/:businessId ────────────────────────────────
// Save a menu (text or confirmed image parse)
router.post('/:businessId', authMiddleware, async (req, res) => {
  if (!(await ownsBusiness(req.user.userId, req.params.businessId)))
    return res.status(403).json({ error: 'Forbidden' });

  const { restaurant_name, name, source = 'text', content, temp_file } = req.body;
  if (!restaurant_name || !name || !content)
    return res.status(400).json({ error: 'restaurant_name, name, content required' });

  const image_url = temp_file ? `/uploads/${temp_file}` : null;

  const { rows } = await query(
    `INSERT INTO restaurant_menus (business_id, restaurant_name, name, source, content, image_url)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [req.params.businessId, restaurant_name, name, source, content, image_url]
  );
  res.status(201).json(rows[0]);
});

// ── GET /menus/:businessId ─────────────────────────────────
router.get('/:businessId', authMiddleware, async (req, res) => {
  if (!(await ownsBusiness(req.user.userId, req.params.businessId)))
    return res.status(403).json({ error: 'Forbidden' });

  const { rows } = await query(
    'SELECT * FROM restaurant_menus WHERE business_id=$1 ORDER BY restaurant_name, name',
    [req.params.businessId]
  );
  res.json(rows);
});

// ── GET /menus/:businessId/:id ─────────────────────────────
router.get('/:businessId/:id', authMiddleware, async (req, res) => {
  if (!(await ownsBusiness(req.user.userId, req.params.businessId)))
    return res.status(403).json({ error: 'Forbidden' });

  const { rows } = await query(
    'SELECT * FROM restaurant_menus WHERE id=$1 AND business_id=$2',
    [req.params.id, req.params.businessId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// ── PATCH /menus/:businessId/:id ───────────────────────────
router.patch('/:businessId/:id', authMiddleware, async (req, res) => {
  if (!(await ownsBusiness(req.user.userId, req.params.businessId)))
    return res.status(403).json({ error: 'Forbidden' });

  const { restaurant_name, name, content } = req.body;
  const updates = [];
  const values = [];
  let i = 1;

  if (restaurant_name !== undefined) { updates.push(`restaurant_name=$${i++}`); values.push(restaurant_name); }
  if (name !== undefined) { updates.push(`name=$${i++}`); values.push(name); }
  if (content !== undefined) { updates.push(`content=$${i++}`); values.push(content); }
  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });

  updates.push(`updated_at=NOW()`);
  values.push(req.params.id, req.params.businessId);

  const { rows } = await query(
    `UPDATE restaurant_menus SET ${updates.join(',')} WHERE id=$${i++} AND business_id=$${i} RETURNING *`,
    values
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// ── DELETE /menus/:businessId/:id ──────────────────────────
router.delete('/:businessId/:id', authMiddleware, async (req, res) => {
  if (!(await ownsBusiness(req.user.userId, req.params.businessId)))
    return res.status(403).json({ error: 'Forbidden' });

  const { rows } = await query(
    'SELECT image_url FROM restaurant_menus WHERE id=$1 AND business_id=$2',
    [req.params.id, req.params.businessId]
  );
  if (rows[0]?.image_url) {
    const filePath = path.join(__dirname, '../../../', rows[0].image_url);
    fs.unlink(filePath, () => {});
  }

  await query('DELETE FROM restaurant_menus WHERE id=$1 AND business_id=$2', [req.params.id, req.params.businessId]);
  res.json({ success: true });
});

module.exports = router;
