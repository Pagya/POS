# Commerce OS — MVP 🚀

A multi-tenant Commerce Operating System: POS + Order Management + Feedback Intelligence.

---

## Quick Start

### 1. Database
```bash
# Create a PostgreSQL database, then:
cp backend/.env.example backend/.env
# Fill in DATABASE_URL and JWT_SECRET

cd backend
npm install
npm run db:migrate
```

### 2. Backend
```bash
cd backend
npm run dev   # runs on :4000
```

### 3. Frontend
```bash
cd frontend
npm install
# create .env.local:
# NEXT_PUBLIC_API_URL=http://localhost:4000
npm run dev   # runs on :3000
```

---

## System Architecture

```
Browser
  ├── /login, /onboarding          → Auth + Business setup
  ├── /dashboard                   → Stats + recent orders
  ├── /pos                         → POS billing screen
  ├── /orders                      → Order list + status management
  ├── /items                       → Catalog management
  ├── /feedback                    → Feedback intelligence
  └── /store/[slug]                → Public ordering page (customer-facing)

Next.js (frontend :3000)
  └── axios → Express API (:4000)
        ├── /auth          → JWT signup/login
        ├── /businesses    → Business CRUD
        ├── /catalog       → Items + Categories
        ├── /orders        → POS + online orders
        ├── /feedback      → Ratings + comments
        ├── /dashboard     → Aggregated stats
        └── /public        → Public catalog (no auth)

PostgreSQL
  └── Multi-tenant via business_id on all tables
```

---

## Database Schema

```
users           id, email, password, name
businesses      id, owner_id→users, name, slug, type
categories      id, business_id→businesses, name
items           id, business_id, category_id, name, price, type, available
orders          id, business_id, customer_name, phone, table_number, notes,
                source(pos|online), status, discount_type, discount_value,
                payment_mode, total
order_items     id, order_id→orders, item_id→items, name(snapshot), price, qty
feedback        id, business_id, order_id→orders, rating(1-5), comment
```

---

## API Contracts

### Auth
```
POST /auth/signup   { name, email, password }  → { user, token }
POST /auth/login    { email, password }         → { user, token }
```

### Business
```
POST /businesses    { name, type }              → business
GET  /businesses                                → [businesses]
```

### Catalog
```
POST /catalog/:bid/categories  { name }         → category
GET  /catalog/:bid/categories                   → [categories]
POST /catalog/:bid/items  { name, price, type, category_id, available } → item
GET  /catalog/:bid/items                        → [items with category_name]
PATCH /catalog/:bid/items/:id  { ...fields }    → item
DELETE /catalog/:bid/items/:id                  → { success }
```

### Orders
```
POST /orders/:bid   { customer_name, customer_phone, table_number, notes,
                      source, discount_type, discount_value, payment_mode,
                      items: [{item_id, quantity}] }  → order

GET  /orders/:bid   ?status=new&date=2024-01-01       → [orders with items]
GET  /orders/:bid/:id                                  → order
PATCH /orders/:bid/:id/status  { status }              → order
```

### Feedback
```
POST /feedback      { order_id, rating, comment }  → feedback
GET  /feedback/:bid                                → { average_rating, feedback[] }
```

### Dashboard
```
GET /dashboard/:bid → { today_orders, today_revenue, recent_orders, average_rating }
```

### Public
```
GET /public/:slug   → { business, items[] }
```

---

## MVP Build Plan (2 weeks)

**Week 1 — Core**
- Day 1: DB schema + migrations, Express boilerplate
- Day 2: Auth module (signup/login/JWT)
- Day 3: Business setup + Catalog API
- Day 4: Orders API (POS + online)
- Day 5: Feedback API + Dashboard API

**Week 2 — Frontend**
- Day 6: Login + Onboarding screens
- Day 7: Dashboard + Catalog management
- Day 8: POS screen (item grid + cart)
- Day 9: Orders screen + status management
- Day 10: Public store page + Feedback modal + polish

---

## Business Types Supported

| Type       | POS | Dine-in tables | Online orders | Feedback |
|------------|-----|----------------|---------------|----------|
| Restaurant | ✅  | ✅             | ✅            | ✅       |
| Retail     | ✅  | —              | ✅            | ✅       |
| D2C        | ✅  | —              | ✅            | ✅       |
| Service    | ✅  | —              | ✅            | ✅       |
