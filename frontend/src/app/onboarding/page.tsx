'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { setSession, getUser, getToken } from '@/lib/auth';

const TYPES = [
  { value: 'restaurant', label: '🍽️ Restaurant', desc: 'Dine-in, takeaway, billing' },
  { value: 'retail',     label: '🛍️ Retail',     desc: 'Physical store, POS' },
  { value: 'ecommerce',  label: '📦 D2C / Ecommerce', desc: 'Online orders' },
  { value: 'service',    label: '🔧 Service',    desc: 'Consultations, repairs' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type) return setError('Select a business type');
    try {
      const { data } = await api.post('/businesses', { name, type });
      const token = localStorage.getItem('token')!;
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setSession(token, user, data);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create business');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: 480 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Set up your business</h1>
        <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 24 }}>This takes 30 seconds.</p>

        <form onSubmit={submit}>
          <div className="form-group">
            <label>Business Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Chai Corner" required />
          </div>

          <div className="form-group">
            <label>Business Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 6 }}>
              {TYPES.map(t => (
                <div
                  key={t.value}
                  onClick={() => setType(t.value)}
                  style={{
                    border: `2px solid ${type === t.value ? '#4f46e5' : '#e5e7eb'}`,
                    borderRadius: 8, padding: 12, cursor: 'pointer',
                    background: type === t.value ? '#eef2ff' : '#fff',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{t.label}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{t.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="error">{error}</p>}
          <button className="btn-primary" style={{ width: '100%', marginTop: 8 }}>Launch my Commerce OS</button>
        </form>
      </div>
    </div>
  );
}
