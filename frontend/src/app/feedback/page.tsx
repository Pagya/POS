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

  const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <h1 className="page-title">Feedback Intelligence</h1>

        {data ? (
          <>
            <div className="card" style={{ marginBottom: 20, display: 'inline-block', minWidth: 200 }}>
              <div style={{ fontSize: 48, fontWeight: 800, color: '#f59e0b' }}>{data.average_rating ?? '—'}</div>
              <div style={{ fontSize: 14, color: '#6b7280' }}>Average Rating</div>
              {data.average_rating && (
                <div style={{ fontSize: 20, color: '#f59e0b', marginTop: 4 }}>
                  {stars(Math.round(data.average_rating))}
                </div>
              )}
            </div>

            <div className="card">
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Recent Feedback</h2>
              {data.feedback.length === 0 && <p style={{ color: '#9ca3af', fontSize: 13 }}>No feedback yet. Complete some orders to start collecting ratings.</p>}
              {data.feedback.map((f: any) => (
                <div key={f.id} style={{ padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#f59e0b', fontSize: 18 }}>{stars(f.rating)}</span>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>{new Date(f.created_at).toLocaleDateString()}</span>
                  </div>
                  {f.customer_name && <p style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{f.customer_name}</p>}
                  {f.comment && <p style={{ fontSize: 13, color: '#374151', marginTop: 4 }}>{f.comment}</p>}
                </div>
              ))}
            </div>
          </>
        ) : (
          <p style={{ color: '#9ca3af' }}>Loading...</p>
        )}
      </main>
    </div>
  );
}
