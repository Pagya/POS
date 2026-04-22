'use client';
import ProductPage from '@/components/ProductPage';

export default function AnalyticsProductPage() {
  return (
    <ProductPage
      icon="📊"
      title="Analytics"
      tagline="Know your numbers, grow your business"
      description="A simple but powerful analytics dashboard that shows you revenue, order counts, average order value, and your top-selling items — with date range filters so you always have the right view."
      color="#1565C0"
      flow={[
        { step: '1', title: 'Orders Flow In', desc: 'Every POS and online order is recorded with full details.' },
        { step: '2', title: 'Data Aggregated', desc: 'Revenue, order count, and item sales are calculated in real time.' },
        { step: '3', title: 'Pick Your Range', desc: 'Filter by Today, Last 7 Days, or Last 30 Days.' },
        { step: '4', title: 'See the Chart', desc: 'Daily revenue bar chart shows your busiest days at a glance.' },
        { step: '5', title: 'Top Items', desc: 'See which products or services are selling the most — ranked by quantity and revenue.' },
      ]}
      features={[
        { icon: '💰', title: 'Revenue tracking', desc: 'Total revenue for any date range' },
        { icon: '📋', title: 'Order count', desc: 'How many orders in the period' },
        { icon: '🧾', title: 'Avg order value', desc: 'Average spend per customer' },
        { icon: '📊', title: 'Daily chart', desc: 'Bar chart of revenue by day' },
        { icon: '🏆', title: 'Top items', desc: 'Best selling products ranked' },
        { icon: '📅', title: 'Date filters', desc: 'Today, 7 days, 30 days' },
      ]}
    />
  );
}
