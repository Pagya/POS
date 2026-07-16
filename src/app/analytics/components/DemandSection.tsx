'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import LoadingSkeleton from './LoadingSkeleton';
import DataQualityNotice from './DataQualityNotice';

interface DemandForecast {
  product_id: string;
  product_name: string;
  predicted_quantity: number;
  confidence_interval: { lower: number; upper: number };
  data_quality_warning: string | null;
}

interface DemandData {
  forecasts: DemandForecast[];
  insight: string;
  generated_at: string;
}

export default function DemandSection({ branchId }: { branchId: string }) {
  const [data, setData] = useState<DemandData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get(`/api/analytics/forecast/demand?branch_id=${branchId}&horizon_days=7`)
      .then((res) => setData(res.data.data))
      .catch(() => setError('Failed to load demand forecast. Please try again.'))
      .finally(() => setLoading(false));
  }, [branchId]);

  const maxQty = data?.forecasts?.length
    ? Math.max(...data.forecasts.map((f) => f.predicted_quantity), 1)
    : 1;

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>📦 Product Demand Forecast (7 Days)</h2>

      {loading && <LoadingSkeleton lines={5} />}
      {error && <p style={{ color: '#EF4444', fontSize: 13 }}>{error}</p>}

      {data && !loading && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(data.forecasts ?? []).slice(0, 10).map((item) => {
              const barW = (item.predicted_quantity / maxQty) * 100;
              return (
                <div key={item.product_id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{item.product_name}</span>
                    <span style={{ color: '#6B7280' }}>{Math.round(item.predicted_quantity)} units</span>
                  </div>
                  <div style={{ height: 10, background: '#F3F4F6', borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${barW}%`,
                      background: 'linear-gradient(90deg, #3B82F6 0%, #2563EB 100%)',
                      borderRadius: 5,
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                  <DataQualityNotice warning={item.data_quality_warning} />
                </div>
              );
            })}
          </div>

          {data.insight && (
            <div style={{ marginTop: 16, padding: '12px 14px', background: '#EFF6FF', borderRadius: 8, fontSize: 13, color: '#1E40AF', borderLeft: '3px solid #3B82F6' }}>
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
