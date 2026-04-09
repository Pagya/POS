import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { getUser, unauthorized } from '@/lib/apiAuth';

export async function GET(req: NextRequest, { params }: { params: { businessId: string } }) {
  const user = getUser(req);
  if (!user) return unauthorized();

  const [feedbackRows, avgRow, trendRows] = await Promise.all([
    query(`SELECT f.*, o.customer_name FROM feedback f JOIN orders o ON o.id = f.order_id
           WHERE f.business_id=$1 ORDER BY f.created_at DESC LIMIT 50`, [params.businessId]),
    query('SELECT ROUND(AVG(rating)::numeric,1) AS average, COUNT(*) AS total FROM feedback WHERE business_id=$1', [params.businessId]),
    query(`SELECT created_at::date AS date, ROUND(AVG(rating)::numeric,1) AS avg_rating, COUNT(*) AS count
           FROM feedback WHERE business_id=$1 AND created_at >= NOW() - INTERVAL '7 days'
           GROUP BY date ORDER BY date ASC`, [params.businessId]),
  ]);

  const feedback = feedbackRows.rows;
  const stopWords = new Set(['the','a','an','is','it','was','and','or','but','in','on','at','to','for','of','with','this','that','i','my','we','our','your','very','so','not','no','yes','good','bad']);
  const wordFreq: Record<string, number> = {};
  feedback.forEach((f: any) => {
    if (!f.comment) return;
    f.comment.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).forEach((w: string) => {
      if (w.length > 2 && !stopWords.has(w)) wordFreq[w] = (wordFreq[w] || 0) + 1;
    });
  });
  const topKeywords = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([word, count]) => ({ word, count }));

  return Response.json({
    average_rating: avgRow.rows[0].average,
    total_feedback: parseInt(avgRow.rows[0].total),
    trend: trendRows.rows,
    top_keywords: topKeywords,
    positive_count: feedback.filter((f: any) => f.rating >= 4).length,
    negative_count: feedback.filter((f: any) => f.rating <= 2).length,
    feedback,
  });
}
