import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { getUser, unauthorized } from '@/lib/apiAuth';

export async function GET(req: NextRequest, { params }: { params: { businessId: string } }) {
  const user = getUser(req);
  if (!user) return unauthorized();

  const phone = new URL(req.url).searchParams.get('phone');
  if (!phone) return Response.json({ error: 'phone required' }, { status: 400 });

  const { rows: [customer] } = await query(
    'SELECT * FROM customers WHERE business_id=$1 AND phone=$2',
    [params.businessId, phone]
  );
  if (!customer) return Response.json(null);

  const { rows: orders } = await query(
    `SELECT o.id, o.total, o.status, o.created_at,
      json_agg(json_build_object('name', oi.name, 'quantity', oi.quantity)) AS items
     FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.customer_id=$1 GROUP BY o.id ORDER BY o.created_at DESC LIMIT 5`,
    [customer.id]
  );
  return Response.json({ ...customer, recent_orders: orders });
}
