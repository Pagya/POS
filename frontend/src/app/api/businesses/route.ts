import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { getUser, unauthorized } from '@/lib/apiAuth';

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return unauthorized();

  const { name, type } = await req.json();
  if (!name || !type) return Response.json({ error: 'name and type required' }, { status: 400 });

  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();
  try {
    const { rows } = await query(
      'INSERT INTO businesses (owner_id, name, slug, type) VALUES ($1,$2,$3,$4) RETURNING *',
      [user.userId, name, slug, type]
    );
    return Response.json(rows[0], { status: 201 });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return unauthorized();

  const { rows } = await query(
    'SELECT * FROM businesses WHERE owner_id=$1 ORDER BY created_at DESC',
    [user.userId]
  );
  return Response.json(rows);
}
