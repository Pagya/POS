'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { DEMO_MODE } from '@/lib/demo';

const NAV_PRODUCTS = [
  { href: '/products/pos', label: 'POS Billing', icon: '🧾' },
  { href: '/products/orders', label: 'Order Management', icon: '📋' },
  { href: '/products/catalog', label: 'Catalog', icon: '📦' },
  { href: '/products/feedback', label: 'Feedback Intelligence', icon: '⭐' },
  { href: '/products/store', label: 'Online Store', icon: '🌐' },
  { href: '/products/analytics', label: 'Analytics', icon: '📊' },
];

const BUSINESS_TYPES = [
  { emoji: '🍽️', label: 'Restaurants', desc: 'Dine-in, takeaway, table billing', href: '/products/pos' },
  { emoji: '🛍️', label: 'Retail Stores', desc: 'POS, catalog, walk-in orders', href: '/products/pos' },
  { emoji: '📦', label: 'D2C Brands', desc: 'Online orders, public store page', href: '/products/store' },
  { emoji: '🔧', label: 'Service Businesses', desc: 'Consultations, bookings, billing', href: '/products/orders' },
];

const FEATURES = [
  { icon: '🧾', title: 'Fast POS Billing', desc: 'Create orders in seconds. Supports cash & UPI, discounts, and instant bill generation.', href: '/products/pos' },
  { icon: '📦', title: 'Universal Catalog', desc: 'Manage products or services with categories. Works for food, retail, and everything in between.', href: '/products/catalog' },
  { icon: '📋', title: 'Order Management', desc: 'Track every order from new to completed. Real-time status updates across POS and online.', href: '/products/orders' },
  { icon: '🌐', title: 'Public Ordering Page', desc: 'Get a unique URL your customers can order from. No app needed, works on any device.', href: '/products/store' },
  { icon: '⭐', title: 'Feedback Intelligence', desc: 'Collect ratings after every order. See your average score and recent customer comments.', href: '/products/feedback' },
  { icon: '📊', title: 'Live Analytics', desc: "Revenue, orders, and top items at a glance. Always know how your business is doing.", href: '/products/analytics' },
];

