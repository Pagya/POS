'use client';
import { useEffect, useState, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/api';
import { getBusiness } from '@/lib/auth';

const STATUSES = ['new', 'processing', 'completed', 'cancelled'];

export default function OrdersPage() {
  const business = typeof window !== 'undefined' ? getBusiness() : null;
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<any>(null);

  const load = useCallback(async () => {
    if (!business) return;
    const params = filter ? `?status=${filter}` : '';
    const { data } = await api.get(`/orders/${business.id}${params}`);
    setOrders(data);
  }, [filter, business]);

  useEffect(() => { load(); }, [load]);

  // poll every 15s for online orders
  useEffect(() => {
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const updateStatus = async (orderId: string, status: string) => {
    await api.patch(`/orders/${business.id}/${orderId}/status`, { status });
    load();
    if (selected?.id === orderId) setSelected({ ...selected, status });
  };

  const statusBadge = (s: string) => <span className={`badge badge-${s}`}>{s}</span>;

  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h1 className="page-title" style={{ marginBottom: 0 }}>Orders</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={`btn-ghost btn-sm ${!filter ? 'btn-primary' : ''}`} onClick={() => setFilter('')}>All</button>
            {STATUSES.map(s => (
              <button key={s} className={`btn-ghost btn-sm ${filter === s ? 'btn-primary' : ''}`} onClick={() => setFilter(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 360px' : '1fr', gap: 20 }}>
          <div className="card">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Customer</th>
                  <th>Source</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o, i) => (
                  <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(o)}>
                    <td style={{ color: '#9ca3af', fontSize: 12 }}>{orders.length - i}</td>
                    <td>{o.customer_name || '—'}</td>
                    <td><span className="badge badge-new">{o.source}</span></td>
                    <td>₹{Number(o.total).toLocaleString()}</td>
                    <td>{statusBadge(o.status)}</td>
                    <td style={{ fontSize: 12, color: '#9ca3af' }}>{new Date(o.created_at).toLocaleString()}</td>
                    <td>
                      <select
                        value={o.status}
                        onClick={e => e.stopPropagation()}
                        onChange={e => updateStatus(o.id, e.target.value)}
                        style={{ fontSize: 12, padding: '4px 6px' }}
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selected && (
            <div className="card" style={{ position: 'sticky', top: 20, alignSelf: 'start' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700 }}>Order Detail</h2>
                <button className="btn-ghost btn-sm" onClick={() => setSelected(null)}>✕</button>
              </div>
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Customer: {selected.customer_name || '—'}</p>
              {selected.customer_phone && <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Phone: {selected.customer_phone}</p>}
              {selected.table_number && <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Table: {selected.table_number}</p>}
              {selected.notes && <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Notes: {selected.notes}</p>}
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>Payment: {selected.payment_mode}</p>

              <table style={{ marginBottom: 12 }}>
                <thead><tr><th>Item</th><th>Qty</th><th>Price</th></tr></thead>
                <tbody>
                  {selected.items?.filter(Boolean).map((item: any, i: number) => (
                    <tr key={i}>
                      <td>{item.name}</td>
                      <td>{item.quantity}</td>
                      <td>₹{(item.price * item.quantity).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {selected.discount_value > 0 && (
                <p style={{ fontSize: 13, color: '#ef4444', marginBottom: 4 }}>
                  Discount: -{selected.discount_type === 'percent' ? `${selected.discount_value}%` : `₹${selected.discount_value}`}
                </p>
              )}
              <p style={{ fontWeight: 700, fontSize: 16 }}>Total: ₹{Number(selected.total).toLocaleString()}</p>

              <div style={{ marginTop: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Update Status</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {STATUSES.map(s => (
                    <button
                      key={s}
                      onClick={() => updateStatus(selected.id, s)}
                      style={{
                        padding: '5px 10px', fontSize: 12, borderRadius: 6, cursor: 'pointer', border: 'none',
                        background: selected.status === s ? '#4f46e5' : '#f3f4f6',
                        color: selected.status === s ? '#fff' : '#374151',
                        fontWeight: 600,
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
