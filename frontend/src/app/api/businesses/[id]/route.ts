import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { getUser, unauthorized } from '@/lib/apiAuth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUser(req);
  if (!user) return unauthorized();

  const { rows } = await query(
    'SELECT * FROM businesses WHERE id=$1 AND owner_id=$2',
    [params.id, user.userId]
  );
  if (!rows.length) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(rows[0]);
}
