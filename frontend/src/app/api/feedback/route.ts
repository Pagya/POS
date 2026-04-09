import { NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { order_id, rating, comment } = await req.json();
  if (!order_id || !rating) return Response.json({ error: 'order_id and rating required' }, { status: 400 });
  if (rating < 1 || rating > 5) return Response.json({ error: 'rating must be 1-5' }, { status: 400 });

  const { rows: [order] } = await query('SELECT id, business_id, status FROM orders WHERE id=$1', [order_id]);
  if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });
  if (order.status !== 'completed') return Response.json({ error: 'Feedback only for completed orders' }, { status: 400 });

  const { rows: existing } = await query('SELECT id FROM feedback WHERE order_id=$1', [order_id]);
  if (existing.length) return Response.json({ error: 'Feedback already submitted' }, { status: 409 });

  const { rows } = await query(
    'INSERT INTO feedback (business_id, order_id, rating, comment) VALUES ($1,$2,$3,$4) RETURNING *',
    [order.business_id, order_id, rating, comment]
  );
  return Response.json(rows[0], { status: 201 });
}
