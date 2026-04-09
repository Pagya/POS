import { NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { order_id, rating, comment } = await req.json();

  if (!order_id || !rating) {
    return Response.json({ error: 'order_id and rating required' }, { status: 400 });
  }

  if (rating < 1 || rating > 5) {
    return Response.json({ error: 'rating must be between 1 and 5' }, { status: 400 });
  }

  try {
    // Get order to find business_id
    const { rows: orderRows } = await query('SELECT business_id FROM orders WHERE id=$1', [order_id]);
    if (orderRows.length === 0) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    const business_id = orderRows[0].business_id;

    // Create feedback
    const { rows } = await query(
      'INSERT INTO feedback (business_id, order_id, rating, comment) VALUES ($1,$2,$3,$4) RETURNING *',
      [business_id, order_id, rating, comment || null]
    );

    return Response.json(rows[0], { status: 201 });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
