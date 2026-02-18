# Universal Beverages — Architecture

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | Next.js 14 (App Router) | Server components, API routes, Vercel-native |
| **Database** | Supabase (Postgres) | Auth, storage, real-time, RLS — one platform |
| **Auth** | Supabase Auth | Magic links for customers, email/password for salesman |
| **File Storage** | Supabase Storage | Product images, brand logos, pallet images |
| **Hosting** | Vercel | Zero-config Next.js deploys, edge functions |
| **Styling** | Tailwind CSS + shadcn/ui | Fast mobile-first UI, consistent components |
| **Optional** | Ecwid API | Order push (future integration) |

---

## Project Structure

```
/app
├── (customer)/                  # Customer-facing routes (magic link auth)
│   ├── layout.tsx               # Customer shell — bottom nav (Home, Orders)
│   ├── page.tsx                 # Home — date picker modal
│   ├── order/[date]/
│   │   └── page.tsx             # Catalog view — tabs, filters, qty selectors
│   └── orders/
│       └── page.tsx             # Orders list — current + previous
│
├── (admin)/                     # Salesman dashboard (password auth)
│   ├── layout.tsx               # Admin shell — bottom nav (5 tabs)
│   ├── dashboard/
│   │   └── page.tsx             # Stats + recent orders
│   ├── orders/
│   │   ├── page.tsx             # Order list — filter tabs, search
│   │   └── [id]/page.tsx        # Order detail — edit, status, CSV
│   ├── customers/
│   │   ├── page.tsx             # Customer list
│   │   ├── [id]/page.tsx        # Customer detail — settings, history
│   │   └── [id]/products/page.tsx  # Product manager — include/exclude
│   ├── catalog/
│   │   ├── page.tsx             # Product list — CRUD
│   │   ├── [id]/page.tsx        # Product edit form
│   │   └── pallets/
│   │       ├── page.tsx         # Pallet deals list
│   │       └── [id]/page.tsx    # Pallet deal editor
│   ├── brands/
│   │   └── page.tsx             # Brand list + logos
│   └── reports/
│       └── page.tsx             # Sales reports — date range filters
│
├── api/                         # API routes
│   ├── orders/
│   │   ├── route.ts             # CRUD orders
│   │   ├── [id]/status/route.ts # Status transitions
│   │   ├── [id]/csv/route.ts    # CSV export
│   │   └── [id]/clone/route.ts  # Reorder (clone)
│   └── ecwid/
│       └── push/route.ts        # Push order to Ecwid
│
├── auth/
│   ├── login/page.tsx           # Salesman login
│   ├── magic/page.tsx           # Customer magic link landing
│   └── callback/route.ts       # Supabase auth callback
│
/components
├── ui/                          # shadcn/ui primitives
├── catalog/
│   ├── ProductCard.tsx          # Card view (New Items, Pallets)
│   ├── ProductRow.tsx           # Compact row (All tab)
│   ├── QuantitySelector.tsx     # +/- with auto-save
│   ├── CatalogTabs.tsx          # New Items | Pallets | All
│   ├── FilterBar.tsx            # Brand + Size dropdowns
│   └── GroupHeader.tsx          # Collapsible group headers
├── orders/
│   ├── ReviewDrawer.tsx         # Slide-up review panel
│   ├── OrderCard.tsx            # Order summary card
│   └── DatePicker.tsx           # Date selector modal
├── admin/
│   ├── StatsGrid.tsx            # Dashboard stat cards
│   ├── CustomerForm.tsx         # Edit customer info
│   └── CatalogSettings.tsx      # Per-customer toggles
│
/lib
├── supabase/
│   ├── client.ts                # Browser client
│   ├── server.ts                # Server client (for RSC)
│   └── admin.ts                 # Service role client (for API routes)
├── types.ts                     # TypeScript types (mirroring DB schema)
├── utils.ts                     # Helpers — formatCurrency, CSV export
└── hooks/
    ├── useAutoSave.ts           # Debounced auto-save for qty changes
    └── useCatalog.ts            # Filtered/grouped product list
```

---

## Database Schema

### Core Tables

