'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { setSession } from '@/lib/auth';
import { Suspense } from 'react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';
  const [mode, setMode] = useState<'login' | 'signup'>(defaultMode);
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
      const msg = err.response?.data?.error;
      if (!err.response) {
        setError('Backend not connected. Please set up the server first.');
      } else {
        setError(msg || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      {/* Left */}
      <div style={{ flex: 1, background: 'linear-gradient(135deg, #FC8019 0%, #FF6B35 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px', color: '#fff' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48, textDecoration: 'none', color: '#fff' }}>
          <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,.25)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🍽️</div>
          <span style={{ fontWeight: 800, fontSize: 18 }}>Commerce OS</span>
        </a>
        <h1 style={{ fontSize: 40, fontWeight: 900, lineHeight: 1.1, letterSpacing: '-1px', marginBottom: 16 }}>
          Your Commerce OS,<br />Supercharged.
        </h1>
        <p style={{ fontSize: 16, opacity: .85, lineHeight: 1.6, marginBottom: 40 }}>
          Manage orders, billing, and customer feedback — all in one place.
        </p>
        {[
          { icon: '🧾', text: 'Fast POS billing for any business type' },
          { icon: '📦', text: 'Universal catalog for products & services' },
          { icon: '⭐', text: 'Built-in feedback intelligence' },
          { icon: '🌐', text: 'Public ordering page, zero setup' },
        ].map(f => (
          <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, fontSize: 14, fontWeight: 500 }}>
            <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{f.icon}</div>
            {f.text}
          </div>
        ))}
      </div>

      {/* Right */}
      <div style={{ width: 460, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, background: '#fff' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6, color: '#282C3F' }}>
            {mode === 'login' ? 'Welcome back 👋' : 'Get started free'}
          </h2>
          <p style={{ color: '#686B78', fontSize: 14, marginBottom: 28 }}>
            {mode === 'login' ? 'Sign in to your Commerce OS' : 'Create your account in seconds'}
          </p>

          <form onSubmit={submit}>
            {mode === 'signup' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#686B78', textTransform: 'uppercase', letterSpacing: '.5px' }}>Full Name</label>
                <input placeholder="Your name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E9E9EB', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#686B78', textTransform: 'uppercase', letterSpacing: '.5px' }}>Email</label>
              <input type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E9E9EB', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#686B78', textTransform: 'uppercase', letterSpacing: '.5px' }}>Password</label>
              <input type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E9E9EB', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            {error && (
              <div style={{ background: '#FFF3E8', border: '1px solid #FC8019', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#E65100' }}>
                ⚠️ {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '13px', fontSize: 15, fontWeight: 700, background: loading ? '#FFB366' : '#FC8019', color: '#fff', border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#686B78' }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <span style={{ color: '#FC8019', cursor: 'pointer', fontWeight: 700 }}
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}>
              {mode === 'login' ? 'Sign up free' : 'Sign in'}
            </span>
          </p>

          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#9CA3AF' }}>
            <a href="/" style={{ color: '#9CA3AF' }}>← Back to home</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
