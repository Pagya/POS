'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { setSession, getUser } from '@/lib/auth';

const BUSINESS_TYPES = [
  { value: 'restaurant', label: 'Restaurant', icon: '🍽️', desc: 'Dine-in, takeaway, table billing' },
  { value: 'retail', label: 'Retail Store', icon: '🛍️', desc: 'POS, catalog, walk-in orders' },
  { value: 'ecommerce', label: 'D2C Brand', icon: '📦', desc: 'Online orders, public store' },
  { value: 'service', label: 'Service Business', icon: '🔧', desc: 'Consultations, bookings' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const user = typeof window !== 'undefined' ? getUser() : null;
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    businessName: '',
    businessType: '',
    initialItems: [] as Array<{ name: string; price: string; category: string }>,
  });

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, -apple-system, sans-serif' }}>
        <div style={{ textAlign: 'center', color: '#9CA3AF' }}>
          <p>Please log in first</p>
        </div>
      </div>
    );
  }

  const handleBusinessTypeSelect = (type: string) => {
    setForm({ ...form, businessType: type });
    setStep(2);
  };

  const handleBusinessNameChange = (name: string) => {
    setForm({ ...form, businessName: name });
  };

  const handleAddItem = () => {
    setForm({
      ...form,
      initialItems: [...form.initialItems, { name: '', price: '', category: '' }],
    });
  };

  const handleRemoveItem = (idx: number) => {
    setForm({
      ...form,
      initialItems: form.initialItems.filter((_, i) => i !== idx),
    });
  };

  const handleItemChange = (idx: number, field: string, value: string) => {
    const updated = [...form.initialItems];
    updated[idx] = { ...updated[idx], [field]: value };
    setForm({ ...form, initialItems: updated });
  };

  const handleComplete = async () => {
    if (!form.businessName.trim()) {
      setError('Business name is required');
      return;
    }
    if (!form.businessType) {
      setError('Business type is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create business
      const bizRes = await api.post('/api/businesses', {
        name: form.businessName,
        type: form.businessType,
      });
      const business = bizRes.data;

      // Create initial items if provided
      if (form.initialItems.length > 0) {
        for (const item of form.initialItems) {
          if (item.name.trim() && item.price) {
            await api.post(`/api/catalog/${business.id}/items`, {
              name: item.name,
              price: parseFloat(item.price),
              type: 'product',
              available: true,
              category_id: null,
            });
          }
        }
      }

      // Update session with new business
      setSession(localStorage.getItem('token')!, user, business);

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create business');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA', fontFamily: 'Inter, -apple-system, sans-serif', color: '#282C3F' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #F0F0F0', padding: '24px 48px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, background: '#FC8019', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🍽️</div>
            <span style={{ fontWeight: 800, fontSize: 16 }}>Commerce OS</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>Welcome to Commerce OS</h1>
          <p style={{ fontSize: 14, color: '#686B78' }}>Let's set up your business in 3 steps</p>
        </div>
      </div>

      {/* Progress */}
      <div style={{ background: '#fff', borderBottom: '1px solid #F0F0F0', padding: '16px 48px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', gap: 8 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ flex: 1, height: 4, background: s <= step ? '#FC8019' : '#E9E9EB', borderRadius: 2, transition: 'background .3s' }} />
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '48px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          {/* Step 1: Business Type */}
          {step === 1 && (
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>What type of business are you?</h2>
              <p style={{ fontSize: 14, color: '#686B78', marginBottom: 32 }}>Choose the option that best describes your business</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                {BUSINESS_TYPES.map(bt => (
                  <div
                    key={bt.value}
                    onClick={() => handleBusinessTypeSelect(bt.value)}
                    style={{
                      background: '#fff',
                      border: '2px solid #E9E9EB',
                      borderRadius: 12,
                      padding: 24,
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all .2s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = '#FC8019';
                      (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(252,128,25,.15)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = '#E9E9EB';
                      (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ fontSize: 40, marginBottom: 12 }}>{bt.icon}</div>
                    <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>{bt.label}</div>
                    <div style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.5 }}>{bt.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Business Name */}
          {step === 2 && (
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>What's your business name?</h2>
              <p style={{ fontSize: 14, color: '#686B78', marginBottom: 32 }}>This will appear on your public store and invoices</p>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 8, color: '#686B78' }}>Business Name *</label>
                <input
                  type="text"
                  value={form.businessName}
                  onChange={e => handleBusinessNameChange(e.target.value)}
                  placeholder="e.g., Raj's Biryani House"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: 14,
                    border: '1.5px solid #E9E9EB',
                    borderRadius: 8,
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setStep(1)}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    background: '#fff',
                    border: '1.5px solid #E9E9EB',
                    borderRadius: 8,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!form.businessName.trim()}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    background: form.businessName.trim() ? '#FC8019' : '#D1D5DB',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 700,
                    cursor: form.businessName.trim() ? 'pointer' : 'not-allowed',
                    fontFamily: 'inherit',
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Initial Items */}
          {step === 3 && (
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>Add your first items (optional)</h2>
              <p style={{ fontSize: 14, color: '#686B78', marginBottom: 24 }}>You can add items now or skip and add them later</p>

              {error && (
                <div style={{ background: '#FEE2E2', color: '#991B1B', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                  {error}
                </div>
              )}

              <div style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 24 }}>
                {form.initialItems.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#9CA3AF' }}>
                    <p style={{ marginBottom: 16 }}>No items added yet</p>
                    <button
                      onClick={handleAddItem}
                      style={{
                        padding: '10px 20px',
                        background: '#FC8019',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      + Add Item
                    </button>
                  </div>
                ) : (
                  <div>
                    {form.initialItems.map((item, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, marginBottom: 12, alignItems: 'end' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4, color: '#686B78' }}>Item Name</label>
                          <input
                            type="text"
                            value={item.name}
                            onChange={e => handleItemChange(idx, 'name', e.target.value)}
                            placeholder="e.g., Biryani"
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              fontSize: 13,
                              border: '1.5px solid #E9E9EB',
                              borderRadius: 6,
                              fontFamily: 'inherit',
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4, color: '#686B78' }}>Price (₹)</label>
                          <input
                            type="number"
                            value={item.price}
                            onChange={e => handleItemChange(idx, 'price', e.target.value)}
                            placeholder="0"
                            step="0.01"
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              fontSize: 13,
                              border: '1.5px solid #E9E9EB',
                              borderRadius: 6,
                              fontFamily: 'inherit',
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4, color: '#686B78' }}>Category</label>
                          <input
                            type="text"
                            value={item.category}
                            onChange={e => handleItemChange(idx, 'category', e.target.value)}
                            placeholder="e.g., Mains"
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              fontSize: 13,
                              border: '1.5px solid #E9E9EB',
                              borderRadius: 6,
                              fontFamily: 'inherit',
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>
                        <button
                          onClick={() => handleRemoveItem(idx)}
                          style={{
                            padding: '8px 12px',
                            background: '#FEE2E2',
                            color: '#991B1B',
                            border: 'none',
                            borderRadius: 6,
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            fontSize: 12,
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={handleAddItem}
                      style={{
                        marginTop: 12,
                        padding: '10px 20px',
                        background: '#fff',
                        color: '#FC8019',
                        border: '1.5px solid #FC8019',
                        borderRadius: 8,
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      + Add Another Item
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setStep(2)}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    background: '#fff',
                    border: '1.5px solid #E9E9EB',
                    borderRadius: 8,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    background: '#FC8019',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? 'Setting up...' : 'Complete Setup'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