export default function LandingPage() {
  const router = useRouter();
  const ctaTarget = DEMO_MODE ? '/dashboard' : '/login?mode=signup';
  const signInTarget = DEMO_MODE ? '/dashboard' : '/login';
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={{ background: '#fff', minHeight: '100vh', fontFamily: 'Inter, -apple-system, sans-serif', color: '#282C3F' }}>

      {/* ── NAV ── */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 48px', borderBottom: '1px solid #F0F0F0', position: 'sticky', top: 0, background: '#fff', zIndex: 100, height: 64 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#282C3F' }}>
            <div style={{ width: 34, height: 34, background: '#FC8019', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>🍽️</div>
            <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-.3px' }}>Commerce OS</span>
          </Link>

          {/* Products dropdown */}
          <div style={{ position: 'relative' }} onMouseEnter={() => setMenuOpen(true)} onMouseLeave={() => setMenuOpen(false)}>
            <button style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: '#282C3F', cursor: 'pointer', padding: '8px 4px', display: 'flex', alignItems: 'center', gap: 4 }}>
              Products <span style={{ fontSize: 10 }}>▾</span>
            </button>
            {menuOpen && (
              <div style={{ position: 'absolute', top: '100%', left: -16, background: '#fff', border: '1px solid #F0F0F0', borderRadius: 12, padding: 8, minWidth: 220, boxShadow: '0 8px 32px rgba(0,0,0,.12)', zIndex: 200 }}>
                {NAV_PRODUCTS.map(p => (
                  <Link key={p.href} href={p.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, textDecoration: 'none', color: '#282C3F', fontSize: 14, fontWeight: 500, transition: 'background .1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#FFF3E8')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <span style={{ fontSize: 18 }}>{p.icon}</span>{p.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link href="/#features" style={{ fontSize: 14, fontWeight: 600, color: '#686B78', textDecoration: 'none' }}>Features</Link>
          <Link href="/#pricing" style={{ fontSize: 14, fontWeight: 600, color: '#686B78', textDecoration: 'none' }}>Pricing</Link>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={() => router.push(signInTarget)} style={{ background: 'transparent', border: '1.5px solid #E9E9EB', color: '#282C3F', borderRadius: 8, padding: '8px 18px', fontWeight: 600, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
            Sign In
          </button>
          <button onClick={() => router.push(ctaTarget)} style={{ background: '#FC8019', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 18px', fontWeight: 700, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
            Get Started Free
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ background: 'linear-gradient(135deg, #FC8019 0%, #FF6B35 100%)', padding: '96px 48px', textAlign: 'center', color: '#fff' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,.2)', borderRadius: 99, padding: '6px 18px', fontSize: 13, fontWeight: 600, marginBottom: 24 }}>
            🚀 Built for Indian businesses
          </div>
          <h1 style={{ fontSize: 56, fontWeight: 900, lineHeight: 1.05, letterSpacing: '-2px', marginBottom: 20 }}>
            The Commerce OS for<br />Modern Businesses
          </h1>
          <p style={{ fontSize: 18, opacity: .9, lineHeight: 1.7, marginBottom: 40, maxWidth: 560, margin: '0 auto 40px' }}>
            POS billing, order management, customer feedback, and online store — all in one platform. Built for restaurants, retail, D2C, and service businesses.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => router.push(ctaTarget)} style={{ background: '#fff', color: '#FC8019', border: 'none', borderRadius: 10, padding: '15px 36px', fontWeight: 800, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(0,0,0,.15)' }}>
              Start for Free →
            </button>
            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} style={{ background: 'rgba(255,255,255,.15)', color: '#fff', border: '1.5px solid rgba(255,255,255,.4)', borderRadius: 10, padding: '15px 36px', fontWeight: 700, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit' }}>
              Explore Features
            </button>
          </div>
        </div>
      </section>

      {/* ── BUSINESS TYPES ── */}
      <section style={{ padding: '72px 48px', background: '#FAFAFA' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#FC8019', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 10 }}>Works for every business</p>
          <h2 style={{ textAlign: 'center', fontSize: 34, fontWeight: 900, letterSpacing: '-.5px', marginBottom: 48 }}>One platform, every business type</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16 }}>
            {BUSINESS_TYPES.map(b => (
              <Link key={b.label} href={b.href} style={{ textDecoration: 'none' }}>
                <div style={{ background: '#fff', borderRadius: 14, padding: '28px 22px', textAlign: 'center', border: '1.5px solid #F0F0F0', cursor: 'pointer', transition: 'border-color .15s, box-shadow .15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#FC8019'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(252,128,25,.12)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#F0F0F0'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}>
                  <div style={{ fontSize: 44, marginBottom: 14 }}>{b.emoji}</div>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6, color: '#282C3F' }}>{b.label}</div>
                  <div style={{ fontSize: 13, color: '#686B78', lineHeight: 1.5 }}>{b.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ padding: '72px 48px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#FC8019', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 10 }}>Everything you need</p>
          <h2 style={{ textAlign: 'center', fontSize: 34, fontWeight: 900, letterSpacing: '-.5px', marginBottom: 48 }}>Features built for speed</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 20 }}>
            {FEATURES.map(f => (
              <Link key={f.title} href={f.href} style={{ textDecoration: 'none' }}>
                <div style={{ background: '#fff', borderRadius: 14, padding: '28px 24px', border: '1.5px solid #F0F0F0', display: 'flex', gap: 16, alignItems: 'flex-start', cursor: 'pointer', transition: 'border-color .15s, box-shadow .15s', height: '100%' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#FC8019'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(252,128,25,.1)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#F0F0F0'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}>
                  <div style={{ width: 48, height: 48, background: '#FFF3E8', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{f.icon}</div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6, color: '#282C3F' }}>{f.title}</div>
                    <div style={{ fontSize: 13, color: '#686B78', lineHeight: 1.6 }}>{f.desc}</div>
                    <div style={{ marginTop: 10, fontSize: 13, color: '#FC8019', fontWeight: 600 }}>Learn more →</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ padding: '72px 48px', background: '#FAFAFA' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#FC8019', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 10 }}>Simple pricing</p>
          <h2 style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-.5px', marginBottom: 16 }}>Free to start, always</h2>
          <p style={{ fontSize: 16, color: '#686B78', marginBottom: 40 }}>No credit card needed. Set up your business in under 60 seconds.</p>
          <div style={{ background: '#fff', borderRadius: 20, padding: '40px', border: '2px solid #FC8019', boxShadow: '0 8px 32px rgba(252,128,25,.12)' }}>
            <div style={{ fontSize: 48, fontWeight: 900, color: '#FC8019', marginBottom: 4 }}>Free</div>
            <div style={{ fontSize: 14, color: '#686B78', marginBottom: 28 }}>Everything you need to run your business</div>
            {['Unlimited orders', 'POS billing', 'Online store page', 'Customer feedback', 'Analytics dashboard', 'Multi-business support'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, fontSize: 14, color: '#282C3F' }}>
                <span style={{ color: '#60B246', fontWeight: 700 }}>✓</span> {f}
              </div>
            ))}
            <button onClick={() => router.push(ctaTarget)} style={{ marginTop: 24, width: '100%', padding: '14px', background: '#FC8019', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit' }}>
              Get Started Free →
            </button>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: 'linear-gradient(135deg, #FC8019 0%, #FF6B35 100%)', padding: '80px 48px', textAlign: 'center', color: '#fff' }}>
        <h2 style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-.5px', marginBottom: 14 }}>Ready to get started?</h2>
        <p style={{ fontSize: 16, opacity: .88, marginBottom: 32 }}>Set up your business in under 60 seconds. No credit card needed.</p>
        <button onClick={() => router.push(ctaTarget)} style={{ background: '#fff', color: '#FC8019', border: 'none', borderRadius: 10, padding: '16px 40px', fontWeight: 800, fontSize: 17, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(0,0,0,.15)' }}>
          Create Free Account →
        </button>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: '32px 48px', borderTop: '1px solid #F0F0F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, background: '#FC8019', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🍽️</div>
          <span style={{ fontWeight: 800, fontSize: 15, color: '#282C3F' }}>Commerce OS</span>
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {NAV_PRODUCTS.map(p => (
            <Link key={p.href} href={p.href} style={{ fontSize: 13, color: '#686B78', textDecoration: 'none' }}>{p.label}</Link>
          ))}
        </div>
        <span style={{ fontSize: 13, color: '#9CA3AF' }}>© 2025 Commerce OS</span>
      </footer>
    </div>
  );
}
