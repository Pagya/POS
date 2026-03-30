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

  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <h1 className="page-title">Dashboard</h1>

        {data ? (
          <>
            <div className="grid-4" style={{ marginBottom: 24 }}>
              <div className="card stat-card">
                <div className="value">{data.today_orders}</div>
                <div className="label">Orders Today</div>
              </div>
              <div className="card stat-card">
                <div className="value">₹{Number(data.today_revenue).toLocaleString()}</div>
                <div className="label">Revenue Today</div>
              </div>
              <div className="card stat-card">
                <div className="value">{data.average_rating ?? '—'}</div>
                <div className="label">Avg Rating ⭐</div>
              </div>
              <div className="card stat-card">
                <div className="value">{data.recent_orders.length}</div>
                <div className="label">Recent Orders</div>
              </div>
            </div>

            <div className="card">
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Recent Orders</h2>
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
                      <td>{o.customer_name || '—'}</td>
                      <td style={{ fontSize: 12, color: '#6b7280' }}>
                        {o.items?.filter(Boolean).map((i: any) => `${i.name} x${i.quantity}`).join(', ')}
                      </td>
                      <td>₹{Number(o.total).toLocaleString()}</td>
                      <td>{statusBadge(o.status)}</td>
                      <td style={{ fontSize: 12, color: '#9ca3af' }}>
                        {new Date(o.created_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p style={{ color: '#9ca3af' }}>Loading...</p>
        )}
      </main>
    </div>
  );
}
