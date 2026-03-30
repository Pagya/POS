'use client';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/api';
import { getBusiness } from '@/lib/auth';

interface CartItem { item_id: string; name: string; price: number; quantity: number; }

export default function POSPage() {
  const business = typeof window !== 'undefined' ? getBusiness() : null;
  const [items, setItems] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState({ name: '', phone: '', table: '', notes: '' });
  const [discount, setDiscount] = useState({ type: 'flat', value: 0 });
  const [payMode, setPayMode] = useState('cash');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (business) api.get(`/catalog/${business.id}/items`).then(r => setItems(r.data));
  }, []);

  const addToCart = (item: any) => {
    if (!item.available) return;
    setCart(prev => {
      const existing = prev.find(c => c.item_id === item.id);
      if (existing) return prev.map(c => c.item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { item_id: item.id, name: item.name, price: Number(item.price), quantity: 1 }];
    });
  };

  const updateQty = (item_id: string, delta: number) => {
    setCart(prev => prev
      .map(c => c.item_id === item_id ? { ...c, quantity: c.quantity + delta } : c)
      .filter(c => c.quantity > 0)
    );
  };

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const discountAmt = discount.type === 'percent' ? (subtotal * discount.value) / 100 : discount.value;
  const total = Math.max(0, subtotal - discountAmt);

  const placeOrder = async () => {
    if (!cart.length) return setError('Cart is empty');
    setError('');
    try {
      await api.post(`/orders/${business.id}`, {
        customer_name: customer.name || undefined,
        customer_phone: customer.phone || undefined,
        table_number: customer.table || undefined,
        notes: customer.notes || undefined,
        source: 'pos',
        discount_type: discount.value ? discount.type : undefined,
        discount_value: discount.value || 0,
        payment_mode: payMode,
        items: cart.map(c => ({ item_id: c.item_id, quantity: c.quantity })),
      });
      setCart([]);
      setCustomer({ name: '', phone: '', table: '', notes: '' });
      setDiscount({ type: 'flat', value: 0 });
      setSuccess('Order placed successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to place order');
    }
  };

  const filtered = items.filter(i => i.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="layout">
      <Sidebar />
      <main className="main" style={{ padding: '20px 24px' }}>
        <div className="pos-layout">
          {/* Item grid */}
          <div>
            <input
              placeholder="Search items..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{ marginBottom: 14 }}
            />
            <div className="item-grid">
              {filtered.map(item => (
                <div
                  key={item.id}
                  className={`item-card ${!item.available ? 'unavailable' : ''}`}
                  onClick={() => addToCart(item)}
                >
                  <div className="item-cat">{item.category_name || 'Uncategorized'}</div>
                  <div className="item-name">{item.name}</div>
                  <div className="item-price">₹{Number(item.price).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Cart */}
          <div className="cart-panel">
            <h3>Cart {cart.length > 0 && `(${cart.length})`}</h3>

            <div className="cart-items">
              {cart.length === 0 && <p style={{ color: '#9ca3af', fontSize: 13 }}>Tap items to add</p>}
              {cart.map(c => (
                <div key={c.item_id} className="cart-item">
                  <span className="name">{c.name}</span>
                  <button className="qty-btn" onClick={() => updateQty(c.item_id, -1)}>−</button>
                  <span style={{ minWidth: 20, textAlign: 'center' }}>{c.quantity}</span>
                  <button className="qty-btn" onClick={() => updateQty(c.item_id, 1)}>+</button>
                  <span style={{ minWidth: 60, textAlign: 'right' }}>₹{(c.price * c.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="cart-footer">
              {/* Customer info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                <input placeholder="Customer name" value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} />
                <input placeholder="Phone" value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} />
                {business?.type === 'restaurant' && (
                  <input placeholder="Table #" value={customer.table} onChange={e => setCustomer({ ...customer, table: e.target.value })} />
                )}
                <input placeholder="Notes" value={customer.notes} onChange={e => setCustomer({ ...customer, notes: e.target.value })} />
              </div>

              {/* Discount */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <select value={discount.type} onChange={e => setDiscount({ ...discount, type: e.target.value })} style={{ width: 90 }}>
                  <option value="flat">₹ Flat</option>
                  <option value="percent">% Off</option>
                </select>
                <input
                  type="number"
                  placeholder="Discount"
                  value={discount.value || ''}
                  onChange={e => setDiscount({ ...discount, value: Number(e.target.value) })}
                />
              </div>

              {/* Payment mode */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                {['cash', 'upi'].map(m => (
                  <button
                    key={m}
                    onClick={() => setPayMode(m)}
                    style={{
                      flex: 1,
                      background: payMode === m ? '#4f46e5' : '#f3f4f6',
                      color: payMode === m ? '#fff' : '#374151',
                      border: 'none', borderRadius: 6, padding: '7px 0', fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    {m.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="cart-total">
                <span>Total</span>
                <span>₹{total.toLocaleString()}</span>
              </div>

              {error && <p className="error" style={{ marginBottom: 8 }}>{error}</p>}
              {success && <p style={{ color: '#059669', fontSize: 13, marginBottom: 8 }}>{success}</p>}

              <button className="btn-primary" style={{ width: '100%' }} onClick={placeOrder}>
                Place Order
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
