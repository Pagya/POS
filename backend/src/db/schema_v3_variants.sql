-- ============================================================
-- Commerce OS v3 — Variant Groups Migration
-- ============================================================

-- Variant groups per item (e.g., Size, Flavor, Color)
CREATE TABLE IF NOT EXISTS variant_groups (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id      UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  is_required  BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_id, name)
);

CREATE INDEX IF NOT EXISTS idx_variant_groups_item ON variant_groups(item_id);

-- ============================================================
-- Commerce OS v3 — Variant Options Migration
-- ============================================================

-- Variant options per group (e.g., Small, Medium, Large)
CREATE TABLE IF NOT EXISTS variant_options (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id        UUID NOT NULL REFERENCES variant_groups(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,
  price_modifier  NUMERIC(10,2),          -- NULL when absolute_price is set
  absolute_price  NUMERIC(10,2),          -- NULL when price_modifier is set
  display_order   INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, label),
  CONSTRAINT exactly_one_pricing CHECK (
    (price_modifier IS NOT NULL AND absolute_price IS NULL) OR
    (price_modifier IS NULL AND absolute_price IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_variant_options_group ON variant_options(group_id);

-- ============================================================
-- Commerce OS v3 — Item Images Migration
-- ============================================================

-- Images per item with ordering and primary flag
CREATE TABLE IF NOT EXISTS item_images (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id        UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  url            TEXT NOT NULL,
  display_order  INT NOT NULL DEFAULT 0,
  is_primary     BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_item_images_item ON item_images(item_id);

-- ============================================================
-- Commerce OS v3 — Order Items Variant Snapshot Columns
-- ============================================================

-- Add variant snapshot columns to order_items for order history
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_label TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_option_ids UUID[];