```sql
-- ============================================
-- AUTH & USERS
-- ============================================

-- Supabase Auth handles auth.users automatically.
-- This table extends it with app-specific fields.

CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL CHECK (role IN ('customer', 'salesman')),
  business_name TEXT,               -- "Joe's Deli"
  contact_name  TEXT,
  email        TEXT,
  phone        TEXT,
  address      TEXT,
  city         TEXT,
  state        TEXT,
  zip          TEXT,
  -- Customer catalog preferences (salesman sets these)
  show_prices    BOOLEAN DEFAULT TRUE,
  default_group  TEXT DEFAULT 'brand',  -- 'brand' or 'size'
  custom_pricing BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- CATALOG
-- ============================================

CREATE TABLE brands (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  logo_url   TEXT,                   -- Supabase Storage path
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id      UUID REFERENCES brands(id),
  title         TEXT NOT NULL,         -- "CHERRY COKE"
  pack_details  TEXT,                  -- "24/20 OZ."
  price         DECIMAL(10,2) NOT NULL, -- case cost
  image_url     TEXT,                  -- Supabase Storage path
  is_new        BOOLEAN DEFAULT FALSE, -- shows in "New Items" tab
  is_discontinued BOOLEAN DEFAULT FALSE, -- hidden from customers
  tags          TEXT[],                -- ["CALL FOR VOLUME DISCOUNTS"]
  -- Future: pallet capacity
  case_length   DECIMAL(6,2),
  case_width    DECIMAL(6,2),
  case_height   DECIMAL(6,2),
  sort_order    INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Per-customer product overrides (exclude or custom price)
CREATE TABLE customer_products (
  customer_id  UUID REFERENCES profiles(id) ON DELETE CASCADE,
  product_id   UUID REFERENCES products(id) ON DELETE CASCADE,
  excluded     BOOLEAN DEFAULT FALSE,
  custom_price DECIMAL(10,2),          -- NULL = use default price
  PRIMARY KEY (customer_id, product_id)
);

-- ============================================
-- PALLET DEALS
-- ============================================

CREATE TABLE pallet_deals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,          -- "COKE CLASSIC PALLET"
  pallet_type  TEXT NOT NULL CHECK (pallet_type IN ('single', 'mixed')),
  image_url    TEXT,
  price        DECIMAL(10,2) NOT NULL, -- total pallet price (or per-case for single)
  savings_text TEXT,                   -- "save $3/case" (display string)
  description  TEXT,                   -- contents breakdown
  is_active    BOOLEAN DEFAULT TRUE,
  sort_order   INT DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Products included in a pallet deal
CREATE TABLE pallet_deal_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pallet_deal_id UUID REFERENCES pallet_deals(id) ON DELETE CASCADE,
  product_id     UUID REFERENCES products(id),
  quantity       INT NOT NULL,          -- cases of this product in the pallet
  UNIQUE (pallet_deal_id, product_id)
);

-- ============================================
-- ORDERS
-- ============================================

CREATE TABLE orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  delivery_date DATE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'submitted', 'delivered')),
  total         DECIMAL(10,2) DEFAULT 0,
  item_count    INT DEFAULT 0,
  submitted_at  TIMESTAMPTZ,
  delivered_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  -- One draft per customer per delivery date
  UNIQUE (customer_id, delivery_date)
    WHERE (status = 'draft')  -- partial unique index via trigger
);

-- NOTE: Postgres doesn't support WHERE on UNIQUE constraints directly.
-- We use a partial unique index instead (see Indexes section).

CREATE TABLE order_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID REFERENCES orders(id) ON DELETE CASCADE,
  -- Either a product or a pallet deal (one must be set)
  product_id      UUID REFERENCES products(id),
  pallet_deal_id  UUID REFERENCES pallet_deals(id),
  quantity    INT NOT NULL DEFAULT 0,
  unit_price  DECIMAL(10,2) NOT NULL,  -- price at time of order
  line_total  DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  CHECK (
    (product_id IS NOT NULL AND pallet_deal_id IS NULL) OR
    (product_id IS NULL AND pallet_deal_id IS NOT NULL)
  )
);

-- ============================================
-- ORDER CUTOFF (optional feature)
-- ============================================

CREATE TABLE order_cutoffs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cutoff_days      INT NOT NULL DEFAULT 2,   -- days before delivery
  cutoff_time      TIME DEFAULT '17:00',     -- time of day
  is_active        BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- Per-product cutoff overrides
CREATE TABLE product_cutoff_overrides (
  product_id   UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  cutoff_days  INT,
  cutoff_time  TIME
);
```

