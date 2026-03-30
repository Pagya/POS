-- ============================================================
-- Commerce OS — Database Schema
-- Multi-tenant: every table carries business_id
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users (owners / staff per business)
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Businesses
CREATE TABLE businesses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,          -- used in public URL
  type          TEXT NOT NULL CHECK (type IN ('restaurant','retail','ecommerce','service')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Categories (per business)
CREATE TABLE categories (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Items / Catalog
CREATE TABLE items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  price         NUMERIC(10,2) NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('product','service')),
  available     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Orders
CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_name   TEXT,
  customer_phone  TEXT,
  table_number    TEXT,          -- restaurant dine-in
  notes           TEXT,
  source          TEXT NOT NULL CHECK (source IN ('pos','online')) DEFAULT 'pos',
  status          TEXT NOT NULL CHECK (status IN ('new','processing','completed','cancelled')) DEFAULT 'new',
  discount_type   TEXT CHECK (discount_type IN ('flat','percent')),
  discount_value  NUMERIC(10,2) DEFAULT 0,
  payment_mode    TEXT CHECK (payment_mode IN ('cash','upi')),
  total           NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Order Items
CREATE TABLE order_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_id     UUID NOT NULL REFERENCES items(id),
  name        TEXT NOT NULL,    -- snapshot at time of order
  price       NUMERIC(10,2) NOT NULL,
  quantity    INT NOT NULL DEFAULT 1
);

-- Feedback
CREATE TABLE feedback (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_items_business       ON items(business_id);
CREATE INDEX idx_orders_business      ON orders(business_id);
CREATE INDEX idx_orders_created       ON orders(business_id, created_at);
CREATE INDEX idx_feedback_business    ON feedback(business_id);
CREATE INDEX idx_order_items_order    ON order_items(order_id);
