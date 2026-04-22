import { NextRequest } from 'next/server';
import { query, ownsBusiness } from '@/lib/db';
import { getUser, unauthorized, forbidden } from '@/lib/apiAuth';

export async function PATCH(req: NextRequest, { params }: { params: { businessId: string; id: string } }) {
  const user = getUser(req);
  if (!user) return unauthorized();
  if (!(await ownsBusiness(user.userId, params.businessId))) return forbidden();

  const body = await req.json();
  const fields = ['name', 'price', 'type', 'category_id', 'available'];
  const updates: string[] = [];
  const values: any[] = [];
  let i = 1;

  for (const f of fields) {
    if (body[f] !== undefined) { updates.push(`${f}=$${i++}`); values.push(body[f]); }
  }
  if (!updates.length) return Response.json({ error: 'Nothing to update' }, { status: 400 });

  values.push(params.id, params.businessId);
  const { rows } = await query(
    `UPDATE items SET ${updates.join(',')} WHERE id=$${i++} AND business_id=$${i} RETURNING *`,
    values
  );
  if (!rows.length) return Response.json({ error: 'Item not found' }, { status: 404 });
  return Response.json(rows[0]);
}

export async function DELETE(req: NextRequest, { params }: { params: { businessId: string; id: string } }) {
  const user = getUser(req);
  if (!user) return unauthorized();
  if (!(await ownsBusiness(user.userId, params.businessId))) return forbidden();

  await query('DELETE FROM items WHERE id=$1 AND business_id=$2', [params.id, params.businessId]);
  return Response.json({ success: true });
}