### Indexes

```sql
-- Performance indexes
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_active ON products(is_discontinued) WHERE NOT is_discontinued;
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_delivery ON orders(delivery_date);
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- One draft per customer per delivery date
CREATE UNIQUE INDEX idx_one_draft_per_date
  ON orders(customer_id, delivery_date)
  WHERE status = 'draft';
```

### Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
-- ... (all tables)

-- Helper: check if current user is salesman
CREATE OR REPLACE FUNCTION is_salesman()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'salesman'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- PROFILES
CREATE POLICY "Customers see own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Salesman sees all profiles"
  ON profiles FOR ALL
  USING (is_salesman());

-- PRODUCTS (read-only for customers, full access for salesman)
CREATE POLICY "Everyone reads active products"
  ON products FOR SELECT
  USING (NOT is_discontinued);

CREATE POLICY "Salesman manages products"
  ON products FOR ALL
  USING (is_salesman());

-- ORDERS
CREATE POLICY "Customers see own orders"
  ON orders FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "Customers manage own drafts"
  ON orders FOR INSERT
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customers update own drafts"
  ON orders FOR UPDATE
  USING (customer_id = auth.uid() AND status = 'draft');

CREATE POLICY "Salesman manages all orders"
  ON orders FOR ALL
  USING (is_salesman());

-- ORDER ITEMS (follows order access)
CREATE POLICY "Customers see own order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.customer_id = auth.uid()
    )
  );

CREATE POLICY "Customers manage draft order items"
  ON order_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.customer_id = auth.uid()
      AND orders.status = 'draft'
    )
  );

CREATE POLICY "Salesman manages all order items"
  ON order_items FOR ALL
  USING (is_salesman());
```

### Database Functions

```sql
-- Auto-update order totals when items change
CREATE OR REPLACE FUNCTION update_order_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE orders SET
    total = COALESCE((
      SELECT SUM(line_total) FROM order_items WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
    ), 0),
    item_count = COALESCE((
      SELECT SUM(quantity) FROM order_items WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
    ), 0),
    updated_at = now()
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_order_totals
  AFTER INSERT OR UPDATE OR DELETE ON order_items
  FOR EACH ROW EXECUTE FUNCTION update_order_totals();

-- Submit order (status transition + timestamp)
CREATE OR REPLACE FUNCTION submit_order(order_id UUID)
RETURNS VOID AS $$
  UPDATE orders
  SET status = 'submitted', submitted_at = now(), updated_at = now()
  WHERE id = order_id AND status = 'draft';
$$ LANGUAGE sql;

-- Clone order for reorder
CREATE OR REPLACE FUNCTION clone_order(
  source_order_id UUID,
  new_delivery_date DATE
) RETURNS UUID AS $$
DECLARE
  new_order_id UUID;
  v_customer_id UUID;
BEGIN
  SELECT customer_id INTO v_customer_id
  FROM orders WHERE id = source_order_id;

  INSERT INTO orders (customer_id, delivery_date, status)
  VALUES (v_customer_id, new_delivery_date, 'draft')
  RETURNING id INTO new_order_id;

  INSERT INTO order_items (order_id, product_id, pallet_deal_id, quantity, unit_price)
  SELECT new_order_id, product_id, pallet_deal_id, quantity, unit_price
  FROM order_items WHERE order_id = source_order_id;

  RETURN new_order_id;
END;
$$ LANGUAGE plpgsql;
```

---

## Key Patterns

### 1. Auto-Save (Quantity Changes)

The core UX — no "add to cart" button. Quantity changes save immediately.

```
User taps +/- → QuantitySelector updates local state instantly
              → Debounced (300ms) upsert to order_items
              → order_totals trigger recalculates total
              → UI reflects saved state via optimistic update
```

**Implementation:** `useAutoSave` hook wraps a Supabase `upsert` with debounce. If quantity hits 0, the row is deleted instead.

### 2. Customer Catalog Filtering

Products a customer sees are filtered server-side:

```sql
-- Fetch catalog for a customer
SELECT p.*, cp.custom_price
FROM products p
LEFT JOIN customer_products cp
  ON cp.product_id = p.id AND cp.customer_id = $1
