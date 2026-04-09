-- Restaurant Menus
CREATE TABLE IF NOT EXISTS restaurant_menus (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  restaurant_name TEXT NOT NULL,
  name            TEXT NOT NULL,
  source          TEXT NOT NULL CHECK (source IN ('text', 'image')) DEFAULT 'text',
  content         TEXT NOT NULL,
  image_url       TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menus_business ON restaurant_menus(business_id);
