import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { getUser, unauthorized, forbidden } from '@/lib/apiAuth';

async function ownsBusiness(userId: string, businessId: string) {
  const { rows } = await query('SELECT id FROM businesses WHERE id=$1 AND owner_id=$2', [businessId, userId]);
  return rows.length > 0;
}

export async function GET(req: NextRequest, { params }: { params: { businessId: string } }) {
  const { rows } = await query(
    `SELECT i.*, c.name AS category_name FROM items i
     LEFT JOIN categories c ON c.id = i.category_id
     WHERE i.business_id=$1 ORDER BY c.name, i.name`,
    [params.businessId]
  );
  return Response.json(rows);
}

export async function POST(req: NextRequest, { params }: { params: { businessId: string } }) {
  const user = getUser(req);
  if (!user) return unauthorized();
  if (!(await ownsBusiness(user.userId, params.businessId))) return forbidden();

  const { name, price, type, category_id, available } = await req.json();
  if (!name || price == null || !type)
    return Response.json({ error: 'name, price, type required' }, { status: 400 });

  const { rows } = await query(
    'INSERT INTO items (business_id, category_id, name, price, type, available) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [params.businessId, category_id || null, name, price, type, available !== false]
  );
  return Response.json(rows[0], { status: 201 });
}
