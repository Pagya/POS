'use client';
import ProductPage from '@/components/ProductPage';

export default function StoreProductPage() {
  return (
    <ProductPage
      icon="🌐"
      title="Online Store"
      tagline="Your business online in 60 seconds"
      description="Every business gets a unique public URL that customers can visit to browse your catalog and place orders. No app, no setup, no developer needed."
      color="#6A1B9A"
      flow={[
        { step: '1', title: 'Create Business', desc: 'Sign up and set up your business profile. Your unique store URL is generated instantly.' },
        { step: '2', title: 'Add Your Catalog', desc: 'Add your products or services. They appear on your public store automatically.' },
        { step: '3', title: 'Share Your Link', desc: 'Share your store URL on WhatsApp, Instagram, or anywhere. Customers can order directly.' },
        { step: '4', title: 'Customer Orders', desc: 'Customer browses, adds to cart, and places order with their name and phone.' },
        { step: '5', title: 'Order Appears', desc: 'The order shows up in your dashboard instantly. No manual entry needed.' },
      ]}
      features={[
        { icon: '🔗', title: 'Unique URL', desc: 'Your own store link, shareable anywhere' },
        { icon: '📱', title: 'Mobile first', desc: 'Works perfectly on any phone' },
        { icon: '🛒', title: 'Cart persistence', desc: 'Cart saved in browser, never lost' },
        { icon: '🗂️', title: 'Category nav', desc: 'Sticky category navigation like Swiggy' },
        { icon: '⭐', title: 'Feedback prompt', desc: 'Customers rate after every order' },
        { icon: '🎉', title: 'Order confirmation', desc: 'Beautiful confirmation screen after order' },
      ]}
    />
  );
}
