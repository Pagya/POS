'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import LoadingSkeleton from './LoadingSkeleton';
import DataQualityNotice from './DataQualityNotice';

interface ForecastPoint {
  date: string;
  predicted_revenue: number;
  confidence_interval: { lower: number; upper: number };
}

interface SalesForecastData {
  forecast: ForecastPoint[];
  insight: string;
  data_quality_warning: string | null;
  generated_at: string;
}

export default function SalesForecastSection({ branchId }: { branchId: string }) {
  const [data, setData] = useState<SalesForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get(`/api/analytics/forecast/sales?branch_id=${branchId}&horizon_days=7`)
      .then((res) => {
        setData(res.data.data);
      })
      .catch(() => {
        setError('Failed to load sales forecast. Please try again.');
      })
      .finally(() => setLoading(false));
  }, [branchId]);

  const maxVal = data
    ? Math.max(...data.forecast.map((p) => p.confidence_interval.upper), 1)
    : 1;

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>📈 Sales Forecast (7 Days)</h2>

      {loading && <LoadingSkeleton lines={5} />}

      {error && (
        <p style={{ color: '#EF4444', fontSize: 13 }}>{error}</p>
      )}

      {data && !loading && (
        <>
          {/* Simple area-style bar chart with confidence bands */}
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 140, minWidth: 300 }}>
              {data.forecast.map((point) => {
                const barH = (point.predicted_revenue / maxVal) * 120;
                const upperH = (point.confidence_interval.upper / maxVal) * 120;
                const lowerH = (point.confidence_interval.lower / maxVal) * 120;
                const label = new Date(point.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                return (
                  <div key={point.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 36 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--orange, #F97316)' }}>
                      {Math.round(point.predicted_revenue / 1000) > 0
                        ? `${Math.round(point.predicted_revenue / 1000)}k`
                        : Math.round(point.predicted_revenue)}
                    </div>
                    <div style={{ position: 'relative', width: '100%', height: 120, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                      {/* Confidence band */}
                      <div style={{
                        position: 'absolute',
                        bottom: lowerH,
                        width: '100%',
                        height: upperH - lowerH,
                        background: 'rgba(249,115,22,0.15)',
                        borderRadius: 4,
                      }} />
                      {/* Predicted bar */}
                      <div style={{
                        width: '60%',
                        height: barH,
                        background: 'linear-gradient(180deg, #F97316 0%, #EA580C 100%)',
                        borderRadius: '4px 4px 0 0',
                        minHeight: 4,
                        position: 'relative',
                        zIndex: 1,
                      }} />
                    </div>
                    <div style={{ fontSize: 10, color: '#6B7280', textAlign: 'center' }}>{label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <DataQualityNotice warning={data.data_quality_warning} />

          {data.insight && (
            <div style={{ marginTop: 16, padding: '12px 14px', background: '#F0FDF4', borderRadius: 8, fontSize: 13, color: '#166534', borderLeft: '3px solid #22C55E' }}>
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
