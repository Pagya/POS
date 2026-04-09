import { NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    // Get business by slug
    const { rows: bizRows } = await query(
      'SELECT id, name, slug, type FROM businesses WHERE slug=$1',
      [params.slug]
    );

    if (bizRows.length === 0) {
      return Response.json({ error: 'Business not found' }, { status: 404 });
    }

    const business = bizRows[0];

    // Get items for this business
    const { rows: itemRows } = await query(
      `SELECT i.id, i.name, i.price, i.available, c.name AS category_name
       FROM items i
       LEFT JOIN categories c ON c.id = i.category_id
       WHERE i.business_id=$1 AND i.available=true
       ORDER BY c.name, i.name`,
      [business.id]
    );

    return Response.json({
      business,
      items: itemRows,
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
