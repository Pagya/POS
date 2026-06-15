'use client';
import { useEffect, useState, useRef } from 'react';
import api from '@/lib/api';
import VariantSelector from '@/components/VariantSelector';

interface CartItem {
  item_id: string;
  name: string;
  price: number;
  quantity: number;
  variant_label?: string;
  variant_option_ids?: string[];
}

interface ItemImage {
  id: string;
  item_id: string;
  url: string;
  display_order: number;
  is_primary: boolean;
}

interface VariantOption {
  id: string;
  group_id: string;
  label: string;
  price_modifier: number | null;
  absolute_price: number | null;
  display_order: number;
}

interface VariantGroup {
  id: string;
  item_id: string;
  name: string;
  is_required: boolean;
  options: VariantOption[];
}

interface StoreItem {
  id: string;
  name: string;
  price: number;
  type: string;
  available: boolean;
  category: string;
  primary_image_url: string | null;
  variant_groups: VariantGroup[];
  images: ItemImage[];
}

const CART_KEY = (slug: string) => `cart_${slug}`;
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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

  // Item detail modal state (for items without variants or just for gallery)
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  // Whether VariantSelector sub-modal is open (from detail view)
  const [showVariantSelector, setShowVariantSelector] = useState(false);
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

  const addToCart = (item: StoreItem, resolvedPrice?: number, variantLabel?: string, variantOptionIds?: string[]) => {
    const price = resolvedPrice ?? Number(item.price);

    setCart(prev => {
      const ex = prev.find(c => {
        if (variantOptionIds) {
          return c.item_id === item.id && c.variant_option_ids?.sort().join(',') === variantOptionIds.sort().join(',');
        }
        return c.item_id === item.id && !c.variant_option_ids;
      });
      if (ex) {
        return prev.map(c => c === ex ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, {
        item_id: item.id,
        name: item.name,
        price,
        quantity: 1,
        variant_label: variantLabel,
        variant_option_ids: variantOptionIds,
      }];
    });
  };

  const handleItemClick = (item: StoreItem) => {
    if (!item.available) return;
    if (item.variant_groups && item.variant_groups.length > 0) {
      // Has variants — open detail view with gallery + VariantSelector
      setSelectedItem(item);
      setGalleryIndex(0);
      setShowVariantSelector(false);
    } else if (item.images && item.images.length > 0) {
      // Has images but no variants — show detail for gallery + simple add to cart
      setSelectedItem(item);
      setGalleryIndex(0);
    } else {
      // No variants, no images — add directly
      addToCart(item);
    }
  };

  const handleVariantConfirm = (
    selections: { groupId: string; optionId: string; label: string; groupName: string }[],
    resolvedPrice: number
  ) => {
    if (!selectedItem) return;
    const variantLabel = selections.map(s => `${s.groupName}: ${s.label}`).join(', ');
    const variantOptionIds = selections.map(s => s.optionId);
    addToCart(selectedItem, resolvedPrice, variantLabel, variantOptionIds);
    setShowVariantSelector(false);
    setSelectedItem(null);
  };

  const handleDetailAddToCart = () => {
    if (!selectedItem) return;
    addToCart(selectedItem);
    setSelectedItem(null);
  };

  const updateQty = (index: number, delta: number) => {
    setCart(prev =>
      prev.map((c, i) => i === index ? { ...c, quantity: c.quantity + delta } : c)
          .filter(c => c.quantity > 0)
    );
  };

  const getItemCartCount = (item: StoreItem) => {
    return cart.filter(c => c.item_id === item.id).reduce((sum, c) => sum + c.quantity, 0);
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
        items: cart.map(c => ({
          item_id: c.item_id,
          quantity: c.quantity,
          variant_option_ids: c.variant_option_ids,
          variant_label: c.variant_label,
        })),
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

  const getImageSrc = (url: string | null | undefined): string => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${API_BASE}${url}`;
  };

  const grouped: Record<string, StoreItem[]> = {};
  store?.items?.forEach((item: StoreItem) => {
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
            Rate your experience ⭐
          </button>
        )}
        <button onClick={() => { setOrderConfirmed(false); }} className="btn-ghost" style={{ width: '100%', padding: '12px' }}>
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
        <div className="public-hero">
          <h1>{store.business.name}</h1>
          <p>Order online · Fast and easy</p>
          <div className="hero-badge">
            {store.business.type === 'restaurant' ? '🍽️ Restaurant' :
             store.business.type === 'retail' ? '🛍️ Retail Store' :
             store.business.type === 'ecommerce' ? '📦 Online Store' : '🔧 Service'}
          </div>
          {cartCount > 0 && (
            <div style={{ marginTop: 12, fontSize: 13, background: 'rgba(255,255,255,.2)', display: 'inline-block', padding: '4px 14px', borderRadius: 99 }}>
              🛒 {cartCount} items in cart
            </div>
          )}
        </div>

        {categoryNames.length > 1 && (
          <div className="public-nav">
            {categoryNames.map(cat => (
              <a key={cat} className={activeCategory === cat ? 'active' : ''} onClick={() => { setActiveCategory(cat); categoryRefs.current[cat]?.scrollIntoView({ behavior: 'smooth' }); }} style={{ cursor: 'pointer' }}>
                {cat}
              </a>
            ))}
          </div>
        )}

        <div className="public-content">
          {categoryNames.map(cat => (
            <div key={cat} className="category-section" ref={el => { categoryRefs.current[cat] = el; }}>
              <h2>{cat}</h2>
              {grouped[cat].map(item => {
                const itemCount = getItemCartCount(item);
                return (
                  <div key={item.id} className="public-item" style={{ cursor: item.available ? 'pointer' : 'default' }} onClick={() => handleItemClick(item)}>
                    <div className="info" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {/* Task 11.1: Primary image thumbnail */}
                      <div style={{
                        width: 60,
                        height: 60,
                        borderRadius: 8,
                        overflow: 'hidden',
                        flexShrink: 0,
                        background: '#f0f0f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {item.primary_image_url ? (
                          <img
                            src={getImageSrc(item.primary_image_url)}
                            alt={item.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <span style={{ fontSize: 24, color: '#ccc' }}>🍽️</span>
                        )}
                      </div>
                      <div>
                        <div className="name">{item.name}</div>
                        <div className="price">₹{Number(item.price).toLocaleString()}</div>
                        {item.variant_groups && item.variant_groups.length > 0 && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Customisable</div>
                        )}
                      </div>
                    </div>
                    <div onClick={e => e.stopPropagation()}>
                      {itemCount > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1.5px solid var(--orange)', borderRadius: 8, padding: '4px 8px', background: '#fff' }}>
                            <button className="qty-btn" style={{ border: 'none', background: 'transparent', color: 'var(--orange)' }} onClick={(e) => { e.stopPropagation(); updateQty(cart.findIndex(c => c.item_id === item.id), -1); }}>−</button>
                            <span style={{ fontWeight: 700, minWidth: 16, textAlign: 'center', color: 'var(--orange)' }}>{itemCount}</span>
                            <button className="qty-btn" style={{ border: 'none', background: 'transparent', color: 'var(--orange)' }} onClick={(e) => { e.stopPropagation(); handleItemClick(item); }}>+</button>
                          </div>
                        </div>
                      ) : (
                        <button className="add-btn" onClick={(e) => { e.stopPropagation(); handleItemClick(item); }} disabled={!item.available}>
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
        <button className="cart-fab" onClick={() => setShowCheckout(true)}>
          <div className="fab-left">
            <span className="fab-count">{cartCount}</span>
            <span>View Cart</span>
          </div>
          <span>₹{cartTotal.toLocaleString()} →</span>
        </button>
      )}

      {/* Task 11.2: Item Detail Modal with Image Gallery and Inline Variant Selection */}
      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
            {/* Close button */}
            <button
              onClick={() => setSelectedItem(null)}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.5)',
                color: '#fff',
                border: 'none',
                fontSize: 16,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
              }}
            >
              ✕
            </button>

            {/* Image Gallery */}
            {selectedItem.images && selectedItem.images.length > 0 ? (
              <div style={{ background: '#f8f8f8' }}>
                <div style={{ width: '100%', height: 220, overflow: 'hidden' }}>
                  <img
                    src={getImageSrc(selectedItem.images[galleryIndex]?.url)}
                    alt={selectedItem.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                {selectedItem.images.length > 1 && (
                  <div style={{ display: 'flex', gap: 6, padding: '8px 16px', overflowX: 'auto', background: '#fff' }}>
                    {selectedItem.images.map((img, idx) => (
                      <div
                        key={img.id}
                        onClick={() => setGalleryIndex(idx)}
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 6,
                          overflow: 'hidden',
                          border: idx === galleryIndex ? '2px solid var(--orange)' : '2px solid transparent',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        <img
                          src={getImageSrc(img.url)}
                          alt={`${selectedItem.name} ${idx + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ width: '100%', height: 140, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 48, color: '#ddd' }}>🍽️</span>
              </div>
            )}

            {/* Item Info */}
            <div style={{ padding: '16px 20px 8px' }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{selectedItem.name}</h2>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginTop: 4 }}>₹{Number(selectedItem.price).toLocaleString()}</p>
            </div>

            {/* Inline Variant Selection or simple Add to Cart */}
            {selectedItem.variant_groups && selectedItem.variant_groups.length > 0 ? (
              <div style={{ padding: '12px 20px 20px' }}>
                <button
                  className="btn-primary"
                  style={{ width: '100%', padding: '14px', fontSize: 15, borderRadius: 12 }}
                  onClick={() => setShowVariantSelector(true)}
                >
                  Customise & Add to Cart
                </button>
              </div>
            ) : (
              <div style={{ padding: '12px 20px 20px' }}>
                <button
                  className="btn-primary"
                  style={{ width: '100%', padding: '14px', fontSize: 15, borderRadius: 12 }}
                  onClick={handleDetailAddToCart}
                >
                  Add to Cart — ₹{Number(selectedItem.price).toLocaleString()}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VariantSelector sub-modal (opens on top of detail modal) */}
      {showVariantSelector && selectedItem && selectedItem.variant_groups && selectedItem.variant_groups.length > 0 && (
        <VariantSelector
          item={{ id: selectedItem.id, name: selectedItem.name, price: Number(selectedItem.price) }}
          variantGroups={selectedItem.variant_groups}
          onConfirm={handleVariantConfirm}
          onClose={() => setShowVariantSelector(false)}
        />
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="modal-overlay" onClick={() => setShowCheckout(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2>Your Cart</h2>
            {cart.map((c, idx) => (
              <div key={`${c.item_id}_${c.variant_option_ids?.join(',') || 'base'}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f5f5f5', fontSize: 14 }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600 }}>{c.name}</span>
                  {/* Task 11.2: Show variant_label beneath item name in cart */}
                  {c.variant_label && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{c.variant_label}</div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button className="qty-btn" onClick={() => updateQty(idx, -1)}>−</button>
                  <span style={{ fontWeight: 700 }}>{c.quantity}</span>
                  <button className="qty-btn" onClick={() => updateQty(idx, 1)}>+</button>
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
