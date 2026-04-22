import { NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const { rows: [business] } = await query(
    'SELECT id, name, type FROM businesses WHERE slug=$1',
    [params.slug]
  );
  if (!business) return Response.json({ error: 'Business not found' }, { status: 404 });

  const { rows: items } = await query(
    `SELECT i.id, i.name, i.price, i.type, i.available, c.name AS category
     FROM items i LEFT JOIN categories c ON c.id = i.category_id
     WHERE i.business_id=$1 AND i.available=true ORDER BY c.name, i.name`,
    [business.id]
  );
  return Response.json({ business, items });
}
