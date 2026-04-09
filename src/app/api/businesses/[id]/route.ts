import { NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { rows } = await query(
      'SELECT id, name, slug, type FROM businesses WHERE id=$1',
      [params.id]
    );

    if (rows.length === 0) {
      return Response.json({ error: 'Business not found' }, { status: 404 });
    }

    return Response.json(rows[0]);
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
