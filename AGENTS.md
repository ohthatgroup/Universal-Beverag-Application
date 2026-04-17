# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev           # Start Next.js dev server
npm run build         # Production build
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit

# Testing
npm run test          # Vitest unit tests (single pass)
npm run test:watch    # Vitest interactive watch mode
npm run test:e2e      # Playwright E2E tests (requires built app on port 3000)

# Database
npm run db:types:generate   # Regenerate lib/database.generated.ts from live schema
npm run db:types:check      # Detect schema drift
npm run ci:prepare-db       # Full reset + migrate + verify + provision
```

E2E tests run against a real Supabase project and require a built app (`npm run build && npm run start`).

## Architecture

Single Next.js 15 (App Router) monolith with Supabase (Postgres + Auth + Storage). No separate backend, no ORM, no state management library.

### Two User Surfaces

- **Customer** (`app/(customer)/`) — Mobile-first ordering flow. Magic link auth only. Routes: `/` (date picker), `/order/[date]/` (catalog with auto-save), `/orders/` (history).
- **Admin** (`app/(admin)/`) — Salesman dashboard. Email/password auth. Routes: `/admin/dashboard`, `/admin/orders`, `/admin/customers`, `/admin/catalog`, `/admin/brands`, `/admin/reports`.

### Supabase Client Pattern

Three clients in `lib/supabase/` — never mix them:
- `client.ts` — Browser/Client Components (anon key)
- `server.ts` — RSC, Server Actions (cookie-based session)
- `admin.ts` — API routes requiring privileged ops (service role, bypasses RLS)

### Authentication

Customers use magic links; salesmen use email/password. Both flow through `/auth/callback` which exchanges the code and redirects based on `profiles.role`.

Route protection is layered:
1. **`middleware.ts`** — protects all page routes, checks role, redirects if unauthenticated or wrong role
2. **`lib/server/auth.ts`** `requireAuthContext(allowedRoles?)` — protects API routes, throws `RouteError(401/403)`
3. **`lib/server/page-auth.ts`** `requirePageAuth()` — RSC page-level guard that calls `redirect()`

### API Contract

All API routes use helpers from `lib/server/api.ts`:
- Success: `{ "data": ... }`
- Error: `{ "error": { "code": string, "message": string } }`
- Use `parseBody(schema)` for Zod-validated request bodies
- Use `toErrorResponse()` to map errors to correct HTTP status codes

Zod schemas shared between API validation and client-side forms live in `lib/server/schemas.ts`.

### Auto-Save Pattern

The key UX pattern: no cart/submit button for line items. Quantity changes in `app/(customer)/order/[date]/` immediately upsert to the DB with a 300ms debounce (`lib/hooks/useAutoSave.ts`). Quantity `0` triggers a `DELETE`; non-zero triggers `upsert` with conflict resolution on `(order_id, product_id)`.

### Database

- **No ORM** — direct Supabase JS client queries
- Types auto-generated in `lib/database.generated.ts`; re-exported/extended in `lib/types.ts`
- Key DB behavior: a Postgres trigger (`trg_update_order_totals`) auto-recalculates `orders.total` and `orders.item_count` on `order_items` changes
- Stored functions: `submit_order(order_id)`, `clone_order(source_order_id, new_delivery_date)`
- One draft order per customer per delivery date enforced via partial unique index

### RLS

All tables have RLS enabled. `is_salesman()` (SECURITY DEFINER) is the key helper function. Customers can only access their own data; salesmen have full access. The `lib/supabase/admin.ts` client bypasses RLS — only use it in API routes for operations that legitimately need elevated access.

### Type Safety

ESLint enforces `@typescript-eslint/no-explicit-any` as an error everywhere except `lib/database.generated.ts`. When regenerating DB types, run `npm run db:types:generate` rather than editing the file manually.
