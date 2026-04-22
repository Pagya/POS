'use client';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/api';
import { getBusiness } from '@/lib/auth';

export default function AnalyticsPage() {
  const business = typeof window !== 'undefined' ? getBusiness() : null;
  const [data, setData] = useState<any>(null);
  const [range, setRange] = useState('7d');

  useEffect(() => {
    if (business) api.get(`/analytics/${business.id}?range=${range}`).then(r => setData(r.data));
  }, [range, business]);

  const maxRevenue = data ? Math.max(...data.daily_breakdown.map((d: any) => Number(d.revenue)), 1) : 1;

  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <div className="page-header">
          <h1 className="page-title">Analytics</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['today', 'Today'], ['7d', '7 Days'], ['30d', '30 Days']].map(([val, label]) => (
              <button key={val} onClick={() => setRange(val)} style={{
                padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1.5px solid', fontFamily: 'inherit',
                borderColor: range === val ? 'var(--orange)' : 'var(--border)',
                background: range === val ? 'var(--orange)' : '#fff',
                color: range === val ? '#fff' : 'var(--text-muted)',
              }}>{label}</button>
            ))}
          </div>
        </div>

        {data ? (
          <>
            <div className="grid-3" style={{ marginBottom: 24 }}>
              <div className="card stat-card">
                <div className="stat-icon">💰</div>
                <div className="value">₹{Number(data.revenue).toLocaleString()}</div>
                <div className="label">Total Revenue</div>
              </div>
              <div className="card stat-card">
                <div className="stat-icon">📋</div>
                <div className="value">{data.order_count}</div>
                <div className="label">Total Orders</div>
              </div>
              <div className="card stat-card">
                <div className="stat-icon">🧾</div>
                <div className="value">₹{Number(data.avg_order_value).toLocaleString()}</div>
                <div className="label">Avg Order Value</div>
              </div>
            </div>

            <div className="grid-2" style={{ alignItems: 'start', marginBottom: 24 }}>
              {/* Revenue chart */}
              <div className="card">
                <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 20 }}>📊 Revenue Breakdown</h2>
                {data.daily_breakdown.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No data for this period</p>
                ) : (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 120 }}>
                    {data.daily_breakdown.map((d: any) => (
                      <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--orange)' }}>₹{Math.round(d.revenue / 1000) > 0 ? Math.round(d.revenue / 1000) + 'k' : d.revenue}</div>
                        <div style={{
                          width: '100%', borderRadius: '4px 4px 0 0',
                          height: `${(Number(d.revenue) / maxRevenue) * 100}px`,
                          background: 'linear-gradient(180deg, var(--orange) 0%, #FF6B35 100%)',
                          minHeight: 4,
                        }} />
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>
                          {new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top items */}
              <div className="card">
                <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>🏆 Top Selling Items</h2>
                {data.top_items.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No sales data yet</p>
                ) : (
                  data.top_items.map((item: any, i: number) => (
                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #F5F5F5' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'var(--orange-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: i < 3 ? '#fff' : 'var(--orange)', flexShrink: 0 }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{item.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.qty} sold</div>
                      </div>
                      <div style={{ fontWeight: 700, color: 'var(--orange)', fontSize: 14 }}>₹{Number(item.revenue).toLocaleString()}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
        )}
      </main>
    </div>
  );
}
