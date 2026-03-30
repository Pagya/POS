'use client';
import { useRouter } from 'next/navigation';

const FEATURES = [
  { icon: '🧾', title: 'Fast POS Billing', desc: 'Create orders in seconds. Supports cash & UPI, discounts, and instant bill generation.' },
  { icon: '📦', title: 'Universal Catalog', desc: 'Manage products or services with categories. Works for food, retail, and everything in between.' },
  { icon: '📋', title: 'Order Management', desc: 'Track every order from new to completed. Real-time status updates across POS and online.' },
  { icon: '🌐', title: 'Public Ordering Page', desc: 'Get a unique URL your customers can order from. No app needed, works on any device.' },
  { icon: '⭐', title: 'Feedback Intelligence', desc: 'Collect ratings after every order. See your average score and recent customer comments.' },
  { icon: '📊', title: 'Live Dashboard', desc: "Today's orders, revenue, and ratings at a glance. Always know how your business is doing." },
];

const BUSINESS_TYPES = [
  { emoji: '🍽️', label: 'Restaurants', desc: 'Dine-in, takeaway, table billing' },
  { emoji: '🛍️', label: 'Retail Stores', desc: 'POS, catalog, walk-in orders' },
  { emoji: '📦', label: 'D2C Brands', desc: 'Online orders, public store page' },
  { emoji: '🔧', label: 'Service Businesses', desc: 'Consultations, bookings, billing' },
];

export default function LandingPage() {
  const router = useRouter();

  return (
    <div style={{ background: '#fff', minHeight: '100vh', fontFamily: 'Inter, -apple-system, sans-serif', color: '#282C3F' }}>

      {/* Nav */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 48px', borderBottom: '1px solid #f0f0f0', position: 'sticky', top: 0, background: '#fff', zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: '#FC8019', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🍽️</div>
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-.3px' }}>Commerce OS</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => router.push('/login')} style={{ background: 'transparent', border: '1.5px solid #FC8019', color: '#FC8019', borderRadius: 8, padding: '8px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
            Sign In
          </button>
          <button onClick={() => router.push('/login')} style={{ background: '#FC8019', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
            Get Started Free
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ background: 'linear-gradient(135deg, #FC8019 0%, #FF6B35 100%)', padding: '80px 48px', textAlign: 'center', color: '#fff' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,.2)', borderRadius: 99, padding: '6px 18px', fontSize: 13, fontWeight: 600, marginBottom: 20, backdropFilter: 'blur(4px)' }}>
            🚀 Built for Indian businesses
          </div>
          <h1 style={{ fontSize: 52, fontWeight: 900, lineHeight: 1.1, letterSpacing: '-1.5px', marginBottom: 20 }}>
            Your Commerce OS,<br />Supercharged.
          </h1>
          <p style={{ fontSize: 18, opacity: .88, lineHeight: 1.6, marginBottom: 36, maxWidth: 560, margin: '0 auto 36px' }}>
            POS billing, order management, and customer feedback — all in one place. Works for restaurants, retail, D2C, and service businesses.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => router.push('/login')} style={{ background: '#fff', color: '#FC8019', border: 'none', borderRadius: 10, padding: '14px 32px', fontWeight: 800, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(0,0,0,.15)' }}>
              Start for Free →
            </button>
            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} style={{ background: 'rgba(255,255,255,.15)', color: '#fff', border: '1.5px solid rgba(255,255,255,.4)', borderRadius: 10, padding: '14px 32px', fontWeight: 700, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit', backdropFilter: 'blur(4px)' }}>
              See Features
            </button>
          </div>
        </div>
      </section>

      {/* Business types */}
      <section style={{ padding: '64px 48px', background: '#FAFAFA' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <p style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#FC8019', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Works for every business</p>
          <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 900, letterSpacing: '-.5px', marginBottom: 40 }}>One platform, every business type</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {BUSINESS_TYPES.map(b => (
              <div key={b.label} style={{ background: '#fff', borderRadius: 14, padding: '24px 20px', textAlign: 'center', border: '1.5px solid #F0F0F0', transition: 'border-color .15s' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>{b.emoji}</div>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>{b.label}</div>
                <div style={{ fontSize: 13, color: '#686B78', lineHeight: 1.5 }}>{b.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: '64px 48px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <p style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#FC8019', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Everything you need</p>
          <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 900, letterSpacing: '-.5px', marginBottom: 40 }}>Features built for speed</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{ background: '#fff', borderRadius: 14, padding: '28px 24px', border: '1.5px solid #F0F0F0', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ width: 48, height: 48, background: '#FFF3E8', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{f.icon}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>{f.title}</div>
                  <div style={{ fontSize: 13, color: '#686B78', lineHeight: 1.6 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'linear-gradient(135deg, #FC8019 0%, #FF6B35 100%)', padding: '72px 48px', textAlign: 'center', color: '#fff' }}>
        <h2 style={{ fontSize: 38, fontWeight: 900, letterSpacing: '-.5px', marginBottom: 14 }}>Ready to get started?</h2>
        <p style={{ fontSize: 16, opacity: .88, marginBottom: 32 }}>Set up your business in under 60 seconds. No credit card needed.</p>
        <button onClick={() => router.push('/login')} style={{ background: '#fff', color: '#FC8019', border: 'none', borderRadius: 10, padding: '16px 40px', fontWeight: 800, fontSize: 17, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(0,0,0,.15)' }}>
          Create Free Account →
        </button>
      </section>

      {/* Footer */}
      <footer style={{ padding: '24px 48px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: '#9ca3af' }}>
        <span>© 2025 Commerce OS</span>
        <span>Built with ❤️ for Indian businesses</span>
      </footer>
    </div>
  );
}
