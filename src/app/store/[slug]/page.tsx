'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';

interface Item {
  id: string;
  name: string;
  price: number;
  category_name: string;
  available: boolean;
}

interface CartItem {
  item_id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Business {
  id: string;
  name: string;
  slug: string;
  type: string;
}

export default function PublicStorePage() {
  const params = useParams();
  const slug = params.slug as string;

  const [business, setBusiness] = useState<Business | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({
    customer_name: '',
    customer_phone: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  useEffect(() => {
    loadStore();
  }, [slug]);

  const loadStore = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/public/${slug}`);
      setBusiness(res.data.business);
      setItems(res.data.items);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Store not found');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item: Item) => {
    const existing = cart.find(c => c.item_id === item.id);
    if (existing) {
      setCart(cart.map(c => c.item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { item_id: item.id, name: item.name, price: item.price, quantity: 1 }]);
    }
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(c => c.item_id !== itemId));
  };

  const updateQuantity = (itemId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(itemId);
    } else {
      setCart(cart.map(c => c.item_id === itemId ? { ...c, quantity: qty } : c));
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const categories = Array.from(new Set(items.map(i => i.category_name).filter(Boolean)));

  const handleSubmitOrder = async () => {
    if (!checkoutForm.customer_name.trim()) {
      alert('Please enter your name');
      return;
    }
    if (!checkoutForm.customer_phone.trim()) {
      alert('Please enter your phone number');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/api/orders/${business!.id}`, {
        customer_name: checkoutForm.customer_name,
        customer_phone: checkoutForm.customer_phone,
        notes: checkoutForm.notes,
        source: 'online',
        items: cart.map(c => ({ item_id: c.item_id, quantity: c.quantity })),
      });
      setOrderSuccess(true);
      setCart([]);
      setCheckoutForm({ customer_name: '', customer_phone: '', notes: '' });
      setShowCheckout(false);
      setTimeout(() => setOrderSuccess(false), 3000);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, -apple-system, sans-serif', background: '#FAFAFA' }}>
        <div style={{ textAlign: 'center', color: '#9CA3AF' }}>
          <p>Loading store...</p>
        </div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, -apple-system, sans-serif', background: '#FAFAFA' }}>
        <div style={{ textAlign: 'center', color: '#991B1B', background: '#FEE2E2', padding: 24, borderRadius: 12 }}>
          <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Store Not Found</p>
          <p style={{ fontSize: 14 }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA', fontFamily: 'Inter, -apple-system, sans-serif', color: '#282C3F' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #F0F0F0', padding: '24px 0', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>{business.name}</h1>
            <p style={{ fontSize: 13, color: '#9CA3AF', textTransform: 'capitalize' }}>{business.type}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <button
              onClick={() => setShowCheckout(true)}
              disabled={cart.length === 0}
              style={{
                padding: '12px 24px',
                background: cart.length > 0 ? '#FC8019' : '#D1D5DB',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontWeight: 700,
                cursor: cart.length > 0 ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
                position: 'relative',
              }}
            >
              🛒 Cart ({cart.length})
              {cart.length > 0 && (
                <span style={{ marginLeft: 8, fontWeight: 800 }}>₹{cartTotal.toLocaleString()}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {orderSuccess && (
        <div style={{ background: '#DCFCE7', color: '#166534', padding: 16, textAlign: 'center', fontWeight: 700 }}>
          ✅ Order placed successfully! We'll prepare it soon.
        </div>
      )}

      {/* Items */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        {categories.length > 0 ? (
          categories.map(category => {
            const categoryItems = items.filter(i => i.category_name === category);
            return (
              <div key={category} style={{ marginBottom: 40 }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16, color: '#282C3F' }}>{category}</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
                  {categoryItems.map(item => (
                    <div
                      key={item.id}
                      style={{
                        background: '#fff',
                        borderRadius: 12,
                        overflow: 'hidden',
                        border: '1.5px solid #F0F0F0',
                        transition: 'all .2s',
                        opacity: item.available ? 1 : 0.5,
                      }}
                      onMouseEnter={e => {
                        if (item.available) {
                          (e.currentTarget as HTMLDivElement).style.borderColor = '#FC8019';
                          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(252,128,25,.15)';
                        }
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = '#F0F0F0';
                        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                      }}
                    >
                      {/* Item Image Placeholder */}
                      <div style={{ background: '#F0F0F0', height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>
                        🍽️
                      </div>

                      {/* Item Info */}
                      <div style={{ padding: 16 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: '#282C3F' }}>{item.name}</div>
                        <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 12 }}>
                          {item.available ? 'Available' : 'Out of Stock'}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: 16, fontWeight: 800, color: '#FC8019' }}>₹{Number(item.price).toLocaleString()}</div>
                          <button
                            onClick={() => addToCart(item)}
                            disabled={!item.available}
                            style={{
                              padding: '8px 16px',
                              background: item.available ? '#FC8019' : '#D1D5DB',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 6,
                              fontWeight: 700,
                              cursor: item.available ? 'pointer' : 'not-allowed',
                              fontFamily: 'inherit',
                              fontSize: 12,
                            }}
                          >
                            {item.available ? 'Add' : 'Out'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: '#9CA3AF' }}>
            <p style={{ fontSize: 16, marginBottom: 8 }}>No items available yet</p>
            <p style={{ fontSize: 13 }}>Check back soon!</p>
          </div>
        )}
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'flex-end', zIndex: 1000 }}>
          <div style={{ width: '100%', maxWidth: 500, background: '#fff', borderRadius: '16px 16px 0 0', padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>Your Order</h2>
              <button
                onClick={() => setShowCheckout(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9CA3AF' }}
              >
                ✕
              </button>
            </div>

            {/* Cart Items */}
            <div style={{ background: '#F9F9F9', borderRadius: 8, padding: 16, marginBottom: 20 }}>
              {cart.map(item => (
                <div key={item.item_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #E9E9EB' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#282C3F' }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>₹{Number(item.price).toLocaleString()}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={() => updateQuantity(item.item_id, item.quantity - 1)}
                      style={{ width: 28, height: 28, background: '#E9E9EB', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 700 }}
                    >
                      −
                    </button>
                    <div style={{ width: 30, textAlign: 'center', fontWeight: 700 }}>{item.quantity}</div>
                    <button
                      onClick={() => updateQuantity(item.item_id, item.quantity + 1)}
                      style={{ width: 28, height: 28, background: '#FC8019', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 700 }}
                    >
                      +
                    </button>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#282C3F', minWidth: 60, textAlign: 'right' }}>
                    ₹{(item.price * item.quantity).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div style={{ background: '#FFF3E8', padding: 16, borderRadius: 8, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, color: '#FC8019' }}>
                <span>Total</span>
                <span>₹{cartTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Checkout Form */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#686B78' }}>Your Name *</label>
              <input
                type="text"
                value={checkoutForm.customer_name}
                onChange={e => setCheckoutForm({ ...checkoutForm, customer_name: e.target.value })}
                placeholder="Enter your name"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: 14,
                  border: '1.5px solid #E9E9EB',
                  borderRadius: 6,
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  marginBottom: 12,
                }}
              />

              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#686B78' }}>Phone Number *</label>
              <input
                type="tel"
                value={checkoutForm.customer_phone}
                onChange={e => setCheckoutForm({ ...checkoutForm, customer_phone: e.target.value })}
                placeholder="10-digit phone number"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: 14,
                  border: '1.5px solid #E9E9EB',
                  borderRadius: 6,
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  marginBottom: 12,
                }}
              />

              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#686B78' }}>Special Requests (optional)</label>
              <textarea
                value={checkoutForm.notes}
                onChange={e => setCheckoutForm({ ...checkoutForm, notes: e.target.value })}
                placeholder="e.g., Extra spicy, no onions..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: 14,
                  border: '1.5px solid #E9E9EB',
                  borderRadius: 6,
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  minHeight: 80,
                  resize: 'none',
                }}
              />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowCheckout(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#fff',
                  border: '1.5px solid #E9E9EB',
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Continue Shopping
              </button>
              <button
                onClick={handleSubmitOrder}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#FC8019',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? 'Placing Order...' : 'Place Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
