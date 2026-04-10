'use client';
import ProductPage from '@/components/ProductPage';

export default function POSProductPage() {
  return (
    <ProductPage
      icon="🧾"
      title="POS Billing"
      tagline="Bill faster than ever"
      description="A lightning-fast point-of-sale system built for restaurants, retail stores, and service businesses. Create orders in seconds, apply discounts, and accept cash or UPI — all from one screen."
      color="#FC8019"
      flow={[
        { step: '1', title: 'Open POS', desc: 'Launch the billing screen — your full catalog is ready instantly.' },
        { step: '2', title: 'Add Items', desc: 'Tap items to add to cart. Click again to increase quantity. Search by name.' },
        { step: '3', title: 'Apply Discount', desc: 'Add flat or percentage discounts. Tax is calculated automatically.' },
        { step: '4', title: 'Choose Payment', desc: 'Select Cash or UPI. Enter customer name and phone optionally.' },
        { step: '5', title: 'Place Order', desc: 'Hit Place Order — the bill is created and the order appears in your dashboard instantly.' },
      ]}
      features={[
        { icon: '⚡', title: 'Instant billing', desc: 'Orders created in under 5 seconds' },
        { icon: '🔍', title: 'Item search', desc: 'Find any item instantly by name' },
        { icon: '🏷️', title: 'Discounts', desc: 'Flat or percentage discounts per order' },
        { icon: '💵', title: 'Cash & UPI', desc: 'Accept any payment mode' },
        { icon: '🍽️', title: 'Table support', desc: 'Table numbers for restaurant dine-in' },
        { icon: '⌨️', title: 'Keyboard shortcuts', desc: '⌘+Enter to checkout, ⌘+F to search' },
      ]}
    />
  );
}
