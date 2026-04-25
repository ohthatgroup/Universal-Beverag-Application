# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository. Mirrors `CLAUDE.md`.

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

E2E tests run against a real database and require a built app (`npm run build && npm run start`).

## Architecture

Single Next.js 15 (App Router) monolith deployed to Cloudflare Workers via OpenNext. The customer-facing portal runs against Neon Postgres via the `pg` driver bound through Hyperdrive in production. Some legacy Supabase-client code remains in `lib/supabase/` for in-flight migration paths but **the customer portal does not use it** — see Database below. No ORM, no state management library.

### Two User Surfaces

- **Customer portal** (`app/(portal)/`) — Mobile-first ordering flow. Token-based access via magic-link URLs of the form `/portal/[token]/...`. Surface routes:
  - `/portal/[token]` — homepage (greeting, drafts, upcoming/recent, past orders)
  - `/portal/[token]/order/[date]` — order builder by delivery date
  - `/portal/[token]/order/link/[id]` — order builder by direct link
  - `/portal/[token]/orders` — order history
  - `/portal/[token]/account` — account settings
  - `/c/[token]/...` — short-link redirector mirroring the same routes
- **Admin** (`app/(admin)/`) — Salesman dashboard. Email/password auth. Routes: `/admin/dashboard`, `/admin/orders`, `/admin/customers`, `/admin/catalog`, `/admin/brands`, `/admin/reports`.

### Database (customer portal)

The customer portal uses **Neon Postgres** via direct `pg` driver queries through `lib/server/db/` (`getRequestDb()`). On Cloudflare Workers, the connection is proxied through a Hyperdrive binding configured in `wrangler.toml`. There is no ORM. Schema changes live as plain SQL migrations under `db/migrations/`. Auto-generated types live in `lib/database.generated.ts` and are re-exported from `lib/types.ts`.

Key DB behavior:
- A Postgres trigger (`trg_update_order_totals`) auto-recalculates `orders.total` and `orders.item_count` on `order_items` changes.
- Stored functions: `submit_order(order_id)`, `clone_order(source_order_id, new_delivery_date)`.
- One draft order per customer per delivery date enforced via partial unique index.

### Authentication

- **Customers** access the portal via a per-customer token embedded in the URL (`/portal/[token]/...`). The token is resolved server-side via `lib/server/customer-auth.ts` `resolveCustomerToken(token)` which is React-cached. There is no traditional sign-in for customers.
- **Salesmen** sign in with email/password. Session is cookie-based. Routes are guarded server-side.

Route protection is layered:
1. **`middleware.ts`** — protects all page routes, checks role, redirects if unauthenticated or wrong role.
2. **`lib/server/auth.ts`** `requireAuthContext(allowedRoles?)` — protects API routes, throws `RouteError(401/403)`.
3. **`lib/server/page-auth.ts`** `requirePageAuth()` — RSC page-level guard that calls `redirect()`.

### API Contract

All API routes use helpers from `lib/server/api.ts`:
- Success: `{ "data": ... }`
- Error: `{ "error": { "code": string, "message": string } }`
- Use `parseBody(schema)` for Zod-validated request bodies.
- Use `toErrorResponse()` to map errors to correct HTTP status codes.

Zod schemas shared between API validation and client-side forms live in `lib/server/schemas.ts`.

### Auto-Save Pattern

The key UX pattern: no cart/submit button for line items. Quantity changes in the order builder (`app/(portal)/portal/[token]/order/...`) immediately upsert to the DB with a 300ms debounce via `lib/hooks/useAutoSavePortal.ts`. Quantity `0` triggers a `DELETE`; non-zero triggers `upsert` with conflict resolution on `(order_id, product_id)`. The order itself is the only thing that has an explicit Submit (in the review drawer); everything else autosaves.

### Type Safety

ESLint enforces `@typescript-eslint/no-explicit-any` as an error everywhere except `lib/database.generated.ts`. When regenerating DB types, run `npm run db:types:generate` rather than editing the file manually.

## Customer surface

The customer portal has its own design doctrine and primitive set, codified in **`docs/design-system.md`**. Read that file before making any changes to the customer surface — it is the single source of truth for tokens, primitives, modals, and the 11 doctrine rules.

Key load-bearing components:

- **`<Panel>`** (`components/ui/panel.tsx`) — the one primitive for every modal-like surface. Three variants (`centered` / `bottom-sheet` / `side-sheet`) plus `Panel.Header` / `Panel.Body` / `Panel.Footer` slots. Composes Radix Dialog under the hood. Has a `preventAutoFocus` prop for cases where opening shouldn't pop the iOS keyboard.
- **`<CartReviewSurface>`** (`components/catalog/cart-review-surface.tsx`) — fuses the cart bar (closed state) and review drawer (open state) into one continuous surface. Tapping Review lifts the bar into a 68dvh panel; the bar's content (item count + Review button) cross-fades to the drawer's footer (Total + Submit button). This replaces the older split `<CartSummaryBar>` + `<ReviewOrderSheet>` pair, which no longer exist.
- **`<FamilySheet>`** + **`<FamilyPillSwitcher>`** (`components/catalog/`) — bottom-sheet (Panel variant) for browsing one of six product families. The pill switcher floats fixed at the top of the viewport, colored per-family with icons and an obvious darker-bordered inactive state. Search is always-on inside the family-mode header. The filter slider opens a side-sheet (Panel variant) stacked over the FamilySheet.
- **`<ProductTile>`** (`components/catalog/product-tile.tsx`) — image-first tile with an `overlaySlot` prop. The Stepper renders as a floating dug-in pill overlay on every tile (usuals, FamilySheet, inline-search-results); the tile does not grow vertically.
- **`<Stepper>`** (`components/ui/stepper.tsx`) — canonical quantity control. Always renders the `surfaceFloatingRecessed` material (the only material token that survived the surface rebuild — see `lib/design/surfaces.ts`). Sizes: `sm` (h-8) for grid contexts, `md` (h-10) for the popout.

### Mobile viewport

`app/layout.tsx` exports a baseline viewport (`width=device-width, initialScale=1`). The customer portal layout (`app/(portal)/portal/[token]/layout.tsx`) overrides with `maximumScale=1, userScalable=false` to prevent iOS Safari from auto-zooming on input focus and refusing to zoom back out. Admin pages keep pinch-zoom.

## Scope

When the user gives an **implementation task** (e.g. "implement X", "build Y", "write the test", "fix the bug"), ignore the saved "design-only on UBA" preference for that task. Execute end-to-end: markup, state, queries, API routes, migrations, tests — whatever the task requires. Do not split work into a "design shipped / backend handoff" pattern unless explicitly asked.

The design-only default still applies to ambiguous design-review or visual-polish requests where backend involvement is unclear — in those cases, ask or stay design-only.
