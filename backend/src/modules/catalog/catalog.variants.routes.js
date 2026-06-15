/**
 * Variant Groups, Options, and Price Resolution routes
 * Mounted at: /api/items
 *
 * Sub-paths:
 *   /:item_id/variant-groups — CRUD for variant groups and options
 *   /:item_id/resolve-price  — price resolution endpoint
 */
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const router = require('express').Router({ mergeParams: true });
const { query } = require('../../db');
const authMiddleware = require('../../middleware/auth');
const { resolvePrice } = require('./catalog.variants.helpers');

// ── Multer Configuration ─────────────────────────────────────────────────────

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../../uploads/items/'),
  filename: (req, file, cb) => cb(null, `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      const err = new Error('INVALID_MIME');
      err.code = 'INVALID_MIME';
      cb(err, false);
    }
  },
});

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * requirePermission middleware
 * Checks that the authenticated user is the owner of the business
 * that owns the item referenced by :item_id.
 * Owner role implies products:write permission per RBAC spec.
 */
function requirePermission(permission) {
  return async (req, res, next) => {
    try {
      const { item_id } = req.params;
      const userId = req.user.userId;

      const { rows } = await query(
        `SELECT i.id FROM items i
         JOIN businesses b ON b.id = i.business_id
         WHERE i.id = $1 AND b.owner_id = $2`,
        [item_id, userId]
      );

      if (rows.length === 0) {
        // Could be 404 (item not found) or 403 (not owner).
        // Check if item exists at all to differentiate.
        const itemCheck = await query('SELECT id FROM items WHERE id = $1', [item_id]);
        if (itemCheck.rows.length === 0) {
          return res.status(404).json({ data: null, error: 'Item not found', meta: {} });
        }
        return res.status(403).json({ data: null, error: 'Forbidden', meta: {} });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Verify item exists and belongs to the authenticated user's business.
 * Attaches req.item with { id, business_id } on success.
 */
async function verifyItemOwnership(req, res) {
  const { item_id } = req.params;
  const userId = req.user.userId;

  const { rows } = await query(
    `SELECT i.id, i.business_id FROM items i
     JOIN businesses b ON b.id = i.business_id
     WHERE i.id = $1 AND b.owner_id = $2`,
    [item_id, userId]
  );

  if (rows.length === 0) {
    return null;
  }
  return rows[0];
}

// ── Variant Group Routes ─────────────────────────────────────────────────────

/**
 * GET /api/items/:item_id/variant-groups
 * List all variant groups for an item.
 * Requires authentication; item must belong to user's business.
 */
router.get('/:item_id/variant-groups', authMiddleware, async (req, res, next) => {
  try {
    const { item_id } = req.params;
    const userId = req.user.userId;

    // Verify item belongs to authenticated user's business
    const itemCheck = await query(
      `SELECT i.id FROM items i
       JOIN businesses b ON b.id = i.business_id
       WHERE i.id = $1 AND b.owner_id = $2`,
      [item_id, userId]
    );

    if (itemCheck.rows.length === 0) {
      return res.status(404).json({ data: null, error: 'Item not found', meta: {} });
    }

    const { rows } = await query(
      `SELECT vg.id, vg.item_id, vg.name, vg.is_required, vg.created_at
       FROM variant_groups vg
       WHERE vg.item_id = $1
       ORDER BY vg.created_at ASC`,
      [item_id]
    );

    return res.json({ data: rows, error: null, meta: { total: rows.length } });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/items/:item_id/variant-groups
 * Create a new variant group for an item.
 * Requires authentication + products:write (owner).
 */
router.post('/:item_id/variant-groups', authMiddleware, requirePermission('products:write'), async (req, res, next) => {
  try {
    const { item_id } = req.params;
    const { name, is_required } = req.body;

    // Validate name
    if (!name || (typeof name === 'string' && name.trim().length === 0)) {
      return res.status(400).json({ data: null, error: 'name is required', meta: {} });
    }

    const trimmedName = name.trim();

    // Insert — let unique constraint catch duplicates
    try {
      const { rows } = await query(
        `INSERT INTO variant_groups (item_id, name, is_required)
         VALUES ($1, $2, $3)
         RETURNING id, item_id, name, is_required, created_at`,
        [item_id, trimmedName, is_required === true]
      );

      return res.status(201).json({ data: rows[0], error: null, meta: {} });
    } catch (err) {
      // Unique violation: duplicate name for this item
      if (err.code === '23505') {
        return res.status(409).json({
          data: null,
          error: 'Variant group name already exists',
          meta: {},
        });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/items/:item_id/variant-groups/:group_id
 * Update a variant group.
 * Requires authentication + products:write (owner).
 */
router.put('/:item_id/variant-groups/:group_id', authMiddleware, requirePermission('products:write'), async (req, res, next) => {
  try {
    const { item_id, group_id } = req.params;
    const { name, is_required } = req.body;

    // Validate name if provided
    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return res.status(400).json({ data: null, error: 'name must be a non-empty string', meta: {} });
    }

    // Build dynamic update
    const updates = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(name.trim());
    }
    if (is_required !== undefined) {
      updates.push(`is_required = $${idx++}`);
      values.push(is_required === true);
    }

    if (updates.length === 0) {
      return res.status(400).json({ data: null, error: 'Nothing to update', meta: {} });
    }

    values.push(group_id, item_id);

    try {
      const { rows } = await query(
        `UPDATE variant_groups SET ${updates.join(', ')}
         WHERE id = $${idx++} AND item_id = $${idx}
         RETURNING id, item_id, name, is_required, created_at`,
        values
      );

      if (rows.length === 0) {
        return res.status(404).json({ data: null, error: 'Variant group not found', meta: {} });
      }

      return res.json({ data: rows[0], error: null, meta: {} });
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({
          data: null,
          error: 'Variant group name already exists',
          meta: {},
        });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/items/:item_id/variant-groups/:group_id
 * Delete a variant group and cascade-delete its options in a transaction.
 * Requires authentication + products:write (owner).
 */
router.delete('/:item_id/variant-groups/:group_id', authMiddleware, requirePermission('products:write'), async (req, res, next) => {
  try {
    const { item_id, group_id } = req.params;

    // Use a transaction to cascade-delete options explicitly
    // (DB has ON DELETE CASCADE, but we do it in a transaction for atomicity guarantee)
    await query('BEGIN');

    try {
      // Delete options first (explicit cascade)
      await query('DELETE FROM variant_options WHERE group_id = $1', [group_id]);

      // Delete the group itself, verifying it belongs to this item
      const { rows } = await query(
        'DELETE FROM variant_groups WHERE id = $1 AND item_id = $2 RETURNING id',
        [group_id, item_id]
      );

      if (rows.length === 0) {
        await query('ROLLBACK');
        return res.status(404).json({ data: null, error: 'Variant group not found', meta: {} });
      }

      await query('COMMIT');
      return res.json({ data: { id: rows[0].id }, error: null, meta: {} });
    } catch (err) {
      await query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

// ── Variant Option Routes ─────────────────────────────────────────────────────

/**
 * Helper: Verify that a variant group exists and belongs to the given item.
 * Returns the group row on success, or null (and sends response) on failure.
 */
async function verifyGroupBelongsToItem(req, res) {
  const { item_id, group_id } = req.params;

  const { rows } = await query(
    `SELECT id, item_id, name FROM variant_groups WHERE id = $1 AND item_id = $2`,
    [group_id, item_id]
  );

  if (rows.length === 0) {
    res.status(404).json({ data: null, error: 'Variant group not found', meta: {} });
    return null;
  }
  return rows[0];
}

/**
 * GET /api/items/:item_id/variant-groups/:group_id/options
 * List all variant options for a group.
 * Requires authentication; group must belong to the item.
 */
router.get('/:item_id/variant-groups/:group_id/options', authMiddleware, async (req, res, next) => {
  try {
    const { item_id, group_id } = req.params;
    const userId = req.user.userId;

    // Verify item belongs to authenticated user's business
    const itemCheck = await query(
      `SELECT i.id FROM items i
       JOIN businesses b ON b.id = i.business_id
       WHERE i.id = $1 AND b.owner_id = $2`,
      [item_id, userId]
    );

    if (itemCheck.rows.length === 0) {
      return res.status(404).json({ data: null, error: 'Item not found', meta: {} });
    }

    // Verify group belongs to item
    const group = await verifyGroupBelongsToItem(req, res);
    if (!group) return;

    const { rows } = await query(
      `SELECT id, group_id, label, price_modifier, absolute_price, display_order, created_at
       FROM variant_options
       WHERE group_id = $1
       ORDER BY display_order ASC, created_at ASC`,
      [group_id]
    );

    return res.json({ data: rows, error: null, meta: { total: rows.length } });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/items/:item_id/variant-groups/:group_id/options
 * Create a new variant option in a group.
 * Requires authentication + products:write (owner).
 * Validates:
 *   - label is non-empty
 *   - Exactly one pricing rule (price_modifier XOR absolute_price)
 *   - If neither provided, defaults price_modifier to 0
 *   - If both provided, returns 400
 */
router.post('/:item_id/variant-groups/:group_id/options', authMiddleware, requirePermission('products:write'), async (req, res, next) => {
  try {
    const { group_id } = req.params;

    // Verify group belongs to item
    const group = await verifyGroupBelongsToItem(req, res);
    if (!group) return;

    const { label, price_modifier, absolute_price, display_order } = req.body;

    // Validate label
    if (!label || (typeof label === 'string' && label.trim().length === 0)) {
      return res.status(400).json({ data: null, error: 'label is required', meta: {} });
    }

    const trimmedLabel = label.trim();

    // Validate pricing rule: cannot have both
    const hasPriceModifier = price_modifier !== undefined && price_modifier !== null;
    const hasAbsolutePrice = absolute_price !== undefined && absolute_price !== null;

    if (hasPriceModifier && hasAbsolutePrice) {
      return res.status(400).json({
        data: null,
        error: 'Provide price_modifier or absolute_price, not both',
        meta: {},
      });
    }

    // Default price_modifier to 0 if neither provided
    let finalPriceModifier = null;
    let finalAbsolutePrice = null;

    if (hasAbsolutePrice) {
      finalAbsolutePrice = absolute_price;
    } else if (hasPriceModifier) {
      finalPriceModifier = price_modifier;
    } else {
      // Neither provided → default price_modifier to 0
      finalPriceModifier = 0;
    }

    const finalDisplayOrder = display_order !== undefined && display_order !== null ? display_order : 0;

    try {
      const { rows } = await query(
        `INSERT INTO variant_options (group_id, label, price_modifier, absolute_price, display_order)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, group_id, label, price_modifier, absolute_price, display_order, created_at`,
        [group_id, trimmedLabel, finalPriceModifier, finalAbsolutePrice, finalDisplayOrder]
      );

      return res.status(201).json({ data: rows[0], error: null, meta: {} });
    } catch (err) {
      // Unique violation: duplicate label within same group
      if (err.code === '23505') {
        return res.status(409).json({
          data: null,
          error: 'Option label already exists in this group',
          meta: {},
        });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/items/:item_id/variant-groups/:group_id/options/:option_id
 * Update a variant option.
 * Requires authentication + products:write (owner).
 * Same pricing validation as POST.
 */
router.put('/:item_id/variant-groups/:group_id/options/:option_id', authMiddleware, requirePermission('products:write'), async (req, res, next) => {
  try {
    const { group_id, option_id } = req.params;

    // Verify group belongs to item
    const group = await verifyGroupBelongsToItem(req, res);
    if (!group) return;

    const { label, price_modifier, absolute_price, display_order } = req.body;

    // Validate label if provided
    if (label !== undefined && (typeof label !== 'string' || label.trim().length === 0)) {
      return res.status(400).json({ data: null, error: 'label must be a non-empty string', meta: {} });
    }

    // Validate pricing rule if either is provided
    const hasPriceModifier = price_modifier !== undefined && price_modifier !== null;
    const hasAbsolutePrice = absolute_price !== undefined && absolute_price !== null;

    if (hasPriceModifier && hasAbsolutePrice) {
      return res.status(400).json({
        data: null,
        error: 'Provide price_modifier or absolute_price, not both',
        meta: {},
      });
    }

    // Build dynamic update
    const updates = [];
    const values = [];
    let idx = 1;

    if (label !== undefined) {
      updates.push(`label = $${idx++}`);
      values.push(label.trim());
    }

    if (hasPriceModifier) {
      updates.push(`price_modifier = $${idx++}`);
      values.push(price_modifier);
      updates.push(`absolute_price = NULL`);
    } else if (hasAbsolutePrice) {
      updates.push(`absolute_price = $${idx++}`);
      values.push(absolute_price);
      updates.push(`price_modifier = NULL`);
    }

    if (display_order !== undefined && display_order !== null) {
      updates.push(`display_order = $${idx++}`);
      values.push(display_order);
    }

    if (updates.length === 0) {
      return res.status(400).json({ data: null, error: 'Nothing to update', meta: {} });
    }

    values.push(option_id, group_id);

    try {
      const { rows } = await query(
        `UPDATE variant_options SET ${updates.join(', ')}
         WHERE id = $${idx++} AND group_id = $${idx}
         RETURNING id, group_id, label, price_modifier, absolute_price, display_order, created_at`,
        values
      );

      if (rows.length === 0) {
        return res.status(404).json({ data: null, error: 'Variant option not found', meta: {} });
      }

      return res.json({ data: rows[0], error: null, meta: {} });
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({
          data: null,
          error: 'Option label already exists in this group',
          meta: {},
        });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/items/:item_id/variant-groups/:group_id/options/:option_id
 * Delete a variant option.
 * Requires authentication + products:write (owner).
 */
router.delete('/:item_id/variant-groups/:group_id/options/:option_id', authMiddleware, requirePermission('products:write'), async (req, res, next) => {
  try {
    const { group_id, option_id } = req.params;

    // Verify group belongs to item
    const group = await verifyGroupBelongsToItem(req, res);
    if (!group) return;

    const { rows } = await query(
      'DELETE FROM variant_options WHERE id = $1 AND group_id = $2 RETURNING id',
      [option_id, group_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ data: null, error: 'Variant option not found', meta: {} });
    }

    return res.json({ data: { id: rows[0].id }, error: null, meta: {} });
  } catch (err) {
    next(err);
  }
});

// ── Price Resolution Route ────────────────────────────────────────────────────

/**
 * POST /api/items/:item_id/resolve-price
 * Accepts { variant_option_ids: string[] } and returns the resolved price.
 * Validates:
 *   - All option IDs belong to the item's variant groups (400 if not)
 *   - Required groups have at least one selection (422 if missing)
 * Authentication required (any authenticated user).
 */
router.post('/:item_id/resolve-price', authMiddleware, async (req, res, next) => {
  try {
    const { item_id } = req.params;
    const { variant_option_ids } = req.body;

    // Validate request body
    if (!Array.isArray(variant_option_ids)) {
      return res.status(400).json({
        data: null,
        error: 'variant_option_ids must be an array',
        meta: {},
      });
    }

    // 1. Fetch the item's base price (verify item exists via business ownership)
    const itemResult = await query(
      `SELECT i.id, i.price FROM items i
       JOIN businesses b ON b.id = i.business_id
       WHERE i.id = $1`,
      [item_id]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ data: null, error: 'Item not found', meta: {} });
    }

    const basePrice = parseFloat(itemResult.rows[0].price);

    // 2. Fetch all variant groups for this item (to check required groups)
    const groupsResult = await query(
      `SELECT id, name, is_required FROM variant_groups WHERE item_id = $1`,
      [item_id]
    );

    const allGroups = groupsResult.rows;

    // If no option IDs provided and no required groups, resolve with base price
    if (variant_option_ids.length === 0) {
      // Check if there are required groups
      const requiredGroups = allGroups.filter((g) => g.is_required);
      if (requiredGroups.length > 0) {
        const missingNames = requiredGroups.map((g) => g.name);
        return res.status(422).json({
          data: null,
          error: `Required groups missing: [${missingNames.join(', ')}]`,
          meta: {},
        });
      }

      return res.json({
        data: { resolved_price: resolvePrice(basePrice, []) },
        error: null,
        meta: {},
      });
    }

    // 3. Fetch all provided option IDs, joining through variant_groups to verify they belong to this item
    const optionsResult = await query(
      `SELECT vo.id, vo.group_id, vo.price_modifier, vo.absolute_price
       FROM variant_options vo
       JOIN variant_groups vg ON vg.id = vo.group_id
       WHERE vo.id = ANY($1) AND vg.item_id = $2`,
      [variant_option_ids, item_id]
    );

    const fetchedOptions = optionsResult.rows;

    // 4. If any option doesn't belong to this item → 400
    if (fetchedOptions.length !== variant_option_ids.length) {
      // Find which IDs are invalid
      const fetchedIds = new Set(fetchedOptions.map((o) => o.id));
      const invalidIds = variant_option_ids.filter((id) => !fetchedIds.has(id));
      return res.status(400).json({
        data: null,
        error: `Option ${invalidIds[0]} does not belong to this item`,
        meta: {},
      });
    }

    // 5. Check required groups: for each is_required=true group, ensure at least one option selected
    const selectedGroupIds = new Set(fetchedOptions.map((o) => o.group_id));
    const requiredGroups = allGroups.filter((g) => g.is_required);
    const missingRequired = requiredGroups.filter((g) => !selectedGroupIds.has(g.id));

    if (missingRequired.length > 0) {
      const missingNames = missingRequired.map((g) => g.name);
      return res.status(422).json({
        data: null,
        error: `Required groups missing: [${missingNames.join(', ')}]`,
        meta: {},
      });
    }

    // 6. Call resolvePrice and return the result
    const selectedOptions = fetchedOptions.map((o) => ({
      price_modifier: o.price_modifier !== null ? parseFloat(o.price_modifier) : null,
      absolute_price: o.absolute_price !== null ? parseFloat(o.absolute_price) : null,
    }));

    const resolved_price = resolvePrice(basePrice, selectedOptions);

    return res.json({
      data: { resolved_price },
      error: null,
      meta: {},
    });
  } catch (err) {
    next(err);
  }
});

// ── Image Upload Route ────────────────────────────────────────────────────────

/**
 * POST /api/items/:item_id/images
 * Upload an image for an item.
 * Requires authentication + products:write (owner).
 * Validates:
 *   - Item exists and belongs to user's business
 *   - Item has fewer than 10 images
 *   - Auto-sets is_primary = true if this is the first image
 */
router.post('/:item_id/images', authMiddleware, requirePermission('products:write'), upload.single('image'), async (req, res, next) => {
  try {
    const { item_id } = req.params;

    // Verify item exists and belongs to user's business
    const item = await verifyItemOwnership(req, res);
    if (!item) {
      // Clean up uploaded file if item not found
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ data: null, error: 'Item not found', meta: {} });
    }

    // Count existing images for this item
    const countResult = await query(
      'SELECT COUNT(*) FROM item_images WHERE item_id = $1',
      [item_id]
    );
    const imageCount = parseInt(countResult.rows[0].count, 10);

    // If already at max (10), reject and clean up file
    if (imageCount >= 10) {
      fs.unlinkSync(req.file.path);
      return res.status(422).json({
        data: null,
        error: 'Item already has the maximum of 10 images',
        meta: {},
      });
    }

    // Determine if this is the first image → auto-set is_primary
    const isPrimary = imageCount === 0;

    // Determine display_order (next index)
    const displayOrder = imageCount;

    // Build the URL (relative path served by express.static)
    const url = `/uploads/items/${req.file.filename}`;

    // Insert the image record
    const { rows } = await query(
      `INSERT INTO item_images (item_id, url, display_order, is_primary)
       VALUES ($1, $2, $3, $4)
       RETURNING id, item_id, url, display_order, is_primary, created_at`,
      [item_id, url, displayOrder, isPrimary]
    );

    return res.status(201).json({ data: rows[0], error: null, meta: {} });
  } catch (err) {
    next(err);
  }
});

// ── Image List Route ──────────────────────────────────────────────────────────

/**
 * GET /api/items/:item_id/images
 * List all images for an item, ordered by display_order.
 * Requires authentication; item must belong to user's business.
 */
router.get('/:item_id/images', authMiddleware, async (req, res, next) => {
  try {
    const { item_id } = req.params;
    const userId = req.user.userId;

    // Verify item belongs to authenticated user's business
    const itemCheck = await query(
      `SELECT i.id FROM items i
       JOIN businesses b ON b.id = i.business_id
       WHERE i.id = $1 AND b.owner_id = $2`,
      [item_id, userId]
    );

    if (itemCheck.rows.length === 0) {
      return res.status(404).json({ data: null, error: 'Item not found', meta: {} });
    }

    const { rows } = await query(
      `SELECT id, item_id, url, display_order, is_primary, created_at
       FROM item_images
       WHERE item_id = $1
       ORDER BY display_order ASC`,
      [item_id]
    );

    return res.json({ data: rows, error: null, meta: { total: rows.length } });
  } catch (err) {
    next(err);
  }
});

// ── Image Update Route ───────────────────────────────────────────────────────

/**
 * PUT /api/items/:item_id/images/:image_id
 * Update display_order and/or is_primary for an image.
 * When setting is_primary = true, clears all other images' flag in a transaction.
 * Requires authentication + products:write (owner).
 */
router.put('/:item_id/images/:image_id', authMiddleware, requirePermission('products:write'), async (req, res, next) => {
  try {
    const { item_id, image_id } = req.params;
    const { display_order, is_primary } = req.body;

    // If setting is_primary to true, use a transaction
    if (is_primary === true) {
      await query('BEGIN');

      try {
        // Clear is_primary on all other images for this item
        await query(
          `UPDATE item_images SET is_primary = false
           WHERE item_id = $1 AND id != $2`,
          [item_id, image_id]
        );

        // Build update for this image
        const updates = ['is_primary = true'];
        const values = [];
        let idx = 1;

        if (display_order !== undefined && display_order !== null) {
          updates.push(`display_order = $${idx++}`);
          values.push(display_order);
        }

        values.push(image_id, item_id);

        const { rows } = await query(
          `UPDATE item_images SET ${updates.join(', ')}
           WHERE id = $${idx++} AND item_id = $${idx}
           RETURNING id, item_id, url, display_order, is_primary, created_at`,
          values
        );

        if (rows.length === 0) {
          await query('ROLLBACK');
          return res.status(404).json({ data: null, error: 'Image not found', meta: {} });
        }

        await query('COMMIT');
        return res.json({ data: rows[0], error: null, meta: {} });
      } catch (err) {
        await query('ROLLBACK');
        throw err;
      }
    } else {
      // No is_primary change (or setting to false) — simple update
      const updates = [];
      const values = [];
      let idx = 1;

      if (display_order !== undefined && display_order !== null) {
        updates.push(`display_order = $${idx++}`);
        values.push(display_order);
      }
      if (is_primary !== undefined) {
        updates.push(`is_primary = $${idx++}`);
        values.push(is_primary === true);
      }

      if (updates.length === 0) {
        return res.status(400).json({ data: null, error: 'Nothing to update', meta: {} });
      }

      values.push(image_id, item_id);

      const { rows } = await query(
        `UPDATE item_images SET ${updates.join(', ')}
         WHERE id = $${idx++} AND item_id = $${idx}
         RETURNING id, item_id, url, display_order, is_primary, created_at`,
        values
      );

      if (rows.length === 0) {
        return res.status(404).json({ data: null, error: 'Image not found', meta: {} });
      }

      return res.json({ data: rows[0], error: null, meta: {} });
    }
  } catch (err) {
    next(err);
  }
});

// ── Image Delete Route ───────────────────────────────────────────────────────

/**
 * DELETE /api/items/:item_id/images/:image_id
 * Delete an image record and remove the file from uploads/items/.
 * Requires authentication + products:write (owner).
 */
router.delete('/:item_id/images/:image_id', authMiddleware, requirePermission('products:write'), async (req, res, next) => {
  try {
    const { item_id, image_id } = req.params;

    // Fetch the image row to get the url (for file deletion)
    const imageResult = await query(
      'SELECT id, url FROM item_images WHERE id = $1 AND item_id = $2',
      [image_id, item_id]
    );

    if (imageResult.rows.length === 0) {
      return res.status(404).json({ data: null, error: 'Image not found', meta: {} });
    }

    const imageRow = imageResult.rows[0];

    // Delete from DB
    await query('DELETE FROM item_images WHERE id = $1', [image_id]);

    // Remove the physical file
    try {
      const filePath = path.join(__dirname, '../../../', imageRow.url);
      fs.unlinkSync(filePath);
    } catch (fileErr) {
      // If file doesn't exist, just log and continue
      console.log(`Image file not found during deletion: ${imageRow.url}`, fileErr.message);
    }

    return res.json({ data: { id: imageRow.id }, error: null, meta: {} });
  } catch (err) {
    next(err);
  }
});

// ── Multer Error Handler Middleware ───────────────────────────────────────────

router.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ data: null, error: 'Image too large (max 5 MB)', meta: {} });
  }
  if (err.code === 'INVALID_MIME' || err.message === 'INVALID_MIME') {
    return res.status(415).json({ data: null, error: 'Unsupported image type', meta: {} });
  }
  next(err);
});

module.exports = router;
