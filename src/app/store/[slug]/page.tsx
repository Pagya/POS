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
  const [success, setSuccess] = useState('');
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
      setSuccess('Order placed successfully!');
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
      setSuccess('Thanks for your feedback! 🙏');
      setCompletedOrderId('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not submit feedback');
    }
  };

  const scrollToCategory = (cat: string) => {
    setActiveCategory(cat);
    categoryRefs.current[cat]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      <div style={{ fontSize: 48 }}>🔍</div>
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
          Thanks {customer.name}! Your order has been placed at <strong>{store.business.name}</strong>.
        </p>
        {completedOrderId && (
          <button onClick={() => setShowFeedback(true)} className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: 15, marginBottom: 12 }}>
            ⭐ Rate your experience
          </button>
        )}
        <button onClick={() => { setOrderConfirmed(false); setSuccess(''); }} className="btn-ghost" style={{ width: '100%', padding: '12px' }}>
          Order more
        </button>
      </div>

      {showFeedback && (
        <div className="modal-overlay" onClick={() => setShowFeedback(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2>How was your experience? 😊</h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>Your feedback helps us improve</p>
            <form onSubmit={submitFeedback}>
              <div className="stars" style={{ marginBottom: 20, justifyContent: 'center' }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <span key={n} className={`star ${feedback.rating >= n ? 'active' : ''}`} onClick={() => setFeedback({ ...feedback, rating: n })}>★</span>
                ))}
              </div>
              <div className="form-group">
                <label>Tell us more (optional)</label>
                <textarea rows={3} value={feedback.comment} onChange={e => setFeedback({ ...feedback, comment: e.target.value })} placeholder="What did you love? What can we improve?" />
              </div>
              {error && <p className="error">{error}</p>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-primary" style={{ flex: 1, padding: '13px' }}>Submit</button>
                <button type="button" className="btn-ghost" onClick={() => { setShowFeedback(false); setSuccess('Thanks! 🙏'); }}>Skip</button>
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
        {/* Hero */}
        <div className="public-hero">
          <h1>{store.business.name}</h1>
          <p>Order online · Fast and easy</p>
          <div className="hero-badge">
            {store.business.type === 'restaurant' ? '🍽️ Restaurant' :
             store.business.type === 'retail' ? '🛍️ Retail Store' :
             store.business.type === 'ecommerce' ? '📦 Online Store' : '🔧 Service'}
          </div>
          {cart.length > 0 && (
            <div style={{ marginTop: 12, fontSize: 13, background: 'rgba(255,255,255,.2)', display: 'inline-block', padding: '4px 14px', borderRadius: 99 }}>
              🛒 {cartCount} items saved in cart
            </div>
          )}
        </div>

        {/* Category nav */}
        {categoryNames.length > 1 && (
          <div className="public-nav">
            {categoryNames.map(cat => (
              <a key={cat} className={activeCategory === cat ? 'active' : ''} onClick={() => scrollToCategory(cat)} style={{ cursor: 'pointer' }}>
                {cat}
              </a>
            ))}
          </div>
        )}

        {/* Items */}
        <div className="public-content">
          {categoryNames.map(cat => (
            <div key={cat} className="category-section" ref={el => { categoryRefs.current[cat] = el; }}>
              <h2>{cat} <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>({grouped[cat].length})</span></h2>
              {grouped[cat].map(item => {
                const inCart = cart.find(c => c.item_id === item.id);
                return (
                  <div key={item.id} className="public-item">
                    <div className="info">
                      <div className="name">{item.name}</div>
                      <div className="price">₹{Number(item.price).toLocaleString()}</div>
                    </div>
                    <div className="add-btn-wrap">
                      {inCart ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1.5px solid var(--orange)', borderRadius: 8, padding: '4px 8px', background: '#fff' }}>
                          <button className="qty-btn" style={{ border: 'none', background: 'transparent', color: 'var(--orange)' }} onClick={() => updateQty(item.id, -1)}>−</button>
                          <span style={{ fontWeight: 700, minWidth: 16, textAlign: 'center', color: 'var(--orange)' }}>{inCart.quantity}</span>
                          <button className="qty-btn" style={{ border: 'none', background: 'transparent', color: 'var(--orange)' }} onClick={() => updateQty(item.id, 1)}>+</button>
                        </div>
                      ) : (
                        <button className="add-btn" onClick={() => addToCart(item)} disabled={!item.available}>
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

      {/* Cart FAB */}
      {cartCount > 0 && (
        <button className="cart-fab" onClick={() => setShowCheckout(true)}>
          <div className="fab-left">
            <span className="fab-count">{cartCount}</span>
            <span>View Cart</span>
          </div>
          <span>₹{cartTotal.toLocaleString()} →</span>
        </button>
      )}

      {/* Checkout modal */}
      {showCheckout && (
        <div className="modal-overlay" onClick={() => setShowCheckout(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2>Your Cart</h2>
            {cart.map(c => (
              <div key={c.item_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f5f5f5', fontSize: 14 }}>
                <span style={{ fontWeight: 600, flex: 1 }}>{c.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button className="qty-btn" onClick={() => updateQty(c.item_id, -1)}>−</button>
                  <span style={{ fontWeight: 700 }}>{c.quantity}</span>
                  <button className="qty-btn" onClick={() => updateQty(c.item_id, 1)}>+</button>
                  <span style={{ minWidth: 64, textAlign: 'right', fontWeight: 700 }}>₹{(c.price * c.quantity).toLocaleString()}</span>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 17, margin: '16px 0' }}>
              <span>Total</span>
              <span style={{ color: 'var(--orange)' }}>₹{cartTotal.toLocaleString()}</span>
            </div>
            <form onSubmit={placeOrder}>
              <div className="form-group">
                <label>Your Name</label>
                <input value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} placeholder="Enter your name" required />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} placeholder="10-digit mobile number" required />
              </div>
              {error && <p className="error">{error}</p>}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button className="btn-primary" style={{ flex: 1, padding: '13px', fontSize: 15 }}>Place Order →</button>
                <button type="button" className="btn-ghost" onClick={() => setShowCheckout(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
