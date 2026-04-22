'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearSession, getBusiness } from '@/lib/auth';
import { DEMO_MODE } from '@/lib/demo';

const NAV = [
  { href: '/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/pos',       icon: '🧾', label: 'POS Billing' },
  { href: '/orders',    icon: '📋', label: 'Orders' },
  { href: '/items',     icon: '📦', label: 'Catalog' },
  { href: '/feedback',  icon: '⭐', label: 'Feedback' },
  { href: '/analytics', icon: '📈', label: 'Analytics' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const business = typeof window !== 'undefined' ? getBusiness() : null;

  const logout = () => { clearSession(); router.push('/login'); };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">🍽️</div>
        <div>
          <div className="logo-text">Commerce OS</div>
          <div className="logo-sub">
            {DEMO_MODE ? '✨ Demo Mode' : 'Powered by Swiggy-style UX'}
          </div>
        </div>
      </div>

      {/* Business info */}
      {business && (
        <div className="sidebar-business">
          <div className="biz-name">{business.name}</div>
          <span className="biz-type">{business.type}</span>
        </div>
      )}

      {/* Nav */}
      <nav>
        {NAV.map(n => (
          <Link
            key={n.href}
            href={n.href}
            className={pathname.startsWith(n.href) ? 'active' : ''}
          >
            <span className="nav-icon">{n.icon}</span>
            {n.label}
          </Link>
        ))}
        {business && (
          <a href={`/store/${business.slug}`} target="_blank" rel="noreferrer">
            <span className="nav-icon">🔗</span>
            Public Store
          </a>
        )}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {DEMO_MODE ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>
              Exploring in demo mode
            </div>
            <button
              className="btn-primary"
              style={{ width: '100%', fontSize: 12, padding: '8px' }}
              onClick={() => router.push('/login?mode=signup')}
            >
              Create Free Account
            </button>
          </div>
        ) : (
          <button
            className="btn-ghost"
            style={{ width: '100%', color: '#9ca3af', borderColor: '#333', fontSize: 13 }}
            onClick={logout}
          >
            Sign out
          </button>
        )}
      </div>
    </aside>
  );
}
