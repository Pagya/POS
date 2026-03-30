'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearSession, getBusiness } from '@/lib/auth';

const NAV = [
  { href: '/dashboard', label: '📊 Dashboard' },
  { href: '/pos',       label: '🧾 POS' },
  { href: '/orders',    label: '📋 Orders' },
  { href: '/items',     label: '📦 Catalog' },
  { href: '/feedback',  label: '⭐ Feedback' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const business = typeof window !== 'undefined' ? getBusiness() : null;

  const logout = () => { clearSession(); router.push('/login'); };

  return (
    <aside className="sidebar">
      <div className="logo">Commerce OS</div>
      {business && (
        <div style={{ padding: '0 20px 16px', fontSize: 12, color: '#64748b' }}>
          {business.name}
          <span style={{ marginLeft: 6, background: '#2d2d4e', padding: '2px 6px', borderRadius: 4, fontSize: 10 }}>
            {business.type}
          </span>
        </div>
      )}
      <nav>
        {NAV.map(n => (
          <Link key={n.href} href={n.href} className={pathname.startsWith(n.href) ? 'active' : ''}>
            {n.label}
          </Link>
        ))}
        {business && (
          <a
            href={`/store/${business.slug}`}
            target="_blank"
            rel="noreferrer"
            style={{ marginTop: 8 }}
          >
            🔗 Public Page
          </a>
        )}
      </nav>
      <div style={{ position: 'absolute', bottom: 20, left: 0, right: 0, padding: '0 20px' }}>
        <button className="btn-ghost" style={{ width: '100%', color: '#94a3b8' }} onClick={logout}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
