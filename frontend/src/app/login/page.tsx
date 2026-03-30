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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/signup';
      const { data } = await api.post(endpoint, form);
      setSession(data.token, data.user);

      // check if user has a business
      const { data: businesses } = await api.get('/businesses');
      if (businesses.length) {
        setSession(data.token, data.user, businesses[0]);
        router.push('/dashboard');
      } else {
        router.push('/onboarding');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: 360 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Commerce OS</h1>
        <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>
          {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
        </p>

        <form onSubmit={submit}>
          {mode === 'signup' && (
            <div className="form-group">
              <label>Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
          )}
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
          </div>
          {error && <p className="error">{error}</p>}
          <button className="btn-primary" style={{ width: '100%', marginTop: 8 }}>
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#6b7280' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <span
            style={{ color: '#4f46e5', cursor: 'pointer', fontWeight: 600 }}
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </span>
        </p>
      </div>
    </div>
  );
}
