'use client';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/api';
import { getBusiness } from '@/lib/auth';

export default function FeedbackPage() {
  const business = typeof window !== 'undefined' ? getBusiness() : null;
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (business) api.get(`/feedback/${business.id}`).then(r => setData(r.data));
  }, []);

  const stars = (n: number) => Array.from({ length: 5 }, (_, i) => (
    <span key={i} style={{ color: i < n ? '#FFB800' : '#E0E0E0', fontSize: 16 }}>★</span>
  ));

  const sentimentColor = (rating: number) => rating >= 4 ? 'var(--green)' : rating <= 2 ? 'var(--red)' : '#E65100';
  const sentimentLabel = (rating: number) => rating >= 4 ? '😊 Positive' : rating <= 2 ? '😞 Negative' : '😐 Neutral';

  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <h1 className="page-title">Feedback Intelligence</h1>

        {data ? (
          <>
            {/* Top stats */}
            <div className="grid-4" style={{ marginBottom: 24 }}>
              <div className="card stat-card">
                <div className="stat-icon">⭐</div>
                <div className="value" style={{ color: '#FFB800' }}>{data.average_rating ?? '—'}</div>
                <div className="label">Average Rating</div>
              </div>
              <div className="card stat-card">
                <div className="stat-icon">📝</div>
                <div className="value">{data.total_feedback}</div>
                <div className="label">Total Reviews</div>
              </div>
              <div className="card stat-card" style={{ borderLeftColor: 'var(--green)' }}>
                <div className="stat-icon">😊</div>
                <div className="value" style={{ color: 'var(--green)' }}>{data.positive_count}</div>
                <div className="label">Positive (4–5★)</div>
              </div>
              <div className="card stat-card" style={{ borderLeftColor: 'var(--red)' }}>
                <div className="stat-icon">😞</div>
                <div className="value" style={{ color: 'var(--red)' }}>{data.negative_count}</div>
                <div className="label">Negative (1–2★)</div>
              </div>
            </div>

            <div className="grid-2" style={{ marginBottom: 24, alignItems: 'start' }}>
              {/* 7-day trend */}
              <div className="card">
                <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>📈 7-Day Rating Trend</h2>
                {data.trend.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Not enough data yet</p>
                ) : (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 80 }}>
                    {data.trend.map((t: any) => (
                      <div key={t.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--orange)' }}>{t.avg_rating}</div>
                        <div style={{
                          width: '100%', borderRadius: 4,
                          height: `${(t.avg_rating / 5) * 60}px`,
                          background: t.avg_rating >= 4 ? 'var(--green)' : t.avg_rating <= 2 ? 'var(--red)' : 'var(--orange)',
                          minHeight: 4,
                        }} />
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top keywords */}
              <div className="card">
                <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>🔑 Top Keywords</h2>
                {data.top_keywords.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No comments yet</p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {data.top_keywords.map((k: any) => (
                      <span key={k.word} style={{
                        background: 'var(--orange-light)', color: 'var(--orange)',
                        padding: '4px 12px', borderRadius: 99, fontSize: 13, fontWeight: 700,
                        fontSize: `${Math.min(16, 11 + k.count)}px`,
                      }}>
                        {k.word} <span style={{ opacity: .6, fontSize: 11 }}>×{k.count}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Feedback list */}
            <div className="card">
              <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>Recent Feedback</h2>
              {data.feedback.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No feedback yet. Complete some orders to start collecting ratings.</p>
              )}
              {data.feedback.map((f: any) => (
                <div key={f.id} style={{ padding: '14px 0', borderBottom: '1px solid #F5F5F5', display: 'flex', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 99, background: 'var(--orange-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                    {f.rating >= 4 ? '😊' : f.rating <= 2 ? '😞' : '😐'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div>{stars(f.rating)}</div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: sentimentColor(f.rating), background: sentimentColor(f.rating) + '18', padding: '2px 8px', borderRadius: 99 }}>
                          {sentimentLabel(f.rating)}
                        </span>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(f.created_at).toLocaleDateString('en-IN')}</span>
                    </div>
                    {f.customer_name && <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{f.customer_name}</div>}
                    {f.comment && <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{f.comment}</div>}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
        )}
      </main>
    </div>
  );
}
