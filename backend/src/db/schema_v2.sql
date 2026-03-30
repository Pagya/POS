-- ============================================================
-- Commerce OS v2 — Migration (run after schema.sql)
-- ============================================================

-- Customers table (Prompt 2)
CREATE TABLE IF NOT EXISTS customers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  phone         TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, phone)
);
CREATE INDEX IF NOT EXISTS idx_customers_business ON customers(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone    ON customers(business_id, phone);

-- Link orders to customers
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

-- Tax + item-level discount (Prompt 6)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_rate    NUMERIC(5,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_amount  NUMERIC(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal    NUMERIC(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid        BOOLEAN DEFAULT FALSE;

-- Dine-in type (Prompt 4)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type  TEXT DEFAULT 'dine-in' CHECK (order_type IN ('dine-in','takeaway','delivery','walkin','online'));

-- Item-level discount (Prompt 6)
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS discount NUMERIC(10,2) DEFAULT 0;

-- Service duration (Prompt 4)
ALTER TABLE items ADD COLUMN IF NOT EXISTS duration_minutes INT;

-- Business tax config (Prompt 6)
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 0;
