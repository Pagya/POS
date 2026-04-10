'use client';
import ProductPage from '@/components/ProductPage';

export default function OrdersProductPage() {
  return (
    <ProductPage
      icon="📋"
      title="Order Management"
      tagline="Track every order, end to end"
      description="A real-time order tracking system that works across POS and online orders. Update statuses, view order details, and never lose track of a customer request."
      color="#1565C0"
      flow={[
        { step: '1', title: 'Order Created', desc: 'Every POS or online order appears instantly in your Orders dashboard.' },
        { step: '2', title: 'Mark Processing', desc: 'One click to move an order from New → Processing so your team knows what to work on.' },
        { step: '3', title: 'Complete Order', desc: 'Mark as Completed when done. This triggers the feedback request to the customer.' },
        { step: '4', title: 'Mark as Paid', desc: 'Confirm payment received. Track unpaid orders separately.' },
        { step: '5', title: 'Filter & Search', desc: 'Filter by Today, 7 days, or 30 days. Filter by status. Find any order fast.' },
      ]}
      features={[
        { icon: '🔄', title: 'Live status updates', desc: 'New → Processing → Completed → Cancelled' },
        { icon: '📅', title: 'Date filters', desc: 'Today, 7 days, 30 days, or all time' },
        { icon: '💳', title: 'Payment tracking', desc: 'Mark orders as paid or unpaid' },
        { icon: '🌐', title: 'Online + POS', desc: 'All orders in one unified view' },
        { icon: '📊', title: 'Order detail', desc: 'Full breakdown with items, tax, discount' },
        { icon: '🔔', title: 'Auto polling', desc: 'New online orders appear every 15 seconds' },
      ]}
    />
  );
}
