'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import LoadingSkeleton from './LoadingSkeleton';

interface RestockItem {
  product_id: string;
  product_name: string;
  current_stock: number;
  reorder_level: number;
  predicted_demand: number;
  suggested_restock_quantity: number;
  urgency: 'critical' | 'high' | 'medium';
}

interface RestockData {
  items: RestockItem[];
  insight: string;
  generated_at: string;
}

const urgencyStyles: Record<string, { bg: string; color: string; label: string }> = {
  critical: { bg: '#FEE2E2', color: '#991B1B', label: 'Critical' },
  high:     { bg: '#FFEDD5', color: '#9A3412', label: 'High' },
  medium:   { bg: '#FEF9C3', color: '#854D0E', label: 'Medium' },
};

export default function RestockSection({ branchId }: { branchId: string }) {
  const [data, setData] = useState<RestockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get(`/api/analytics/recommendations/restock?branch_id=${branchId}`)
      .then((res) => setData(res.data.data))
      .catch(() => setError('Failed to load restock recommendations. Please try again.'))
      .finally(() => setLoading(false));
  }, [branchId]);

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>🔄 Restock Recommendations</h2>

      {loading && <LoadingSkeleton lines={5} />}
      {error && <p style={{ color: '#EF4444', fontSize: 13 }}>{error}</p>}

      {data && !loading && (
        <>
          {(data.items?.length ?? 0) === 0 ? (
            <p style={{ color: '#6B7280', fontSize: 13 }}>No restock recommendations at this time.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #F3F4F6' }}>
                    <th style={{ textAlign: 'left', padding: '8px 6px', color: '#6B7280', fontWeight: 600 }}>Product</th>
                    <th style={{ textAlign: 'right', padding: '8px 6px', color: '#6B7280', fontWeight: 600 }}>Stock</th>
                    <th style={{ textAlign: 'right', padding: '8px 6px', color: '#6B7280', fontWeight: 600 }}>Reorder At</th>
                    <th style={{ textAlign: 'right', padding: '8px 6px', color: '#6B7280', fontWeight: 600 }}>Predicted</th>
                    <th style={{ textAlign: 'right', padding: '8px 6px', color: '#6B7280', fontWeight: 600 }}>Suggest</th>
                    <th style={{ textAlign: 'center', padding: '8px 6px', color: '#6B7280', fontWeight: 600 }}>Urgency</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.items ?? []).map((item) => {
                    const style = urgencyStyles[item.urgency] || urgencyStyles.medium;
                    return (
                      <tr key={item.product_id} style={{ borderBottom: '1px solid #F9FAFB' }}>
                        <td style={{ padding: '8px 6px', fontWeight: 600 }}>{item.product_name}</td>
                        <td style={{ padding: '8px 6px', textAlign: 'right' }}>{item.current_stock}</td>
                        <td style={{ padding: '8px 6px', textAlign: 'right', color: '#6B7280' }}>{item.reorder_level}</td>
                        <td style={{ padding: '8px 6px', textAlign: 'right', color: '#6B7280' }}>{Math.round(item.predicted_demand)}</td>
                        <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700, color: '#F97316' }}>{item.suggested_restock_quantity}</td>
                        <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 10px',
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 700,
                            background: style.bg,
                            color: style.color,
                          }}>
                            {style.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {data.insight && (
            <div style={{ marginTop: 16, padding: '12px 14px', background: '#FFF1F2', borderRadius: 8, fontSize: 13, color: '#9F1239', borderLeft: '3px solid #F43F5E' }}>
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
