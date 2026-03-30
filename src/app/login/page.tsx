'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { setSession } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post(mode === 'login' ? '/auth/login' : '/auth/signup', form);
      setSession(data.token, data.user);
      const { data: businesses } = await api.get('/businesses');
      if (businesses.length) {
        setSession(data.token, data.user, businesses[0]);
        router.push('/dashboard');
      } else {
        router.push('/onboarding');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left panel */}
      <div className="auth-left">
        <h1>Your Commerce OS,<br />Supercharged.</h1>
        <p>Manage orders, billing, and customer feedback — all in one place. Built for restaurants, retail, and beyond.</p>
        <div className="features">
          {[
            { icon: '🧾', text: 'Fast POS billing for any business type' },
            { icon: '📦', text: 'Universal catalog for products & services' },
            { icon: '⭐', text: 'Built-in feedback intelligence' },
            { icon: '🌐', text: 'Public ordering page, zero setup' },
          ].map(f => (
            <div key={f.text} className="feature">
              <div className="feature-icon">{f.icon}</div>
              {f.text}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="auth-right">
        <div className="auth-card">
          <h2>{mode === 'login' ? 'Welcome back 👋' : 'Get started free'}</h2>
          <p>{mode === 'login' ? 'Sign in to your Commerce OS' : 'Create your account in seconds'}</p>

          <form onSubmit={submit}>
            {mode === 'signup' && (
              <div className="form-group">
                <label>Full Name</label>
                <input
                  placeholder="Your name"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
            )}
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            {error && <p className="error">{error}</p>}
            <button
              className="btn-primary"
              style={{ width: '100%', marginTop: 8, padding: '13px', fontSize: 15 }}
              disabled={loading}
            >
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#686B78' }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <span
              style={{ color: '#FC8019', cursor: 'pointer', fontWeight: 700 }}
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
