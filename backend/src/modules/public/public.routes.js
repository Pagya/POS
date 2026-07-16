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
    `SELECT i.id, i.name, i.price, i.type, i.available, c.name AS category,
            img.url AS primary_image_url
     FROM items i
     LEFT JOIN categories c ON c.id = i.category_id
     LEFT JOIN item_images img ON img.item_id = i.id AND img.is_primary = true
     WHERE i.business_id=$1 AND i.available=true
     ORDER BY c.name, i.name`,
    [business.id]
  );

  // Attach variant groups (with options) to each item
  const itemIds = items.map(i => i.id);
  let variantGroupsByItem = {};
  if (itemIds.length > 0) {
    const { rows: groups } = await query(
      `SELECT vg.id, vg.item_id, vg.name, vg.is_required
       FROM variant_groups vg
       WHERE vg.item_id = ANY($1)
       ORDER BY vg.created_at`,
      [itemIds]
    );
    const groupIds = groups.map(g => g.id);
    let optionsByGroup = {};
    if (groupIds.length > 0) {
      const { rows: options } = await query(
        `SELECT vo.id, vo.group_id, vo.label, vo.price_modifier, vo.absolute_price, vo.display_order
         FROM variant_options vo
         WHERE vo.group_id = ANY($1)
         ORDER BY vo.display_order`,
        [groupIds]
      );
      options.forEach(o => {
        if (!optionsByGroup[o.group_id]) optionsByGroup[o.group_id] = [];
        optionsByGroup[o.group_id].push(o);
      });
    }
    groups.forEach(g => {
      if (!variantGroupsByItem[g.item_id]) variantGroupsByItem[g.item_id] = [];
      variantGroupsByItem[g.item_id].push({ ...g, options: optionsByGroup[g.id] || [] });
    });
  }

  // Attach all images for items (for detail view gallery)
  let imagesByItem = {};
  if (itemIds.length > 0) {
    const { rows: allImages } = await query(
      `SELECT id, item_id, url, display_order, is_primary
       FROM item_images
       WHERE item_id = ANY($1)
       ORDER BY display_order`,
      [itemIds]
    );
    allImages.forEach(img => {
      if (!imagesByItem[img.item_id]) imagesByItem[img.item_id] = [];
      imagesByItem[img.item_id].push(img);
    });
  }

  const enrichedItems = items.map(item => ({
    ...item,
    variant_groups: variantGroupsByItem[item.id] || [],
    images: imagesByItem[item.id] || [],
  }));

  res.json({ business, items: enrichedItems });
});

module.exports = router;
