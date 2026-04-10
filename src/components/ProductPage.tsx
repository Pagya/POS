'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Props {
  icon: string;
  title: string;
  tagline: string;
  description: string;
  color: string;
  flow: { step: string; title: string; desc: string }[];
  features: { icon: string; title: string; desc: string }[];
}

export default function ProductPage({ icon, title, tagline, description, color, flow, features }: Props) {
  const router = useRouter();

  return (
    <div style={{ background: '#fff', minHeight: '100vh', fontFamily: 'Inter, -apple-system, sans-serif', color: '#282C3F' }}>

      {/* Nav */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 48px', borderBottom: '1px solid #F0F0F0', position: 'sticky', top: 0, background: '#fff', zIndex: 100, height: 64 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#282C3F' }}>
          <div style={{ width: 32, height: 32, background: '#FC8019', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🍽️</div>
          <span style={{ fontWeight: 800, fontSize: 16 }}>Commerce OS</span>
        </Link>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => router.push('/login')} style={{ background: 'transparent', border: '1.5px solid #E9E9EB', color: '#282C3F', borderRadius: 8, padding: '7px 16px', fontWeight: 600, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>Sign In</button>
          <button onClick={() => router.push('/login?mode=signup')} style={{ background: '#FC8019', border: 'none', color: '#fff', borderRadius: 8, padding: '7px 16px', fontWeight: 700, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>Get Started Free</button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}CC 100%)`, padding: '80px 48px', color: '#fff', textAlign: 'center' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>{icon}</div>
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,.2)', borderRadius: 99, padding: '5px 16px', fontSize: 12, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '1px' }}>
            {tagline}
          </div>
          <h1 style={{ fontSize: 48, fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: 20 }}>{title}</h1>
          <p style={{ fontSize: 17, opacity: .9, lineHeight: 1.7, marginBottom: 36, maxWidth: 520, margin: '0 auto 36px' }}>{description}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => router.push('/login?mode=signup')} style={{ background: '#fff', color, border: 'none', borderRadius: 10, padding: '14px 32px', fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(0,0,0,.15)' }}>
              Start for Free →
            </button>
            <Link href="/" style={{ background: 'rgba(255,255,255,.15)', color: '#fff', border: '1.5px solid rgba(255,255,255,.4)', borderRadius: 10, padding: '14px 32px', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none', display: 'inline-block' }}>
              ← All Features
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '72px 48px', background: '#FAFAFA' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 10 }}>How it works</p>
          <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 900, letterSpacing: '-.5px', marginBottom: 48 }}>Simple 5-step flow</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {flow.map((f, i) => (
              <div key={f.step} style={{ display: 'flex', gap: 24, alignItems: 'flex-start', paddingBottom: i < flow.length - 1 ? 0 : 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 99, background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 16, flexShrink: 0 }}>{f.step}</div>
                  {i < flow.length - 1 && <div style={{ width: 2, height: 40, background: `${color}33`, margin: '4px 0' }} />}
                </div>
                <div style={{ paddingBottom: 32 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6, color: '#282C3F' }}>{f.title}</div>
                  <div style={{ fontSize: 14, color: '#686B78', lineHeight: 1.6 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section style={{ padding: '72px 48px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 10 }}>What you get</p>
          <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 900, letterSpacing: '-.5px', marginBottom: 48 }}>Everything included</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            {features.map(f => (
              <div key={f.title} style={{ background: '#FAFAFA', borderRadius: 12, padding: '22px 20px', display: 'flex', gap: 14, alignItems: 'flex-start', border: '1.5px solid #F0F0F0' }}>
                <div style={{ width: 40, height: 40, background: `${color}18`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{f.icon}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: '#282C3F' }}>{f.title}</div>
                  <div style={{ fontSize: 13, color: '#686B78', lineHeight: 1.5 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}CC 100%)`, padding: '72px 48px', textAlign: 'center', color: '#fff' }}>
        <h2 style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-.5px', marginBottom: 14 }}>Ready to try {title}?</h2>
        <p style={{ fontSize: 16, opacity: .88, marginBottom: 32 }}>Free forever. Set up in under 60 seconds.</p>
        <button onClick={() => router.push('/login?mode=signup')} style={{ background: '#fff', color, border: 'none', borderRadius: 10, padding: '15px 40px', fontWeight: 800, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(0,0,0,.15)' }}>
          Create Free Account →
        </button>
      </section>

      {/* Footer */}
      <footer style={{ padding: '24px 48px', borderTop: '1px solid #F0F0F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: '#9CA3AF' }}>
        <Link href="/" style={{ color: '#9CA3AF', textDecoration: 'none' }}>← Back to Commerce OS</Link>
        <span>© 2025 Commerce OS</span>
      </footer>
    </div>
  );
}
