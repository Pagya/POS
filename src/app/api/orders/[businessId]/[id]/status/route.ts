import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { getUser, unauthorized, forbidden } from '@/lib/apiAuth';

async function ownsBusiness(userId: string, businessId: string) {
  const { rows } = await query('SELECT id FROM businesses WHERE id=$1 AND owner_id=$2', [businessId, userId]);
  return rows.length > 0;
}

export async function PATCH(req: NextRequest, { params }: { params: { businessId: string; id: string } }) {
  const user = getUser(req);
  if (!user) return unauthorized();
  if (!(await ownsBusiness(user.userId, params.businessId))) return forbidden();

  const { status } = await req.json();
  if (!status) return Response.json({ error: 'status required' }, { status: 400 });

  const validStatuses = ['new', 'processing', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return Response.json({ error: 'Invalid status' }, { status: 400 });
  }

  const { rows } = await query(
    'UPDATE orders SET status=$1 WHERE id=$2 AND business_id=$3 RETURNING *',
    [status, params.id, params.businessId]
  );

  if (rows.length === 0) {
    return Response.json({ error: 'Order not found' }, { status: 404 });
  }

  return Response.json(rows[0]);
}
