import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { getUser, unauthorized, forbidden } from '@/lib/apiAuth';

async function ownsBusiness(userId: string, businessId: string) {
  const { rows } = await query('SELECT id FROM businesses WHERE id=$1 AND owner_id=$2', [businessId, userId]);
  return rows.length > 0;
}

export async function GET(req: NextRequest, { params }: { params: { businessId: string } }) {
  const user = getUser(req);
  if (!user) return unauthorized();
  if (!(await ownsBusiness(user.userId, params.businessId))) return forbidden();

  const range = new URL(req.url).searchParams.get('range') || '7d';
  const bid = params.businessId;

  const interval = range === 'today' ? `o.created_at::date = CURRENT_DATE`
    : range === '30d' ? `o.created_at >= NOW() - INTERVAL '30 days'`
    : `o.created_at >= NOW() - INTERVAL '7 days'`;

  const [revenue, topItems, daily, avgOrder] = await Promise.all([
    query(`SELECT COUNT(*) AS order_count, COALESCE(SUM(total),0) AS revenue FROM orders WHERE business_id=$1 AND ${interval} AND status != 'cancelled'`, [bid]),
    query(`SELECT oi.name, SUM(oi.quantity) AS qty, SUM(oi.price * oi.quantity) AS revenue FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.business_id=$1 AND ${interval} AND o.status != 'cancelled' GROUP BY oi.name ORDER BY qty DESC LIMIT 8`, [bid]),
    query(`SELECT o.created_at::date AS date, COUNT(*) AS orders, COALESCE(SUM(total),0) AS revenue FROM orders o WHERE business_id=$1 AND ${interval} AND status != 'cancelled' GROUP BY date ORDER BY date ASC`, [bid]),
    query(`SELECT ROUND(AVG(total)::numeric,2) AS avg_order FROM orders WHERE business_id=$1 AND ${interval} AND status != 'cancelled'`, [bid]),
  ]);

  return Response.json({
    order_count: parseInt(revenue.rows[0].order_count),
    revenue: parseFloat(revenue.rows[0].revenue),
    avg_order_value: parseFloat(avgOrder.rows[0].avg_order) || 0,
    top_items: topItems.rows,
    daily_breakdown: daily.rows,
  });
}
