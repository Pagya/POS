'use client';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/api';
import { getBusiness } from '@/lib/auth';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const business = typeof window !== 'undefined' ? getBusiness() : null;

  useEffect(() => {
    if (!business) return;
    api.get(`/dashboard/${business.id}`).then(r => setData(r.data));
  }, []);

  const statusBadge = (s: string) => <span className={`badge badge-${s}`}>{s}</span>;

  const stats = data ? [
    { icon: '📋', value: data.today_orders, label: "Orders Today" },
    { icon: '💰', value: `₹${Number(data.today_revenue).toLocaleString()}`, label: "Revenue Today" },
    { icon: '⭐', value: data.average_rating ?? '—', label: "Avg Rating" },
    { icon: '🕐', value: data.recent_orders.length, label: "Recent Orders" },
  ] : [];

  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>

        {data ? (
          <>
            <div className="grid-4" style={{ marginBottom: 24 }}>
              {stats.map(s => (
                <div key={s.label} className="card stat-card">
                  <div className="stat-icon">{s.icon}</div>
                  <div className="value">{s.value}</div>
                  <div className="label">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 15, fontWeight: 800 }}>Recent Orders</h2>
                <a href="/orders" style={{ fontSize: 13, color: 'var(--orange)', fontWeight: 600 }}>View all →</a>
              </div>
              {data.recent_orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
                  <p style={{ fontWeight: 600 }}>No orders yet today</p>
                  <p style={{ fontSize: 13, marginTop: 4 }}>Head to POS to create your first order</p>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent_orders.map((o: any) => (
                      <tr key={o.id}>
                        <td style={{ fontWeight: 600 }}>{o.customer_name || '—'}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 200 }}>
                          {o.items?.filter(Boolean).map((i: any) => `${i.name} ×${i.quantity}`).join(', ')}
                        </td>
                        <td style={{ fontWeight: 700 }}>₹{Number(o.total).toLocaleString()}</td>
                        <td>{statusBadge(o.status)}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {new Date(o.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[1,2,3,4].map(i => (
              <div key={i} className="card" style={{ flex: '1 1 180px', height: 100, background: '#f5f5f5', animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
