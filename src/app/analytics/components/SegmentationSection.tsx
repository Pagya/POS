'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import LoadingSkeleton from './LoadingSkeleton';

interface WeeklySegment {
  week_start: string;
  new_count: number;
  repeat_count: number;
}

interface SegmentationData {
  total_customers: number;
  new_customers: { count: number; percentage: number };
  repeat_customers: { count: number; percentage: number };
  repeat_purchase_rate: number;
  weekly_breakdown: WeeklySegment[];
  insight: string;
  generated_at: string;
}

export default function SegmentationSection({ branchId }: { branchId: string }) {
  const [data, setData] = useState<SegmentationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get(`/api/analytics/customers/segmentation?branch_id=${branchId}`)
      .then((res) => setData(res.data.data))
      .catch(() => setError('Failed to load segmentation data. Please try again.'))
      .finally(() => setLoading(false));
  }, [branchId]);

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>👥 Customer Segmentation</h2>

      {loading && <LoadingSkeleton lines={4} />}
      {error && <p style={{ color: '#EF4444', fontSize: 13 }}>{error}</p>}

      {data && !loading && (
        <>
          {/* Donut chart (CSS-based) */}
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginBottom: 20 }}>
            <div style={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
              <svg viewBox="0 0 36 36" style={{ width: 100, height: 100, transform: 'rotate(-90deg)' }}>
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E5E7EB" strokeWidth="3.8" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke="#8B5CF6"
                  strokeWidth="3.8"
                  strokeDasharray={`${data.repeat_customers?.percentage ?? 0} ${100 - (data.repeat_customers?.percentage ?? 0)}`}
                  strokeLinecap="round"
                />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke="#06B6D4"
                  strokeWidth="3.8"
                  strokeDasharray={`${data.new_customers?.percentage ?? 0} ${100 - (data.new_customers?.percentage ?? 0)}`}
                  strokeDashoffset={`${-(data.repeat_customers?.percentage ?? 0)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>
                {data.total_customers}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: '#06B6D4' }} />
                <span>New: {data.new_customers?.count ?? 0} ({(data.new_customers?.percentage ?? 0).toFixed(1)}%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: '#8B5CF6' }} />
                <span>Repeat: {data.repeat_customers?.count ?? 0} ({(data.repeat_customers?.percentage ?? 0).toFixed(1)}%)</span>
              </div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>
                Repeat rate: {(data.repeat_purchase_rate * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Stacked bar chart for weekly breakdown */}
          {(data.weekly_breakdown?.length ?? 0) > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Weekly Breakdown</p>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 80 }}>
                {(data.weekly_breakdown ?? []).map((week) => {
                  const total = week.new_count + week.repeat_count || 1;
                  const maxTotal = Math.max(...(data.weekly_breakdown ?? []).map((w) => w.new_count + w.repeat_count), 1);
                  const barH = ((week.new_count + week.repeat_count) / maxTotal) * 70;
                  const newH = (week.new_count / total) * barH;
                  const repeatH = (week.repeat_count / total) * barH;
                  return (
                    <div key={week.week_start} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '80%' }}>
                        <div style={{ width: '100%', height: newH, background: '#06B6D4', borderRadius: '3px 3px 0 0' }} />
                        <div style={{ width: '100%', height: repeatH, background: '#8B5CF6' }} />
                      </div>
                      <div style={{ fontSize: 9, color: '#9CA3AF', textAlign: 'center' }}>
                        {new Date(week.week_start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {data.insight && (
            <div style={{ padding: '12px 14px', background: '#FAF5FF', borderRadius: 8, fontSize: 13, color: '#6B21A8', borderLeft: '3px solid #8B5CF6' }}>
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
