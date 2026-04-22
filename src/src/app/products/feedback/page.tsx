'use client';
import ProductPage from '@/components/ProductPage';

export default function FeedbackProductPage() {
  return (
    <ProductPage
      icon="⭐"
      title="Feedback Intelligence"
      tagline="Understand your customers, not just your orders"
      description="Automatically collect customer ratings after every completed order. See trends, spot issues early, and understand what your customers love — without any manual effort."
      color="#E65100"
      flow={[
        { step: '1', title: 'Order Completed', desc: 'When you mark an order as Completed, the customer gets a feedback prompt.' },
        { step: '2', title: 'Customer Rates', desc: 'Customer selects 1–5 stars and optionally leaves a comment on the public store page.' },
        { step: '3', title: 'Feedback Stored', desc: 'Rating is linked to the order and customer. Stored securely in your dashboard.' },
        { step: '4', title: 'See Insights', desc: 'View average rating, 7-day trend chart, and top keywords from comments.' },
        { step: '5', title: 'Act on It', desc: 'Spot negative feedback early. Identify what customers praise most.' },
      ]}
      features={[
        { icon: '⭐', title: 'Star ratings', desc: '1–5 star rating per order' },
        { icon: '💬', title: 'Comments', desc: 'Optional text feedback from customers' },
        { icon: '📈', title: '7-day trend', desc: 'See if ratings are improving or dropping' },
        { icon: '🔑', title: 'Keyword analysis', desc: 'Most common words from feedback' },
        { icon: '😊', title: 'Sentiment split', desc: 'Positive vs negative feedback count' },
        { icon: '🔗', title: 'Linked to orders', desc: 'Every rating tied to a specific order' },
      ]}
    />
  );
}
