import { query } from '@/lib/db';

// One-time migration endpoint — call once after deploy
// GET /api/migrate?secret=YOUR_SECRET
export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get('secret');
  if (secret !== process.env.MIGRATE_SECRET) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const schema = `
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS businesses (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('restaurant','retail','ecommerce','service')),
      tax_rate NUMERIC(5,2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS categories (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      price NUMERIC(10,2) NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('product','service')),
      available BOOLEAN DEFAULT TRUE,
      duration_minutes INT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS customers (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(business_id, phone)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
      customer_name TEXT,
      customer_phone TEXT,
      table_number TEXT,
      notes TEXT,
      source TEXT NOT NULL CHECK (source IN ('pos','online')) DEFAULT 'pos',
      order_type TEXT DEFAULT 'dine-in',
      status TEXT NOT NULL CHECK (status IN ('new','processing','completed','cancelled')) DEFAULT 'new',
      discount_type TEXT CHECK (discount_type IN ('flat','percent')),
      discount_value NUMERIC(10,2) DEFAULT 0,
      payment_mode TEXT CHECK (payment_mode IN ('cash','upi')),
      subtotal NUMERIC(10,2) DEFAULT 0,
      tax_rate NUMERIC(5,2) DEFAULT 0,
      tax_amount NUMERIC(10,2) DEFAULT 0,
      total NUMERIC(10,2) NOT NULL DEFAULT 0,
      paid BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      item_id UUID NOT NULL REFERENCES items(id),
      name TEXT NOT NULL,
      price NUMERIC(10,2) NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      discount NUMERIC(10,2) DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_items_business ON items(business_id);
    CREATE INDEX IF NOT EXISTS idx_orders_business ON orders(business_id);
    CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(business_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_feedback_business ON feedback(business_id);
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(business_id, phone);
  `;

  try {
    await query(schema);
    return Response.json({ success: true, message: 'Migration complete' });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
