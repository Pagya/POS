import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { getUser, unauthorized, forbidden } from '@/lib/apiAuth';

async function ownsBusiness(userId: string, businessId: string) {
  const { rows } = await query('SELECT id FROM businesses WHERE id=$1 AND owner_id=$2', [businessId, userId]);
  return rows.length > 0;
}

function calcBill(items: any[], discountType: string, discountValue: number, taxRate: number) {
  const subtotal = items.reduce((s, i) => s + (i.price - (i.discount || 0)) * i.quantity, 0);
  const discountAmt = discountType === 'percent' ? (subtotal * discountValue) / 100 : (discountValue || 0);
  const afterDiscount = Math.max(0, subtotal - discountAmt);
  const taxAmount = taxRate ? (afterDiscount * taxRate) / 100 : 0;
  return { subtotal, taxAmount, total: afterDiscount + taxAmount };
}

async function upsertCustomer(businessId: string, name: string, phone: string) {
  if (!phone) return null;
  const { rows } = await query(
    `INSERT INTO customers (business_id, name, phone) VALUES ($1,$2,$3)
     ON CONFLICT (business_id, phone) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
    [businessId, name || 'Guest', phone]
  );
  return rows[0].id;
}

export async function POST(req: NextRequest, { params }: { params: { businessId: string } }) {
  const body = await req.json();
  const { customer_name, customer_phone, table_number, notes,
    source = 'pos', order_type = 'dine-in', discount_type, discount_value = 0,
    payment_mode, items, tax_rate } = body;

  if (!items?.length) return Response.json({ error: 'items required' }, { status: 400 });

  const ids = items.map((i: any) => i.item_id);
  const { rows: dbItems } = await query(
    'SELECT id, name, price, available FROM items WHERE id = ANY($1) AND business_id=$2',
    [ids, params.businessId]
  );
  const itemMap = Object.fromEntries(dbItems.map((i: any) => [i.id, i]));

  for (const item of items) {
    if (!itemMap[item.item_id]) return Response.json({ error: `Item not found` }, { status: 400 });
    if (!(itemMap[item.item_id] as any).available) return Response.json({ error: `"${(itemMap[item.item_id] as any).name}" is unavailable` }, { status: 400 });
  }

  let effectiveTaxRate = tax_rate;
  if (effectiveTaxRate == null) {
    const { rows: [biz] } = await query('SELECT tax_rate FROM businesses WHERE id=$1', [params.businessId]);
    effectiveTaxRate = biz?.tax_rate || 0;
  }

  const enriched = items.map((i: any) => ({
    ...i, price: (itemMap[i.item_id] as any).price,
    name: (itemMap[i.item_id] as any).name, discount: i.discount || 0,
  }));

  const { subtotal, taxAmount, total } = calcBill(enriched, discount_type, discount_value, effectiveTaxRate);
  const customer_id = await upsertCustomer(params.businessId, customer_name, customer_phone);

  try {
    const { rows: [order] } = await query(
      `INSERT INTO orders (business_id, customer_id, customer_name, customer_phone, table_number, notes,
        source, order_type, discount_type, discount_value, payment_mode, subtotal, tax_rate, tax_amount, total)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [params.businessId, customer_id, customer_name, customer_phone, table_number, notes,
       source, order_type, discount_type, discount_value, payment_mode,
       subtotal, effectiveTaxRate, taxAmount, total]
    );
    for (const item of enriched) {
      await query(
        'INSERT INTO order_items (order_id, item_id, name, price, quantity, discount) VALUES ($1,$2,$3,$4,$5,$6)',
        [order.id, item.item_id, item.name, item.price, item.quantity, item.discount]
      );
    }
    return Response.json(order, { status: 201 });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: { businessId: string } }) {
  const user = getUser(req);
  if (!user) return unauthorized();
  if (!(await ownsBusiness(user.userId, params.businessId))) return forbidden();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const date = searchParams.get('date');
  const range = searchParams.get('range');

  let sql = `SELECT o.*, json_agg(json_build_object('name', oi.name, 'price', oi.price, 'quantity', oi.quantity)) AS items
    FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id WHERE o.business_id=$1`;
  const qParams: any[] = [params.businessId];
  let idx = 2;

  if (status && status !== 'all') { sql += ` AND o.status=$${idx++}`; qParams.push(status); }
  if (date === 'today') sql += ` AND o.created_at::date=CURRENT_DATE`;
  else if (date) { sql += ` AND o.created_at::date=$${idx++}`; qParams.push(date); }
  if (range === '7d') sql += ` AND o.created_at >= NOW() - INTERVAL '7 days'`;
  if (range === '30d') sql += ` AND o.created_at >= NOW() - INTERVAL '30 days'`;

  sql += ' GROUP BY o.id ORDER BY o.created_at DESC';
  const { rows } = await query(sql, qParams);
  return Response.json(rows);
}
