import { NextRequest } from 'next/server';
import { query, ownsBusiness } from '@/lib/db';
import { getUser, unauthorized, forbidden } from '@/lib/apiAuth';

export async function GET(req: NextRequest, { params }: { params: { businessId: string } }) {
  const user = getUser(req);
  if (!user) return unauthorized();
  if (!(await ownsBusiness(user.userId, params.businessId))) return forbidden();

  const { rows } = await query('SELECT * FROM categories WHERE business_id=$1 ORDER BY name', [params.businessId]);
  return Response.json(rows);
}

export async function POST(req: NextRequest, { params }: { params: { businessId: string } }) {
  const user = getUser(req);
  if (!user) return unauthorized();
  if (!(await ownsBusiness(user.userId, params.businessId))) return forbidden();

  const { name } = await req.json();
  if (!name) return Response.json({ error: 'name required' }, { status: 400 });

  const { rows } = await query(
    'INSERT INTO categories (business_id, name) VALUES ($1,$2) RETURNING *',
    [params.businessId, name]
  );
  return Response.json(rows[0], { status: 201 });
}