WHERE p.is_discontinued = FALSE
  AND (cp.excluded IS NULL OR cp.excluded = FALSE)
ORDER BY p.sort_order;
```

The customer's `show_prices` and `custom_pricing` flags determine what price (if any) is displayed.

### 3. One Draft Per Date

Enforced at the database level with a partial unique index. When a customer picks a date:
- If a draft exists → load it ("Continue Order")
- If no draft → create one ("New Order")
- Submitted/delivered orders for the same date don't conflict

### 4. Auth Flow

**Customer:**
```
Salesman creates profile → Supabase sends magic link email
Customer clicks link → Supabase Auth callback → redirect to Home
Session persisted via cookie (httpOnly)
```

**Salesman:**
```
Single hardcoded account → email/password login
Role checked via profiles.role = 'salesman'
All admin routes protected by middleware
```

### 5. Middleware (Route Protection)

```
/middleware.ts
├── /order/*, /orders/* → require auth + role = 'customer'
├── /dashboard/*, /admin/* → require auth + role = 'salesman'
└── /auth/* → public
```

### 6. CSV Export

Generated server-side in an API route. Streams the response:

```
GET /api/orders/[id]/csv
→ Fetch order + items + product details
→ Build CSV rows: Product, Pack, Qty, Price, Total
→ Return as downloadable file
```

---

## Supabase Storage Buckets

| Bucket | Access | Contents |
|--------|--------|----------|
| `product-images` | Public read | Product photos |
| `brand-logos` | Public read | Brand logo images |
| `pallet-images` | Public read | Pallet deal photos |

All uploads go through the admin dashboard. Public read means no auth needed to display images.

---

## Data Flow Summary

```
┌─────────────────────────────────────────────────────┐
│                    CUSTOMER APP                      │
│                                                      │
│  Date Picker → Catalog → Qty +/- → Review → Submit  │
│       │            │          │                  │    │
└───────┼────────────┼──────────┼──────────────────┼───┘
        │            │          │                  │
        ▼            ▼          ▼                  ▼
┌─────────────────────────────────────────────────────┐
│                   SUPABASE                           │
│                                                      │
│  orders table    products    order_items    profiles  │
│  (draft/sub/     (catalog)   (auto-save     (auth +  │
│   delivered)                  via upsert)   settings) │
│                                                      │
│  ─── RLS ensures customers only see their data ───   │
│                                                      │
└───────┬────────────┬──────────┬──────────────────────┘
        │            │          │
        ▼            ▼          ▼
┌─────────────────────────────────────────────────────┐
│                  SALESMAN DASHBOARD                   │
│                                                      │
│  Orders list → Order detail → Mark delivered         │
│  Customers → Settings → Product manager              │
│  Catalog CRUD → Brand management → Reports           │
│                                                      │
│  Optional: Push to Ecwid API on status change        │
└─────────────────────────────────────────────────────┘
```

---

## Deployment

```
GitHub repo
  ├── Push to main → Vercel auto-deploys
  ├── Preview deploys on PRs
  └── Environment variables:
       NEXT_PUBLIC_SUPABASE_URL
       NEXT_PUBLIC_SUPABASE_ANON_KEY
       SUPABASE_SERVICE_ROLE_KEY
       ECWID_API_TOKEN (when needed)
```

**Supabase project setup:**
1. Create project on supabase.com
2. Run schema migration (SQL above)
3. Enable Auth → Email provider (magic link + password)
4. Create storage buckets (public read)
5. Set RLS policies

---

## What's Intentionally Simple

- **No real-time subscriptions** — auto-save uses standard REST upserts; no need for WebSocket complexity
- **No state management library** — React Server Components + `useState` for local UI state is enough
- **No ORM** — Supabase JS client talks directly to Postgres. Types generated from schema
- **No separate API layer** — Next.js API routes + Supabase client handle everything
- **No background jobs** — order totals update via DB trigger, not a queue
- **Single environment** — one Supabase project, one Vercel deployment
- **Flat product model** — no SKU variants, no inventory tracking, no complex catalog logic

---

*Architecture v1 · Feb 17, 2025*
