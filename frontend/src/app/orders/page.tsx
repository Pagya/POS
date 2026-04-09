'use client';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/api';
import { getBusiness } from '@/lib/auth';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  table_number: string;
  notes: string;
  source: string;
  status: string;
  total: number;
  created_at: string;
  items: OrderItem[];
}

export default function OrdersPage() {
  const business = typeof window !== 'undefined' ? getBusiness() : null;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!business) return;
    loadOrders();
  }, [business, statusFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const res = await api.get(`/orders/${business.id}`, { params });
      setOrders(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await api.patch(`/orders/${business.id}/${orderId}/status`, { status: newStatus });
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
      setSuccess('Order status updated');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update order');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      new: '#1565C0',
      processing: '#E65100',
      completed: '#2E7D32',
      cancelled: '#C62828',
    };
    return colors[status] || '#686B78';
  };

  if (loading) {
    return (
      <div className="layout">
        <Sidebar />
        <main className="main">
          <div className="page-header">
            <h1 className="page-title">Orders</h1>
          </div>
          <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>Loading...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <div className="page-header">
          <h1 className="page-title">Orders</h1>
        </div>

        {error && (
          <div style={{ background: '#FEE2E2', color: '#991B1B', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: '#DCFCE7', color: '#166534', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            {success}
          </div>
        )}

        {/* Status Filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
          {['all', 'new', 'processing', 'completed', 'cancelled'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              style={{
                padding: '8px 16px',
                borderRadius: 99,
                fontSize: 13,
                fontWeight: 700,
                border: '1.5px solid',
                background: statusFilter === status ? '#FC8019' : '#fff',
                color: statusFilter === status ? '#fff' : '#686B78',
                borderColor: statusFilter === status ? '#FC8019' : '#E9E9EB',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all .15s',
              }}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="card">
          {orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
              No orders found.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {orders.map(order => (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  style={{
                    border: '1.5px solid #E9E9EB',
                    borderRadius: 10,
                    padding: 14,
                    cursor: 'pointer',
                    transition: 'all .15s',
                    background: selectedOrder?.id === order.id ? '#FFF3E8' : '#fff',
                    borderColor: selectedOrder?.id === order.id ? '#FC8019' : '#E9E9EB',
                  }}
                  onMouseEnter={e => {
                    if (selectedOrder?.id !== order.id) {
                      (e.currentTarget as HTMLDivElement).style.borderColor = '#D1D5DB';
                      (e.currentTarget as HTMLDivElement).style.background = '#F9F9F9';
                    }
                  }}
                  onMouseLeave={e => {
                    if (selectedOrder?.id !== order.id) {
                      (e.currentTarget as HTMLDivElement).style.borderColor = '#E9E9EB';
                      (e.currentTarget as HTMLDivElement).style.background = '#fff';
                    }
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#282C3F', marginBottom: 4 }}>
                        Order #{order.id.slice(0, 8).toUpperCase()}
                      </div>
                      <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                        {order.customer_name || 'Guest'} {order.customer_phone && `• ${order.customer_phone}`}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: 15, color: '#FC8019', marginBottom: 4 }}>
                        ₹{Number(order.total).toLocaleString()}
                      </div>
                      <span className={`badge badge-${order.status}`}>{order.status}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#686B78' }}>
                    <div>
                      {order.items.length} item{order.items.length !== 1 ? 's' : ''} • {order.source}
                      {order.table_number && ` • Table ${order.table_number}`}
                    </div>
                    <div>{formatDate(order.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order Detail Modal */}
        {selectedOrder && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="card" style={{ width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 800 }}>
                  Order #{selectedOrder.id.slice(0, 8).toUpperCase()}
                </h2>
                <button
                  onClick={() => setSelectedOrder(null)}
                  style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9CA3AF' }}
                >
                  ✕
                </button>
              </div>

              {/* Customer Info */}
              <div style={{ background: '#F9F9F9', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#686B78', marginBottom: 8 }}>CUSTOMER</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#282C3F', marginBottom: 4 }}>
                  {selectedOrder.customer_name || 'Guest'}
                </div>
                {selectedOrder.customer_phone && (
                  <div style={{ fontSize: 13, color: '#686B78' }}>{selectedOrder.customer_phone}</div>
                )}
                {selectedOrder.table_number && (
                  <div style={{ fontSize: 13, color: '#686B78' }}>Table {selectedOrder.table_number}</div>
                )}
                {selectedOrder.notes && (
                  <div style={{ fontSize: 13, color: '#686B78', marginTop: 8, fontStyle: 'italic' }}>
                    Notes: {selectedOrder.notes}
                  </div>
                )}
              </div>

              {/* Items */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#686B78', marginBottom: 8 }}>ITEMS</div>
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F0F0F0', fontSize: 13 }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#282C3F' }}>{item.name}</div>
                      <div style={{ color: '#9CA3AF', fontSize: 12 }}>₹{Number(item.price).toLocaleString()} × {item.quantity}</div>
                    </div>
                    <div style={{ fontWeight: 700, color: '#282C3F' }}>
                      ₹{(Number(item.price) * item.quantity).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div style={{ background: '#FFF3E8', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, color: '#FC8019' }}>
                  <span>Total</span>
                  <span>₹{Number(selectedOrder.total).toLocaleString()}</span>
                </div>
              </div>

              {/* Status Update */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#686B78', marginBottom: 8 }}>UPDATE STATUS</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {['new', 'processing', 'completed', 'cancelled'].map(status => (
                    <button
                      key={status}
                      onClick={() => updateOrderStatus(selectedOrder.id, status)}
                      style={{
                        padding: '10px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        border: '1.5px solid',
                        background: selectedOrder.status === status ? getStatusColor(status) : '#fff',
                        color: selectedOrder.status === status ? '#fff' : getStatusColor(status),
                        borderColor: getStatusColor(status),
                        cursor: 'pointer',
                        transition: 'all .15s',
                        textTransform: 'capitalize',
                      }}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Close Button */}
              <button
                className="btn-ghost"
                onClick={() => setSelectedOrder(null)}
                style={{ width: '100%' }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
