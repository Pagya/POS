'use client';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/api';
import { getBusiness } from '@/lib/auth';

interface CartItem {
  item_id: string;
  name: string;
  price: number;
  quantity: number;
  item_discount: number;
}

interface Customer {
  name: string;
  phone: string;
  table: string;
  notes: string;
}

// ── Sub-components ──────────────────────────────────────────

function CategoryTabs({ categories, active, onChange }: { categories: string[]; active: string; onChange: (c: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, flexShrink: 0 }}>
      {categories.map(cat => (
        <button key={cat} onClick={() => onChange(cat)} style={{
          padding: '7px 16px', borderRadius: 99, fontSize: 12, fontWeight: 700,
          whiteSpace: 'nowrap', cursor: 'pointer', border: '1.5px solid', fontFamily: 'inherit',
          transition: 'all .12s',
          borderColor: active === cat ? '#FC8019' : '#E9E9EB',
          background: active === cat ? '#FC8019' : '#fff',
          color: active === cat ? '#fff' : '#686B78',
          boxShadow: active === cat ? '0 2px 8px rgba(252,128,25,.3)' : 'none',
        }}>
          {cat === 'Recent' ? '🕐 Recent' : cat}
        </button>
      ))}
    </div>
  );
}

function ItemCard({ item, qty, onAdd }: { item: any; qty: number; onAdd: () => void }) {
  return (
    <div onClick={onAdd} style={{
      background: '#fff', border: `2px solid ${qty > 0 ? '#FC8019' : '#E9E9EB'}`,
      borderRadius: 12, padding: '14px 12px', cursor: item.available ? 'pointer' : 'not-allowed',
      opacity: item.available ? 1 : 0.45, transition: 'border-color .12s, box-shadow .12s, transform .1s',
      boxShadow: qty > 0 ? '0 4px 16px rgba(252,128,25,.18)' : '0 1px 4px rgba(0,0,0,.05)',
      transform: qty > 0 ? 'translateY(-1px)' : 'none', position: 'relative',
    }}>
      {qty > 0 && (
        <div style={{ position: 'absolute', top: -8, right: -8, background: '#FC8019', color: '#fff', borderRadius: 99, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, boxShadow: '0 2px 6px rgba(252,128,25,.4)' }}>
          {qty}
        </div>
      )}
      <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>
        {item.category_name || 'Item'}
      </div>
      <div style={{ fontWeight: 700, fontSize: 13, color: '#282C3F', lineHeight: 1.3, marginBottom: 8, minHeight: 32 }}>
        {item.name}
      </div>
      <div style={{ fontWeight: 800, fontSize: 15, color: '#FC8019' }}>
        ₹{Number(item.price).toLocaleString()}
      </div>
      {!item.available && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,.7)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#E02020' }}>
          Unavailable
        </div>
      )}
    </div>
  );
}

function CartItemRow({ item, onInc, onDec, onRemove }: { item: CartItem; onInc: () => void; onDec: () => void; onRemove: () => void }) {
  const lineTotal = (item.price - item.item_discount) * item.quantity;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: '1px solid #F5F5F5' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: '#282C3F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
        <div style={{ fontSize: 12, color: '#9CA3AF' }}>₹{item.price.toLocaleString()} each</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <button onClick={onDec} style={{ width: 26, height: 26, borderRadius: 6, background: '#FFF3E8', color: '#FC8019', border: '1.5px solid #FC8019', fontWeight: 800, cursor: 'pointer', fontSize: 15, lineHeight: 1, fontFamily: 'inherit' }}>−</button>
        <span style={{ minWidth: 22, textAlign: 'center', fontWeight: 800, fontSize: 14, color: '#282C3F' }}>{item.quantity}</span>
        <button onClick={onInc} style={{ width: 26, height: 26, borderRadius: 6, background: '#FC8019', color: '#fff', border: '1.5px solid #FC8019', fontWeight: 800, cursor: 'pointer', fontSize: 15, lineHeight: 1, fontFamily: 'inherit' }}>+</button>
      </div>
      <div style={{ minWidth: 64, textAlign: 'right', fontWeight: 700, fontSize: 13, color: '#282C3F' }}>₹{lineTotal.toLocaleString()}</div>
      <button onClick={onRemove} style={{ background: 'none', border: 'none', color: '#D1D5DB', cursor: 'pointer', fontSize: 16, padding: '0 2px', lineHeight: 1, flexShrink: 0 }} title="Remove">✕</button>
    </div>
  );
}

