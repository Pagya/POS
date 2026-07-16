require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth',       require('./modules/auth/auth.routes'));
app.use('/businesses', require('./modules/business/business.routes'));
app.use('/catalog',    require('./modules/catalog/catalog.routes'));
app.use('/orders',     require('./modules/orders/orders.routes'));
app.use('/feedback',   require('./modules/feedback/feedback.routes'));
app.use('/dashboard',  require('./modules/dashboard/dashboard.routes'));
app.use('/public',     require('./modules/public/public.routes'));
app.use('/customers',  require('./modules/customers/customers.routes'));
app.use('/api/items', require('./modules/catalog/catalog.variants.routes'));
app.get('/api/analytics/health', (_, res) => res.json({ status: 'ok', service: 'analytics-proxy' }));
app.use('/api/analytics', require('./modules/analytics/analytics.proxy'));

// Static file serving for uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/health', (_, res) => res.json({ status: 'ok' }));

// Export for Vercel serverless; also listen for local dev
if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`Commerce OS API running on :${PORT}`));
}

module.exports = app;
