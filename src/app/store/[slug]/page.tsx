'use client';
import { useEffect, useState, useRef } from 'react';
import api from '@/lib/api';

interface CartItem { item_id: string; name: string; price: number; quantity: number; }

const CART_KEY = (slug: string) => `cart_${slug}`;

export default function StorePage({ params }: { params: { slug: string } }) {
  const [store, setStore] = useState<any>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [completedOrderId, setCompletedOrderId] = useState('');
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  const [feedback, setFeedback] = useState({ rating: 0, comment: '' });
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    api.get(`/public/${params.slug}`).then(r => setStore(r.data)).catch(() => setStore(null));
  }, [params.slug]);

  useEffect(() => {
    const saved = localStorage.getItem(CART_KEY(params.slug));
    if (saved) try { setCart(JSON.parse(saved)); } catch {}
  }, [params.slug]);

  useEffect(() => {
    localStorage.setItem(CART_KEY(params.slug), JSON.stringify(cart));
  }, [cart, params.slug]);

  const addToCart = (item: any) => {
    setCart(prev => {
      const ex = prev.find(c => c.item_id === item.id);
      if (ex) return prev.map(c => c.item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { item_id: item.id, name: item.name, price: Number(item.price), quantity: 1 }];
    });
  };

  const updateQty = (item_id: string, delta: number) => {
    setCart(prev =>
      prev.map(c => c.item_id === item_id ? { ...c, quantity: c.quantity + delta } : c)
          .filter(c => c.quantity > 0)
    );
  };

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!cart.length) return setError('Your cart is empty');
    try {
      const { data } = await api.post(`/orders/${store.business.id}`, {
        customer_name: customer.name,
        customer_phone: customer.phone,
        source: 'online',
        items: cart.map(c => ({ item_id: c.item_id, quantity: c.quantity })),
      });
      setCart([]);
      localStorage.removeItem(CART_KEY(params.slug));
      setShowCheckout(false);
      setOrderConfirmed(true);
      setCompletedOrderId(data.id);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to place order');
    }
  };

  const submitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.rating) return setError('Please select a rating');
    try {
      await api.post('/feedback', { order_id: completedOrderId, rating: feedback.rating, comment: feedback.comment });
      setShowFeedback(false);
      setCompletedOrderId('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not submit feedback');
    }
  };

  const grouped: Record<string, any[]> = {};
  store?.items?.forEach((item: any) => {
    const cat = item.category || 'Menu';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });
  const categoryNames = Object.keys(grouped);

  if (store === null) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 48 }}>404</div>
      <p style={{ fontWeight: 700, fontSize: 18 }}>Store not found</p>
    </div>
  );

  if (!store) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
    </div>
  );

  if (orderConfirmed) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>🎉</div>
        <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 8 }}>Order Confirmed!</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 32, lineHeight: 1.6 }}>
          Thanks {customer.name}! Your order is placed at {store.business.name}.
        </p>
        {completedOrderId && (
          <button onClick={() => setShowFeedback(true)} className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: 15, marginBottom: 12 }}>
            Rate your experience
          </button>
        )}
        <button onClick={() => setOrderConfirmed(false)} className="btn-ghost" style={{ width: '100%', padding: '12px' }}>
          Order more
        </button>
      </div>
      {showFeedback && (
        <div className="modal-overlay" onClick={() => setShowFeedback(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2>How was your experience?</h2>
            <form onSubmit={submitFeedback}>
              <div className="stars" style={{ marginBottom: 20, justifyContent: 'center' }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <span key={n} className={`star ${feedback.rating >= n ? 'active' : ''}`} onClick={() => setFeedback({ ...feedback, rating: n })}>★</span>
                ))}
              </div>
              <div className="form-group">
                <label>Comment (optional)</label>
                <textarea rows={3} value={feedback.comment} onChange={e => setFeedback({ ...feedback, comment: e.target.value })} />
              </div>
              {error && <p className="error">{error}</p>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-primary" style={{ flex: 1 }}>Submit</button>
                <button type="button" className="btn-ghost" onClick={() => setShowFeedback(false)}>Skip</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="public-page">
        <div style={{ background: 'linear-gradient(135deg, #FC8019 0%, #FF6B35 100%)', padding: '32px 24px', color: '#fff' }}>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>{store.business.name}</h1>
          <p style={{ fontSize: 14, opacity: .85, marginTop: 4 }}>Order online</p>
          {cartCount > 0 && (
            <div style={{ marginTop: 12, fontSize: 13, background: 'rgba(255,255,255,.2)', display: 'inline-block', padding: '4px 14px', borderRadius: 99 }}>
              {cartCount} items in cart
            </div>
          )}
        </div>

        {categoryNames.length > 1 && (
          <div style={{ background: '#fff', padding: '0 24px', display: 'flex', gap: 0, overflowX: 'auto', borderBottom: '2px solid #e9e9eb', position: 'sticky', top: 0, zIndex: 10 }}>
            {categoryNames.map(cat => (
              <a key={cat} onClick={() => { setActiveCategory(cat); categoryRefs.current[cat]?.scrollIntoView({ behavior: 'smooth' }); }}
                style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', borderBottom: activeCategory === cat ? '2px solid #FC8019' : '2px solid transparent', color: activeCategory === cat ? '#FC8019' : '#686B78', marginBottom: -2 }}>
                {cat}
              </a>
            ))}
          </div>
        )}

        <div style={{ padding: '0 24px' }}>
          {categoryNames.map(cat => (
            <div key={cat} style={{ paddingTop: 24, marginBottom: 8 }} ref={el => { categoryRefs.current[cat] = el; }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid #e9e9eb' }}>{cat}</h2>
              {grouped[cat].map(item => {
                const inCart = cart.find(c => c.item_id === item.id);
                return (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid #f5f5f5', gap: 16 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{item.name}</div>
                      <div style={{ fontWeight: 700, fontSize: 14, marginTop: 4 }}>₹{Number(item.price).toLocaleString()}</div>
                    </div>
                    <div>
                      {inCart ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1.5px solid #FC8019', borderRadius: 8, padding: '4px 8px', background: '#fff' }}>
                          <button onClick={() => updateQty(item.id, -1)} style={{ background: 'none', border: 'none', color: '#FC8019', fontWeight: 700, fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>−</button>
                          <span style={{ fontWeight: 700, minWidth: 16, textAlign: 'center', color: '#FC8019' }}>{inCart.quantity}</span>
                          <button onClick={() => updateQty(item.id, 1)} style={{ background: 'none', border: 'none', color: '#FC8019', fontWeight: 700, fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>+</button>
                        </div>
                      ) : (
                        <button onClick={() => addToCart(item)} disabled={!item.available}
                          style={{ background: '#fff', color: '#FC8019', border: '1.5px solid #FC8019', borderRadius: 8, padding: '8px 20px', fontWeight: 700, fontSize: 14, cursor: item.available ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                          {item.available ? 'ADD' : 'Sold out'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {cartCount > 0 && (
        <button onClick={() => setShowCheckout(true)}
          style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#FC8019', color: '#fff', padding: '16px 28px', borderRadius: 12, fontWeight: 800, boxShadow: '0 8px 24px rgba(252,128,25,.45)', cursor: 'pointer', border: 'none', fontSize: 15, display: 'flex', alignItems: 'center', gap: 12, minWidth: 320, justifyContent: 'space-between', fontFamily: 'inherit' }}>
          <span style={{ background: 'rgba(255,255,255,.25)', borderRadius: 6, padding: '2px 8px' }}>{cartCount}</span>
          <span>View Cart</span>
          <span>₹{cartTotal.toLocaleString()} →</span>
        </button>
      )}

      {showCheckout && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowCheckout(false)}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: 24, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, background: '#e9e9eb', borderRadius: 99, margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Your Cart</h2>
            {cart.map(c => (
              <div key={c.item_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f5f5f5', fontSize: 14 }}>
                <span style={{ fontWeight: 600, flex: 1 }}>{c.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button onClick={() => updateQty(c.item_id, -1)} style={{ width: 26, height: 26, borderRadius: 6, background: '#FFF3E8', color: '#FC8019', border: '1.5px solid #FC8019', fontWeight: 700, cursor: 'pointer', fontSize: 16 }}>−</button>
                  <span style={{ fontWeight: 700 }}>{c.quantity}</span>
                  <button onClick={() => updateQty(c.item_id, 1)} style={{ width: 26, height: 26, borderRadius: 6, background: '#FFF3E8', color: '#FC8019', border: '1.5px solid #FC8019', fontWeight: 700, cursor: 'pointer', fontSize: 16 }}>+</button>
                  <span style={{ minWidth: 64, textAlign: 'right', fontWeight: 700 }}>₹{(c.price * c.quantity).toLocaleString()}</span>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 17, margin: '16px 0', color: '#282C3F' }}>
              <span>Total</span>
              <span style={{ color: '#FC8019' }}>₹{cartTotal.toLocaleString()}</span>
            </div>
            <form onSubmit={placeOrder}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#686B78', textTransform: 'uppercase' }}>Your Name</label>
                <input value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} placeholder="Enter your name" required style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e9e9eb', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#686B78', textTransform: 'uppercase' }}>Phone Number</label>
                <input value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} placeholder="10-digit mobile number" required style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e9e9eb', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
              </div>
              {error && <p style={{ color: '#E02020', fontSize: 13, marginBottom: 8 }}>{error}</p>}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="submit" style={{ flex: 1, padding: 13, fontSize: 15, background: '#FC8019', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Place Order →</button>
                <button type="button" onClick={() => setShowCheckout(false)} style={{ padding: '13px 20px', background: 'transparent', border: '1.5px solid #e9e9eb', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
