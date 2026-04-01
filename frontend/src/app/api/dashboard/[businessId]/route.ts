import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { getUser, unauthorized } from '@/lib/apiAuth';

export async function GET(req: NextRequest, { params }: { params: { businessId: string } }) {
  const user = getUser(req);
  if (!user) return unauthorized();

  const bid = params.businessId;
  const today = new Date().toISOString().split('T')[0];

  const [ordersToday, revenueToday, recentOrders, avgRating] = await Promise.all([
    query(`SELECT COUNT(*) AS count FROM orders WHERE business_id=$1 AND created_at::date=$2 AND status != 'cancelled'`, [bid, today]),
    query(`SELECT COALESCE(SUM(total),0) AS revenue FROM orders WHERE business_id=$1 AND created_at::date=$2 AND status != 'cancelled'`, [bid, today]),
    query(`SELECT o.id, o.customer_name, o.total, o.status, o.created_at,
            json_agg(json_build_object('name', oi.name, 'quantity', oi.quantity)) AS items
           FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id
           WHERE o.business_id=$1 GROUP BY o.id ORDER BY o.created_at DESC LIMIT 10`, [bid]),
    query('SELECT ROUND(AVG(rating)::numeric,1) AS average FROM feedback WHERE business_id=$1', [bid]),
  ]);

  return Response.json({
    today_orders: parseInt(ordersToday.rows[0].count),
    today_revenue: parseFloat(revenueToday.rows[0].revenue),
    recent_orders: recentOrders.rows,
    average_rating: avgRating.rows[0].average,
  });
}
