'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface CartItem { item_id: string; name: string; price: number; quantity: number; }

export default function StorePage({ params }: { params: { slug: string } }) {
  const [store, setStore] = useState<any>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [completedOrderId, setCompletedOrderId] = useState('');
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  const [feedback, setFeedback] = useState({ rating: 0, comment: '' });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/public/${params.slug}`).then(r => setStore(r.data)).catch(() => setStore(null));
  }, [params.slug]);

  const addToCart = (item: any) => {
    setCart(prev => {
      const ex = prev.find(c => c.item_id === item.id);
      if (ex) return prev.map(c => c.item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { item_id: item.id, name: item.name, price: Number(item.price), quantity: 1 }];
    });
  };

  const updateQty = (item_id: string, delta: number) => {
    setCart(prev => prev.map(c => c.item_id === item_id ? { ...c, quantity: c.quantity + delta } : c).filter(c => c.quantity > 0));
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
      setShowCheckout(false);
      setSuccess('Order placed! We\'ll get it ready for you.');
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
      setSuccess('Thanks for your feedback!');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not submit feedback');
    }
  };

  // Group items by category
  const grouped: Record<string, any[]> = {};
  store?.items?.forEach((item: any) => {
    const cat = item.category || 'Other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  if (!store) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Store not found.</div>;

  return (
    <div className="public-page">
      <div className="public-header">
        <h1>{store.business.name}</h1>
        <p>{store.business.type}</p>
      </div>

      {success && (
        <div style={{ background: '#d1fae5', color: '#065f46', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          {success}
          {completedOrderId && !showFeedback && (
            <button
              onClick={() => setShowFeedback(true)}
              style={{ marginLeft: 12, background: '#059669', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 13 }}
            >
              Leave Feedback
            </button>
          )}
        </div>
      )}

      {Object.entries(grouped).map(([cat, catItems]) => (
        <div key={cat} className="category-section">
          <h2>{cat}</h2>
          {catItems.map(item => (
            <div key={item.id} className="public-item">
              <div className="info">
                <div className="name">{item.name}</div>
                <div className="price">₹{Number(item.price).toLocaleString()}</div>
              </div>
              <button
                className="btn-primary btn-sm"
                onClick={() => addToCart(item)}
                disabled={!item.available}
              >
                {cart.find(c => c.item_id === item.id) ? `+1 (${cart.find(c => c.item_id === item.id)?.quantity})` : 'Add'}
              </button>
            </div>
          ))}
        </div>
      ))}

      {cartCount > 0 && (
        <button className="cart-fab" onClick={() => setShowCheckout(true)}>
          🛒 {cartCount} items · ₹{cartTotal.toLocaleString()}
        </button>
      )}

      {/* Checkout modal */}
      {showCheckout && (
        <div className="modal-overlay" onClick={() => setShowCheckout(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Your Order</h2>
            {cart.map(c => (
              <div key={c.item_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', fontSize: 14 }}>
                <span>{c.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button className="qty-btn" onClick={() => updateQty(c.item_id, -1)}>−</button>
                  <span>{c.quantity}</span>
                  <button className="qty-btn" onClick={() => updateQty(c.item_id, 1)}>+</button>
                  <span style={{ minWidth: 60, textAlign: 'right' }}>₹{(c.price * c.quantity).toLocaleString()}</span>
                </div>
              </div>
            ))}
            <div style={{ fontWeight: 700, fontSize: 16, margin: '12px 0', borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
              Total: ₹{cartTotal.toLocaleString()}
            </div>
            <form onSubmit={placeOrder}>
              <div className="form-group">
                <label>Your Name</label>
                <input value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} required />
              </div>
              {error && <p className="error">{error}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-primary" style={{ flex: 1 }}>Place Order</button>
                <button type="button" className="btn-ghost" onClick={() => setShowCheckout(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feedback modal */}
      {showFeedback && (
        <div className="modal-overlay" onClick={() => setShowFeedback(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>How was your experience?</h2>
            <form onSubmit={submitFeedback}>
              <div className="stars" style={{ marginBottom: 16 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <span
                    key={n}
                    className={`star ${feedback.rating >= n ? 'active' : ''}`}
                    onClick={() => setFeedback({ ...feedback, rating: n })}
                  >★</span>
                ))}
              </div>
              <div className="form-group">
                <label>Comment (optional)</label>
                <textarea rows={3} value={feedback.comment} onChange={e => setFeedback({ ...feedback, comment: e.target.value })} />
              </div>
              {error && <p className="error">{error}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-primary" style={{ flex: 1 }}>Submit</button>
                <button type="button" className="btn-ghost" onClick={() => setShowFeedback(false)}>Skip</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
