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

  const { name, price, type, category_id, available } = await req.json();

  const updates: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (name !== undefined) { updates.push(`name=$${idx++}`); values.push(name); }
  if (price !== undefined) { updates.push(`price=$${idx++}`); values.push(price); }
  if (type !== undefined) { updates.push(`type=$${idx++}`); values.push(type); }
  if (category_id !== undefined) { updates.push(`category_id=$${idx++}`); values.push(category_id); }
  if (available !== undefined) { updates.push(`available=$${idx++}`); values.push(available); }

  if (updates.length === 0) {
    return Response.json({ error: 'No fields to update' }, { status: 400 });
  }

  values.push(params.id);
  values.push(params.businessId);

  const { rows } = await query(
    `UPDATE items SET ${updates.join(', ')} WHERE id=$${idx++} AND business_id=$${idx++} RETURNING *`,
    values
  );

  if (rows.length === 0) {
    return Response.json({ error: 'Item not found' }, { status: 404 });
  }

  return Response.json(rows[0]);
}

export async function DELETE(req: NextRequest, { params }: { params: { businessId: string; id: string } }) {
  const user = getUser(req);
  if (!user) return unauthorized();
  if (!(await ownsBusiness(user.userId, params.businessId))) return forbidden();

  const { rows } = await query(
    'DELETE FROM items WHERE id=$1 AND business_id=$2 RETURNING id',
    [params.id, params.businessId]
  );

  if (rows.length === 0) {
    return Response.json({ error: 'Item not found' }, { status: 404 });
  }

  return Response.json({ success: true });
}
