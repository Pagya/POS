'use client';
import { useEffect, useState, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/api';
import { getBusiness } from '@/lib/auth';

const STATUSES = ['new', 'processing', 'completed', 'cancelled'];
const STATUS_COLORS: Record<string, string> = {
  new: '#1565C0', processing: '#E65100', completed: '#2E7D32', cancelled: '#C62828'
};
const STATUS_BG: Record<string, string> = {
  new: '#E8F4FF', processing: '#FFF8E1', completed: '#E8F5E9', cancelled: '#FFEBEE'
};

export default function OrdersPage() {
  const business = typeof window !== 'undefined' ? getBusiness() : null;
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('today');
  const [selected, setSelected] = useState<any>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!business) return;
    const params = new URLSearchParams();
    if (filter) params.set('status', filter);
    if (dateFilter) params.set('date', dateFilter);
    const { data } = await api.get(`/orders/${business.id}?${params}`);
    setOrders(data);
  }, [filter, dateFilter, business]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  const updateStatus = async (orderId: string, status: string) => {
    setUpdating(orderId);
    await api.patch(`/orders/${business.id}/${orderId}/status`, { status });
    await load();
    if (selected?.id === orderId) setSelected((s: any) => ({ ...s, status }));
    setUpdating(null);
  };

  const markPaid = async (orderId: string) => {
    await api.patch(`/orders/${business.id}/${orderId}/paid`, {});
    await load();
    if (selected?.id === orderId) setSelected((s: any) => ({ ...s, paid: true }));
  };

  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = orders.filter(o => o.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <div className="page-header">
          <h1 className="page-title">Orders</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            {['today', '7d', '30d', ''].map(d => (
              <button key={d} onClick={() => setDateFilter(d)}
                style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1.5px solid', fontFamily: 'inherit',
                  borderColor: dateFilter === d ? 'var(--orange)' : 'var(--border)',
                  background: dateFilter === d ? 'var(--orange)' : '#fff',
                  color: dateFilter === d ? '#fff' : 'var(--text-muted)' }}>
                {d === 'today' ? 'Today' : d === '7d' ? '7 Days' : d === '30d' ? '30 Days' : 'All'}
              </button>
            ))}
          </div>
        </div>

        {/* Status filter tabs with counts */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <button onClick={() => setFilter('')} style={{
            padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: '1.5px solid', fontFamily: 'inherit',
            borderColor: !filter ? 'var(--orange)' : 'var(--border)',
            background: !filter ? 'var(--orange)' : '#fff',
            color: !filter ? '#fff' : 'var(--text-muted)' }}>
            All <span style={{ marginLeft: 6, background: 'rgba(255,255,255,.3)', borderRadius: 99, padding: '1px 7px', fontSize: 11 }}>{orders.length}</span>
          </button>
          {STATUSES.map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: '1.5px solid', fontFamily: 'inherit',
              borderColor: filter === s ? STATUS_COLORS[s] : 'var(--border)',
              background: filter === s ? STATUS_BG[s] : '#fff',
              color: filter === s ? STATUS_COLORS[s] : 'var(--text-muted)' }}>
              {s} <span style={{ marginLeft: 6, background: STATUS_BG[s], color: STATUS_COLORS[s], borderRadius: 99, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{counts[s]}</span>
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 20 }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
                <p style={{ fontWeight: 600 }}>No orders found</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>Customer</th><th>Type</th><th>Items</th>
                    <th>Total</th><th>Status</th><th>Paid</th><th>Time</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o, i) => (
                    <tr key={o.id} style={{ cursor: 'pointer', background: selected?.id === o.id ? '#FFFAF5' : undefined }} onClick={() => setSelected(o)}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>{orders.length - i}</td>
                      <td style={{ fontWeight: 600 }}>{o.customer_name || '—'}<br /><span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>{o.customer_phone}</span></td>
                      <td><span style={{ fontSize: 11, background: '#f5f5f5', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>{o.order_type || o.source}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {o.items?.filter(Boolean).map((it: any) => `${it.name} ×${it.quantity}`).join(', ')}
                      </td>
                      <td style={{ fontWeight: 700 }}>₹{Number(o.total).toLocaleString()}</td>
                      <td>
                        <span style={{ background: STATUS_BG[o.status], color: STATUS_COLORS[o.status], padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                          {o.status}
                        </span>
                      </td>
                      <td>{o.paid ? <span style={{ color: 'var(--green)', fontWeight: 700, fontSize: 12 }}>✓ Paid</span> : <span style={{ color: '#ccc', fontSize: 12 }}>Unpaid</span>}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(o.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {o.status === 'new' && <button onClick={() => updateStatus(o.id, 'processing')} style={{ background: '#FFF8E1', color: '#E65100', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Process</button>}
                          {o.status === 'processing' && <button onClick={() => updateStatus(o.id, 'completed')} style={{ background: '#E8F5E9', color: '#2E7D32', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Complete</button>}
                          {updating === o.id && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>...</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Order detail drawer */}
          {selected && (
            <div className="card" style={{ position: 'sticky', top: 20, alignSelf: 'start', padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', background: 'var(--orange-light)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{selected.customer_name || 'Guest Order'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{selected.customer_phone} · {selected.order_type || selected.source}</div>
                </div>
                <button className="btn-ghost btn-sm" onClick={() => setSelected(null)}>✕</button>
              </div>

              <div style={{ padding: '16px 20px' }}>
                {selected.table_number && <div style={{ fontSize: 13, marginBottom: 8 }}>🪑 Table {selected.table_number}</div>}
                {selected.notes && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, background: '#f9f9f9', padding: '8px 10px', borderRadius: 6 }}>📝 {selected.notes}</div>}

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

                <div style={{ fontSize: 13, color: 'var(--text-muted)', background: '#FAFAFA', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
                  {selected.subtotal > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Subtotal</span><span>₹{Number(selected.subtotal).toLocaleString()}</span></div>}
                  {selected.discount_value > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--green)', marginBottom: 4 }}><span>Discount</span><span>−₹{selected.discount_value}</span></div>}
                  {selected.tax_amount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Tax ({selected.tax_rate}%)</span><span>₹{Number(selected.tax_amount).toFixed(2)}</span></div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15, color: 'var(--text)', borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
                    <span>Total</span><span style={{ color: 'var(--orange)' }}>₹{Number(selected.total).toLocaleString()}</span>
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Update Status</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {STATUSES.map(s => (
                      <button key={s} onClick={() => updateStatus(selected.id, s)} style={{
                        padding: '6px 12px', fontSize: 12, borderRadius: 6, cursor: 'pointer', border: '1.5px solid', fontWeight: 700, fontFamily: 'inherit',
                        borderColor: selected.status === s ? STATUS_COLORS[s] : 'var(--border)',
                        background: selected.status === s ? STATUS_BG[s] : '#fff',
                        color: selected.status === s ? STATUS_COLORS[s] : 'var(--text-muted)',
                      }}>{s}</button>
                    ))}
                  </div>
                </div>

                {!selected.paid && (
                  <button onClick={() => markPaid(selected.id)} className="btn-primary" style={{ width: '100%' }}>
                    ✓ Mark as Paid
                  </button>
                )}
                {selected.paid && <div style={{ textAlign: 'center', color: 'var(--green)', fontWeight: 700, fontSize: 14 }}>✓ Payment received</div>}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
