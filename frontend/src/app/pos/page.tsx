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
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    if (business) api.get(`/catalog/${business.id}/items`).then(r => setItems(r.data));
  }, []);

  const categories = ['All', ...Array.from(new Set(items.map(i => i.category_name || 'Other')))];

  const addToCart = (item: any) => {
    if (!item.available) return;
    setCart(prev => {
      const ex = prev.find(c => c.item_id === item.id);
      if (ex) return prev.map(c => c.item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
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
  const discountAmt = discount.type === 'percent' ? (subtotal * discount.value) / 100 : Number(discount.value);
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
      setSuccess('✅ Order placed!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to place order');
    }
  };

  const filtered = items.filter(i => {
    const matchCat = activeCategory === 'All' || (i.category_name || 'Other') === activeCategory;
    const matchSearch = i.name.toLowerCase().includes(filter.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="layout">
      <Sidebar />
      <main className="main" style={{ padding: '20px 24px' }}>
        <div className="pos-layout">
          {/* Left: item grid */}
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {/* Search */}
            <div className="search-bar">
              <span className="search-icon">🔍</span>
              <input
                placeholder="Search items..."
                value={filter}
                onChange={e => setFilter(e.target.value)}
              />
            </div>

            {/* Category pills */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: '5px 14px',
                    borderRadius: 99,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1.5px solid',
                    borderColor: activeCategory === cat ? 'var(--orange)' : 'var(--border)',
                    background: activeCategory === cat ? 'var(--orange)' : '#fff',
                    color: activeCategory === cat ? '#fff' : 'var(--text-muted)',
                    fontFamily: 'inherit',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="item-grid">
              {filtered.map(item => (
                <div
                  key={item.id}
                  className={`item-card ${!item.available ? 'unavailable' : ''}`}
                  onClick={() => addToCart(item)}
                >
                  <div className="item-cat">{item.category_name || 'Other'}</div>
                  <div className="item-name">{item.name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="item-price">₹{Number(item.price).toLocaleString()}</div>
                    {cart.find(c => c.item_id === item.id) && (
                      <span style={{ background: 'var(--orange)', color: '#fff', borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                        {cart.find(c => c.item_id === item.id)?.quantity}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 32 }}>🔍</div>
                  <p style={{ marginTop: 8, fontWeight: 600 }}>No items found</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: cart */}
          <div className="cart-panel">
            <div className="cart-header">
              <h3>🛒 Order Summary</h3>
              <p>{cart.length === 0 ? 'Tap items to add' : `${cart.reduce((s,i)=>s+i.quantity,0)} items added`}</p>
            </div>

            <div className="cart-items">
              {cart.map(c => (
                <div key={c.item_id} className="cart-item">
                  <span className="name">{c.name}</span>
                  <button className="qty-btn" onClick={() => updateQty(c.item_id, -1)}>−</button>
                  <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 700 }}>{c.quantity}</span>
                  <button className="qty-btn" onClick={() => updateQty(c.item_id, 1)}>+</button>
                  <span className="item-total">₹{(c.price * c.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="cart-footer">
              {/* Customer info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                <input placeholder="Customer name" value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} />
                <input placeholder="Phone" value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} />
                {business?.type === 'restaurant' && (
                  <input placeholder="Table #" value={customer.table} onChange={e => setCustomer({ ...customer, table: e.target.value })} />
                )}
                <input placeholder="Notes" value={customer.notes} onChange={e => setCustomer({ ...customer, notes: e.target.value })} />
              </div>

              {/* Discount */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <select value={discount.type} onChange={e => setDiscount({ ...discount, type: e.target.value })} style={{ width: 100 }}>
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
              <div className="pay-toggle" style={{ marginBottom: 14 }}>
                {['cash', 'upi'].map(m => (
                  <button key={m} className={`pay-btn ${payMode === m ? 'active' : ''}`} onClick={() => setPayMode(m)}>
                    {m === 'cash' ? '💵 Cash' : '📱 UPI'}
                  </button>
                ))}
              </div>

              {/* Totals */}
              {subtotal > 0 && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>Subtotal</span><span>₹{subtotal.toLocaleString()}</span>
                  </div>
                  {discountAmt > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--green)', marginBottom: 4 }}>
                      <span>Discount</span><span>−₹{discountAmt.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="cart-total">
                <span>Total</span>
                <span>₹{total.toLocaleString()}</span>
              </div>

              {error && <p className="error" style={{ marginBottom: 8 }}>{error}</p>}
              {success && <p style={{ color: 'var(--green)', fontSize: 13, marginBottom: 8, fontWeight: 600 }}>{success}</p>}

              <button
                className="btn-primary"
                style={{ width: '100%', padding: '13px', fontSize: 15 }}
                onClick={placeOrder}
              >
                Place Order →
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
