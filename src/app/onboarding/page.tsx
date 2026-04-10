'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { setSession } from '@/lib/auth';

const TYPES = [
  { value: 'restaurant', emoji: '🍽️', label: 'Restaurant', desc: 'Dine-in, takeaway' },
  { value: 'retail',     emoji: '🛍️', label: 'Retail',     desc: 'Physical store, POS' },
  { value: 'ecommerce',  emoji: '📦', label: 'D2C / Online', desc: 'Online orders' },
  { value: 'service',    emoji: '🔧', label: 'Service',    desc: 'Consultations, repairs' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type) return setError('Please select a business type');
    setLoading(true);
    try {
      const { data } = await api.post('/businesses', { name, type });
      const token = localStorage.getItem('token')!;
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setSession(token, user, data);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create business');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card" style={{ width: '100%', maxWidth: 520, padding: 36 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🍽️</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-.5px' }}>Set up your business</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 6 }}>Takes less than a minute. No credit card needed.</p>
        </div>

        <form onSubmit={submit}>
          <div className="form-group">
            <label>Business Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Chai Corner, The Spice Route..."
              required
              style={{ fontSize: 16, padding: '12px 16px' }}
            />
          </div>

          <div className="form-group">
            <label>Business Type</label>
            <div className="type-grid">
              {TYPES.map(t => (
                <div
                  key={t.value}
                  className={`type-card ${type === t.value ? 'selected' : ''}`}
                  onClick={() => setType(t.value)}
                >
                  <div className="type-emoji">{t.emoji}</div>
                  <div className="type-label">{t.label}</div>
                  <div className="type-desc">{t.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="error">{error}</p>}

          <button
            className="btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: 15, marginTop: 8 }}
            disabled={loading}
          >
            {loading ? 'Setting up...' : '🚀 Launch my Commerce OS'}
          </button>
        </form>
      </div>
    </div>
  );
}
