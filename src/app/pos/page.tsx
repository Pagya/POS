'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/api';
import { getBusiness } from '@/lib/auth';

interface CartItem { item_id: string; name: string; price: number; quantity: number; item_discount: number; }

export default function POSPage() {
  const business = typeof window !== 'undefined' ? getBusiness() : null;
  const [items, setItems] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState({ name: '', phone: '', table: '', notes: '' });
  const [customerHistory, setCustomerHistory] = useState<any>(null);
  const [discount, setDiscount] = useState({ type: 'flat', value: 0 });
  const [payMode, setPayMode] = useState('cash');
  const [orderType, setOrderType] = useState('dine-in');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [recentItems, setRecentItems] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  const isRestaurant = business?.type === 'restaurant';
  const isService = business?.type === 'service';

  useEffect(() => {
    if (business) api.get(`/catalog/${business.id}/items`).then(r => setItems(r.data));
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) placeOrder();
      if (e.key === 'Backspace' && e.altKey) removeLastItem();
      if (e.key === 'f' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cart]);

  // Phone lookup for returning customers
  const lookupCustomer = useCallback(async (phone: string) => {
    if (phone.length < 10 || !business) return;
    try {
      const { data } = await api.get(`/customers/${business.id}/lookup?phone=${phone}`);
      if (data) { setCustomerHistory(data); setCustomer(c => ({ ...c, name: data.name })); }
      else setCustomerHistory(null);
    } catch { setCustomerHistory(null); }
  }, [business]);

  const categories = ['All', 'Recent', ...Array.from(new Set(items.map(i => i.category_name || 'Other')))];

  const addToCart = (item: any) => {
    if (!item.available) return;
    setCart(prev => {
      const ex = prev.find(c => c.item_id === item.id);
      if (ex) return prev.map(c => c.item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { item_id: item.id, name: item.name, price: Number(item.price), quantity: 1, item_discount: 0 }];
    });
    setRecentItems(prev => [item.id, ...prev.filter(id => id !== item.id)].slice(0, 8));
    setFilter('');
  };

  const updateQty = (item_id: string, delta: number) => {
    setCart(prev => prev.map(c => c.item_id === item_id ? { ...c, quantity: c.quantity + delta } : c).filter(c => c.quantity > 0));
  };

  const removeLastItem = () => setCart(prev => prev.slice(0, -1));

  const subtotal = cart.reduce((s, i) => s + (i.price - i.item_discount) * i.quantity, 0);
  const discountAmt = discount.type === 'percent' ? (subtotal * discount.value) / 100 : Number(discount.value);
  const afterDiscount = Math.max(0, subtotal - discountAmt);
  const taxRate = business?.tax_rate || 0;
  const taxAmount = (afterDiscount * taxRate) / 100;
  const total = afterDiscount + taxAmount;

  const placeOrder = async () => {
    if (!cart.length) return setError('Cart is empty');
    setError('');
    try {
      await api.post(`/orders/${business.id}`, {
        customer_name: customer.name || undefined,
        customer_phone: customer.phone || undefined,
        table_number: customer.table || undefined,
        notes: customer.notes || undefined,
        source: 'pos', order_type: orderType,
        discount_type: discount.value ? discount.type : undefined,
        discount_value: discount.value || 0,
        payment_mode: payMode,
        items: cart.map(c => ({ item_id: c.item_id, quantity: c.quantity, discount: c.item_discount })),
      });
      setCart([]); setCustomer({ name: '', phone: '', table: '', notes: '' });
      setDiscount({ type: 'flat', value: 0 }); setCustomerHistory(null);
      setSuccess('✅ Order placed!'); setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) { setError(err.response?.data?.error || 'Failed to place order'); }
  };

  const filtered = items.filter(i => {
    if (activeCategory === 'Recent') return recentItems.includes(i.id);
    const matchCat = activeCategory === 'All' || (i.category_name || 'Other') === activeCategory;
    return matchCat && i.name.toLowerCase().includes(filter.toLowerCase());
  });

  return (
    <div className="layout">
      <Sidebar />
      <main className="main" style={{ padding: '16px 20px' }}>
        {/* Keyboard hint */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, fontSize: 11, color: 'var(--text-muted)' }}>
          <span>⌘+Enter → Place Order</span>
          <span>⌥+Backspace → Remove last</span>
          <span>⌘+F → Search</span>
        </div>

        <div className="pos-layout">
          {/* LEFT: item grid */}
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div className="search-bar">
              <span className="search-icon">🔍</span>
              <input ref={searchRef} placeholder="Search items... (⌘F)" value={filter} onChange={e => setFilter(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              {categories.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                  padding: '5px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: '1.5px solid', fontFamily: 'inherit',
                  borderColor: activeCategory === cat ? 'var(--orange)' : 'var(--border)',
                  background: activeCategory === cat ? 'var(--orange)' : '#fff',
                  color: activeCategory === cat ? '#fff' : 'var(--text-muted)',
                }}>
                  {cat === 'Recent' ? '🕐 Recent' : cat}
                </button>
              ))}
            </div>

            <div className="item-grid">
              {filtered.map(item => (
                <div key={item.id} className={`item-card ${!item.available ? 'unavailable' : ''}`} onClick={() => addToCart(item)}>
                  <div className="item-cat">{item.category_name || 'Other'}</div>
                  <div className="item-name">{item.name}</div>
                  {isService && item.duration_minutes && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>⏱ {item.duration_minutes} min</div>
                  )}
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

          {/* RIGHT: cart */}
          <div className="cart-panel">
            <div className="cart-header">
              <h3>🛒 Order</h3>
              <p>{cart.length === 0 ? 'Tap items to add' : `${cart.reduce((s, i) => s + i.quantity, 0)} items`}</p>
            </div>

            {/* Customer section */}
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', background: '#FAFAFA' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input
                  placeholder="Phone (auto-lookup)"
                  value={customer.phone}
                  onChange={e => { setCustomer({ ...customer, phone: e.target.value }); lookupCustomer(e.target.value); }}
                />
                <input
                  placeholder="Customer name"
                  value={customer.name}
                  onChange={e => setCustomer({ ...customer, name: e.target.value })}
                />
              </div>
              {customerHistory && (
                <div style={{ marginTop: 8, background: '#FFF3E8', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                  <span style={{ fontWeight: 700, color: 'var(--orange)' }}>👋 Returning customer</span>
                  <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{customerHistory.recent_orders?.length} past orders</span>
                </div>
              )}
              {isRestaurant && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                  <input placeholder="Table #" value={customer.table} onChange={e => setCustomer({ ...customer, table: e.target.value })} />
                  <select value={orderType} onChange={e => setOrderType(e.target.value)} style={{ fontSize: 13 }}>
                    <option value="dine-in">🍽 Dine-in</option>
                    <option value="takeaway">🥡 Takeaway</option>
                  </select>
                </div>
              )}
              <input placeholder="Notes" value={customer.notes} onChange={e => setCustomer({ ...customer, notes: e.target.value })} style={{ marginTop: 8 }} />
            </div>

            {/* Cart items */}
            <div className="cart-items">
              {cart.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: '16px 0', textAlign: 'center' }}>Cart is empty</p>}
              {cart.map(c => (
                <div key={c.item_id} className="cart-item">
                  <div style={{ flex: 1 }}>
                    <div className="name">{c.name}</div>
                    {c.item_discount > 0 && <div style={{ fontSize: 11, color: 'var(--green)' }}>−₹{c.item_discount} off</div>}
                  </div>
                  <button className="qty-btn" onClick={() => updateQty(c.item_id, -1)}>−</button>
                  <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 700 }}>{c.quantity}</span>
                  <button className="qty-btn" onClick={() => updateQty(c.item_id, 1)}>+</button>
                  <span className="item-total">₹{((c.price - c.item_discount) * c.quantity).toLocaleString()}</span>
                  <button onClick={() => setCart(prev => prev.filter(x => x.item_id !== c.item_id))}
                    style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>✕</button>
                </div>
              ))}
            </div>

            <div className="cart-footer">
              {/* Discount */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <select value={discount.type} onChange={e => setDiscount({ ...discount, type: e.target.value })} style={{ width: 90 }}>
                  <option value="flat">₹ Flat</option>
                  <option value="percent">% Off</option>
                </select>
                <input type="number" placeholder="Discount" value={discount.value || ''} onChange={e => setDiscount({ ...discount, value: Number(e.target.value) })} />
              </div>

              {/* Payment mode */}
              <div className="pay-toggle" style={{ marginBottom: 12 }}>
                {['cash', 'upi'].map(m => (
                  <button key={m} className={`pay-btn ${payMode === m ? 'active' : ''}`} onClick={() => setPayMode(m)}>
                    {m === 'cash' ? '💵 Cash' : '📱 UPI'}
                  </button>
                ))}
              </div>

              {/* Bill breakdown */}
              {subtotal > 0 && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10, background: '#FAFAFA', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>Subtotal</span><span>₹{subtotal.toLocaleString()}</span>
                  </div>
                  {discountAmt > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--green)', marginBottom: 4 }}>
                      <span>Discount</span><span>−₹{discountAmt.toFixed(2)}</span>
                    </div>
                  )}
                  {taxRate > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>Tax ({taxRate}%)</span><span>₹{taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="cart-total"><span>Total</span><span>₹{total.toLocaleString()}</span></div>

              {error && <p className="error" style={{ marginBottom: 8 }}>{error}</p>}
              {success && <p style={{ color: 'var(--green)', fontSize: 13, marginBottom: 8, fontWeight: 600 }}>{success}</p>}

              <button className="btn-primary" style={{ width: '100%', padding: '13px', fontSize: 15 }} onClick={placeOrder}>
                Place Order ⌘↵
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
