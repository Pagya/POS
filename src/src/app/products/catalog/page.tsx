'use client';
import ProductPage from '@/components/ProductPage';

export default function CatalogProductPage() {
  return (
    <ProductPage
      icon="📦"
      title="Catalog Management"
      tagline="Your menu, your products, your services"
      description="A universal catalog system that works for any business type. Add products, services, or menu items with categories, prices, and availability toggles — all in one place."
      color="#2E7D32"
      flow={[
        { step: '1', title: 'Create Categories', desc: 'Organise your items — Food, Clothing, Consultation, or anything you sell.' },
        { step: '2', title: 'Add Items', desc: 'Add name, price, type (product or service), and assign a category.' },
        { step: '3', title: 'Toggle Availability', desc: 'Mark items as available or unavailable. Unavailable items are hidden from the public store.' },
        { step: '4', title: 'Edit Anytime', desc: 'Update prices, names, or categories at any time. Changes reflect instantly.' },
        { step: '5', title: 'Appears Everywhere', desc: 'Your catalog powers the POS screen, the public ordering page, and the dashboard.' },
      ]}
      features={[
        { icon: '🗂️', title: 'Categories', desc: 'Organise items into custom categories' },
        { icon: '🔄', title: 'Availability toggle', desc: 'Turn items on/off instantly' },
        { icon: '🏷️', title: 'Products & services', desc: 'Works for physical and service businesses' },
        { icon: '✏️', title: 'Easy editing', desc: 'Update any item in seconds' },
        { icon: '🌐', title: 'Powers everything', desc: 'POS, online store, and dashboard' },
        { icon: '📱', title: 'Mobile friendly', desc: 'Manage catalog from any device' },
      ]}
    />
  );
}
