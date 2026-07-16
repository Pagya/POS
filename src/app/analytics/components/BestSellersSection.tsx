'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import LoadingSkeleton from './LoadingSkeleton';

interface BestSellerItem {
  rank: number;
  product_id: string;
  product_name: string;
  total_quantity_sold: number;
  total_revenue: number;
}

interface BestSellersData {
  items: BestSellerItem[];
  insight: string;
  generated_at: string;
}

const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];

export default function BestSellersSection({ branchId }: { branchId: string }) {
  const [data, setData] = useState<BestSellersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get(`/api/analytics/recommendations/best-sellers?branch_id=${branchId}&limit=10`)
      .then((res) => setData(res.data.data))
      .catch(() => setError('Failed to load best sellers. Please try again.'))
      .finally(() => setLoading(false));
  }, [branchId]);

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>🏆 Best Sellers</h2>

      {loading && <LoadingSkeleton lines={5} />}
      {error && <p style={{ color: '#EF4444', fontSize: 13 }}>{error}</p>}

      {data && !loading && (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #F3F4F6' }}>
                  <th style={{ textAlign: 'left', padding: '8px 6px', color: '#6B7280', fontWeight: 600 }}>Rank</th>
                  <th style={{ textAlign: 'left', padding: '8px 6px', color: '#6B7280', fontWeight: 600 }}>Product</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', color: '#6B7280', fontWeight: 600 }}>Qty Sold</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', color: '#6B7280', fontWeight: 600 }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {(data.items ?? []).map((item) => (
                  <tr key={item.product_id} style={{ borderBottom: '1px solid #F9FAFB' }}>
                    <td style={{ padding: '8px 6px' }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: 6,
                        background: rankColors[item.rank - 1] || '#F3F4F6',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 800,
                        color: item.rank <= 3 ? '#fff' : '#374151',
                      }}>
                        {item.rank}
                      </div>
                    </td>
                    <td style={{ padding: '8px 6px', fontWeight: 600 }}>{item.product_name}</td>
                    <td style={{ padding: '8px 6px', textAlign: 'right', color: '#374151' }}>{item.total_quantity_sold}</td>
                    <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700, color: '#F97316' }}>
                      ₹{Number(item.total_revenue).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.insight && (
            <div style={{ marginTop: 16, padding: '12px 14px', background: '#FFFBEB', borderRadius: 8, fontSize: 13, color: '#92400E', borderLeft: '3px solid #F59E0B' }}>
              <strong>AI Insight:</strong> {data.insight}
            </div>
          )}

          <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>
            Generated at {new Date(data.generated_at).toLocaleString()}
          </p>
        </>
      )}
    </div>
  );
}