// ── Main POS Page ────────────────────────────────────────────

export default function POSPage() {
  const business = typeof window !== 'undefined' ? getBusiness() : null;
  const [items, setItems] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<Customer>({ name: '', phone: '', table: '', notes: '' });
  const [customerHistory, setCustomerHistory] = useState<any>(null);
  const [discount, setDiscount] = useState({ type: 'flat', value: 0 });
  const [payMode, setPayMode] = useState('cash');
  const [orderType, setOrderType] = useState('dine-in');
  const [filter, setFilter] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [placing, setPlacing] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const isRestaurant = business?.type === 'restaurant';
  const isService = business?.type === 'service';

  useEffect(() => {
    if (business) api.get(`/catalog/${business.id}/items`).then(r => setItems(r.data));
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handlePlaceOrder(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'Backspace') { e.preventDefault(); setCart(p => p.slice(0, -1)); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cart]);

  const lookupCustomer = useCallback(async (phone: string) => {
    if (phone.length < 10 || !business) return;
    try {
      const { data } = await api.get(`/customers/${business.id}/lookup?phone=${phone}`);
      if (data) { setCustomerHistory(data); setCustomer(c => ({ ...c, name: data.name })); }
      else setCustomerHistory(null);
    } catch { setCustomerHistory(null); }
  }, [business]);

  // Cart operations
  const addToCart = useCallback((item: any) => {
    if (!item.available) return;
    setCart(prev => {
      const ex = prev.find(c => c.item_id === item.id);
      if (ex) return prev.map(c => c.item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { item_id: item.id, name: item.name, price: Number(item.price), quantity: 1, item_discount: 0 }];
    });
    setRecentIds(prev => [item.id, ...prev.filter(id => id !== item.id)].slice(0, 10));
    if (filter) setFilter('');
  }, [filter]);

  const updateQty = useCallback((item_id: string, delta: number) => {
    setCart(prev => prev.map(c => c.item_id === item_id ? { ...c, quantity: c.quantity + delta } : c).filter(c => c.quantity > 0));
  }, []);

  const removeFromCart = useCallback((item_id: string) => {
    setCart(prev => prev.filter(c => c.item_id !== item_id));
  }, []);

  // Billing calculations (memoized)
  const { subtotal, discountAmt, taxAmount, total } = useMemo(() => {
    const subtotal = cart.reduce((s, i) => s + (i.price - i.item_discount) * i.quantity, 0);
    const discountAmt = discount.type === 'percent' ? (subtotal * discount.value) / 100 : Number(discount.value);
    const afterDiscount = Math.max(0, subtotal - discountAmt);
    const taxRate = business?.tax_rate || 0;
    const taxAmount = (afterDiscount * taxRate) / 100;
    return { subtotal, discountAmt, taxAmount, total: afterDiscount + taxAmount };
  }, [cart, discount, business]);

  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.quantity, 0), [cart]);

  const handlePlaceOrder = async () => {
    if (!cart.length || placing) return;
    setError(''); setPlacing(true);
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
      setSuccess('Order placed!'); setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to place order');
    } finally { setPlacing(false); }
  };

  // Filtered items
  const categories = useMemo(() =>
    ['All', 'Recent', ...Array.from(new Set(items.map(i => i.category_name || 'Other')))],
    [items]
  );

  const filtered = useMemo(() => items.filter(i => {
    if (activeCategory === 'Recent') return recentIds.includes(i.id);
    const matchCat = activeCategory === 'All' || (i.category_name || 'Other') === activeCategory;
    return matchCat && i.name.toLowerCase().includes(filter.toLowerCase());
  }), [items, activeCategory, recentIds, filter]);

  const qtyInCart = (id: string) => cart.find(c => c.item_id === id)?.quantity || 0;

  return (
    <div className="layout">
      <Sidebar />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: '#F2F2F2', overflow: 'hidden' }}>

        {/* Top bar */}
        <div style={{ background: '#fff', borderBottom: '1px solid #E9E9EB', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#282C3F' }}>
            🧾 POS Billing
            {business && <span style={{ marginLeft: 10, fontSize: 12, color: '#9CA3AF', fontWeight: 500 }}>{business.name}</span>}
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#9CA3AF' }}>
            <span>⌘F Search</span>
            <span>⌘↵ Place Order</span>
            <span>⌫ Remove last</span>
          </div>
        </div>

        {/* 2-panel layout */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 380px', gap: 0, minHeight: 0, overflow: 'hidden' }}>

          {/* ── LEFT PANEL ── */}
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, padding: '16px 16px 16px 20px', gap: 12, overflow: 'hidden' }}>

            {/* Search */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: '#9CA3AF' }}>🔍</span>
              <input
                ref={searchRef}
                value={filter}
                onChange={e => setFilter(e.target.value)}
                placeholder="Search items... (⌘F)"
                style={{ width: '100%', padding: '10px 12px 10px 38px', border: '1.5px solid #E9E9EB', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#fff', transition: 'border-color .15s' }}
                onFocus={e => e.target.style.borderColor = '#FC8019'}
                onBlur={e => e.target.style.borderColor = '#E9E9EB'}
              />
              {filter && (
                <button onClick={() => setFilter('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 16 }}>✕</button>
              )}
            </div>

            {/* Category tabs */}
            <CategoryTabs categories={categories} active={activeCategory} onChange={setActiveCategory} />

            {/* Item grid */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, alignContent: 'start', paddingRight: 4 }}>
              {filtered.map(item => (
                <ItemCard key={item.id} item={item} qty={qtyInCart(item.id)} onAdd={() => addToCart(item)} />
              ))}
              {filtered.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: '#9CA3AF' }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
                  <p style={{ fontWeight: 700, fontSize: 14 }}>{filter ? `No results for "${filter}"` : 'No items in this category'}</p>
                  {filter && <button onClick={() => setFilter('')} style={{ marginTop: 8, background: 'none', border: 'none', color: '#FC8019', fontWeight: 600, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Clear search</button>}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT PANEL (Cart) ── */}
          <div style={{ background: '#fff', borderLeft: '1px solid #E9E9EB', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>

            {/* Cart header */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #E9E9EB', background: '#FFF3E8', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#282C3F' }}>🛒 Order</div>
                {cart.length > 0 && (
                  <button onClick={() => setCart([])} style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Clear all</button>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#686B78', marginTop: 2 }}>
                {cartCount === 0 ? 'Tap items to add' : `${cartCount} item${cartCount > 1 ? 's' : ''} added`}
              </div>
            </div>

            {/* Customer info */}
            <div style={{ padding: '12px 18px', borderBottom: '1px solid #F5F5F5', background: '#FAFAFA', flexShrink: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input placeholder="Phone" value={customer.phone}
                  onChange={e => { setCustomer(c => ({ ...c, phone: e.target.value })); lookupCustomer(e.target.value); }}
                  style={{ padding: '8px 10px', border: '1.5px solid #E9E9EB', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
                <input placeholder="Name" value={customer.name}
                  onChange={e => setCustomer(c => ({ ...c, name: e.target.value }))}
                  style={{ padding: '8px 10px', border: '1.5px solid #E9E9EB', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
              </div>
              {customerHistory && (
                <div style={{ marginTop: 8, background: '#FFF3E8', borderRadius: 8, padding: '6px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>👋</span>
                  <span style={{ fontWeight: 700, color: '#FC8019' }}>Returning</span>
                  <span style={{ color: '#686B78' }}>{customerHistory.recent_orders?.length || 0} past orders</span>
                </div>
              )}
              {isRestaurant && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                  <input placeholder="Table #" value={customer.table}
                    onChange={e => setCustomer(c => ({ ...c, table: e.target.value }))}
                    style={{ padding: '8px 10px', border: '1.5px solid #E9E9EB', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
                  <select value={orderType} onChange={e => setOrderType(e.target.value)}
                    style={{ padding: '8px 10px', border: '1.5px solid #E9E9EB', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#fff' }}>
                    <option value="dine-in">🍽 Dine-in</option>
                    <option value="takeaway">🥡 Takeaway</option>
                  </select>
                </div>
              )}
              <input placeholder="Notes (optional)" value={customer.notes}
                onChange={e => setCustomer(c => ({ ...c, notes: e.target.value }))}
                style={{ marginTop: 8, width: '100%', padding: '8px 10px', border: '1.5px solid #E9E9EB', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            {/* Cart items */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF' }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>🛒</div>
                  <p style={{ fontSize: 13, fontWeight: 600 }}>Cart is empty</p>
                  <p style={{ fontSize: 12, marginTop: 4 }}>Click items on the left to add</p>
                </div>
              ) : (
                cart.map(c => (
                  <CartItemRow key={c.item_id} item={c}
                    onInc={() => updateQty(c.item_id, 1)}
                    onDec={() => updateQty(c.item_id, -1)}
                    onRemove={() => removeFromCart(c.item_id)} />
                ))
              )}
            </div>

            {/* Billing summary + checkout */}
            <div style={{ padding: '14px 18px', borderTop: '1px solid #E9E9EB', flexShrink: 0 }}>

              {/* Discount row */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <select value={discount.type} onChange={e => setDiscount(d => ({ ...d, type: e.target.value }))}
                  style={{ width: 88, padding: '7px 8px', border: '1.5px solid #E9E9EB', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', outline: 'none', background: '#fff' }}>
                  <option value="flat">₹ Flat</option>
                  <option value="percent">% Off</option>
                </select>
                <input type="number" min={0} placeholder="Discount"
                  value={discount.value || ''}
                  onChange={e => setDiscount(d => ({ ...d, value: Number(e.target.value) }))}
                  style={{ flex: 1, padding: '7px 10px', border: '1.5px solid #E9E9EB', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
              </div>

              {/* Payment mode */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {[{ id: 'cash', label: '💵 Cash' }, { id: 'upi', label: '📱 UPI' }].map(m => (
                  <button key={m.id} onClick={() => setPayMode(m.id)} style={{
                    flex: 1, padding: '8px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                    border: '1.5px solid', transition: 'all .12s',
                    borderColor: payMode === m.id ? '#FC8019' : '#E9E9EB',
                    background: payMode === m.id ? '#FC8019' : '#fff',
                    color: payMode === m.id ? '#fff' : '#686B78',
                  }}>{m.label}</button>
                ))}
              </div>

              {/* Bill breakdown */}
              {subtotal > 0 && (
                <div style={{ background: '#FAFAFA', borderRadius: 10, padding: '10px 12px', marginBottom: 12, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#686B78', marginBottom: 4 }}>
                    <span>Subtotal</span><span>₹{subtotal.toLocaleString()}</span>
                  </div>
                  {discountAmt > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#60B246', marginBottom: 4 }}>
                      <span>Discount</span><span>−₹{discountAmt.toFixed(2)}</span>
                    </div>
                  )}
                  {taxAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#686B78', marginBottom: 4 }}>
                      <span>Tax</span><span>₹{taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 18, color: '#282C3F', borderTop: '1px solid #E9E9EB', paddingTop: 8, marginTop: 4 }}>
                    <span>Total</span>
                    <span style={{ color: '#FC8019' }}>₹{total.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {error && <p style={{ color: '#E02020', fontSize: 13, marginBottom: 8, fontWeight: 500 }}>{error}</p>}
              {success && (
                <div style={{ background: '#E8F5E9', color: '#2E7D32', borderRadius: 8, padding: '10px 14px', marginBottom: 10, fontSize: 13, fontWeight: 700, textAlign: 'center' }}>
                  ✅ {success}
                </div>
              )}

              {/* CTA */}
              <button onClick={handlePlaceOrder} disabled={cart.length === 0 || placing}
                style={{
                  width: '100%', padding: '14px', fontSize: 15, fontWeight: 800, borderRadius: 10,
                  border: 'none', cursor: cart.length === 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  background: cart.length === 0 ? '#E9E9EB' : placing ? '#FFB366' : '#FC8019',
                  color: cart.length === 0 ? '#9CA3AF' : '#fff',
                  transition: 'background .15s, transform .1s',
                  boxShadow: cart.length > 0 ? '0 4px 16px rgba(252,128,25,.35)' : 'none',
                }}>
                {placing ? 'Placing...' : cart.length === 0 ? 'Add items to order' : `Place Order  ⌘↵`}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
