# ST-9 Screen Audit — 2026-04-17

Visual audit of every currently-landed screen after the P0 design-system pass and Portal Home redesign. Goal: hand the next design phase a concrete, per-screen list of what's landed, what's weak, and what must change. Not a backlog of bugs — an opinionated read of what each screen **says** to the user right now.

Conventions:
- **State** = design-system posture on this screen: ✅ on-system / 🟡 partial / ❌ off-system.
- Screenshots live in `docs/ui-ux-screenshots/post-design-system/audit/` (captured this session).
- Issues flagged here are *observations*, not tickets — the next phase turns them into plans.

---

## Portal (customer, token-auth)

### `/portal/[token]` — Home
State: ✅ on-system (redesigned + top-bar pass landed).
- `<PortalTopBar>` with "Universal Beverages" title + icon-only account button; dropdown surfaces customer name and "Edit profile" link.
- Greeting reduced to business name only (subline removed). Amber hero CTA sized to content, draft resume strip, card-stack orders list, collapsed past orders.
- **Weak spots for next pass:** "Change date" affordance is a low-contrast text link that disappears into the card; hero CTA sits awkwardly on wide desktop (no max-width on the card).

### `/portal/[token]/order/[date]` (+ `/order/link/[id]`) — Order builder
State: ❌ off-system.
- Still the pre-redesign layout: product rows with `+/-` steppers, no image forward, no search as primary surface, no sticky cart / summary.
- Money renders via `<Money>` and statuses via `<StatusChip>` from the sweep, but the shell is the old one.
- **Next-phase scope (already queued):** full rebuild — search-first, image cards, sticky bottom summary with live total, mobile pallet-mode tab.

### `/portal/[token]/orders` — Order history (mobile)
State: 🟡 partial.
- Uses `OrdersList` (just split into card-only). Consistent with home.
- Header is ad-hoc `<h1>` — not yet on `<PageHeader>`. No filters / no empty-state visual (plain `<p>`).
- **Weak spot:** no sense of "past vs current" separation here — everything stacks. The home page got the `<details>` collapse; this page didn't. Decide whether the dedicated history page keeps past flat (simpler) or inherits the same collapse.

### `/portal/[token]/account` — Account
State: 🟡 partial.
- Token info + sign-out present. Uses tokens + `Button`, but layout is a single left-aligned column with no card framing — reads as "debug screen" next to the polished home.
- **Next pass:** `<PageHeader>` + grouped `<Card>` sections (Profile, Delivery address, Sign out), and this is where the nav-bar Account link should land once home's nav is removed.

---

## Customer navigation

**Landed 2026-04-17:** `<PortalTopBar>` ([components/layout/portal-top-bar.tsx](../components/layout/portal-top-bar.tsx)) is now the single portal header — title left, icon-only account dropdown right. The old mobile bottom nav + desktop top nav (`customer-nav.tsx`) is no longer mounted in the portal layout. Sub-screens (order builder, order history, account) inherit the same bar, giving a consistent home-link affordance. Old `customer-nav.tsx` file remains for now; delete in a follow-up sweep.

---

## Auth & outcome screens

### `/auth/login` — Salesman sign-in
State: 🟡 partial.
- Uses tokens, button variants, updated modal tokens don't apply (not a modal surface).
- Layout is a plain centered form. Works, but unbranded: no logo, no "Universal Beverages" wordmark, no reassurance copy. Reads identical to any shadcn starter.
- **Next pass:** brand the login surface (wordmark + one-line tagline), and decide whether to move salesman login off `/auth/login` so the URL doesn't overlap with a future customer login.

### `/auth/reset-password`, `/auth/reset-email-sent`, `/auth/reset-success`
State: ✅ on-system.
- Reset-success + reset-email-sent both use `<OutcomeScreen>` — consistent tone/shape, correct.
- `/auth/reset-password` is still a plain form (see login note above).

### `/auth/accept-invite`, `/auth/first-admin`
State: 🟡 partial.
- Functional forms, pre-sweep visual. Low-traffic surfaces (first-admin runs once), so defer unless the login rebrand covers them.

### `not-found` (404)
State: ✅ on-system.
- `<OutcomeScreen>` — correct tone, consistent with invalid-token.

---

## Admin surface (`/admin/*`)

All admin pages inherited the token primitives via the P0 sweep but **none have been through an opinionated redesign pass**. The common shape today: `<PageHeader>` at top (mostly), a table of records below, and actions as inline `<Button size="sm">`. It's functional and consistent — but it reads as "CRUD admin" rather than "operational dashboard a salesman uses from a warehouse floor on their phone."

### `/admin/dashboard`
State: 🟡 partial.
- `<StatCard>` grid at top — the design system's strongest admin moment. Looks deliberate.
- Below that, recent-orders table is dense and desktop-only friendly. No mobile story.
- **Next pass:** define what a salesman actually needs to see first thing in the morning (today's deliveries? drafts to push? reorder prompts?) and make that the hero, not generic stats.

### `/admin/orders`, `/admin/orders/[id]`
State: 🟡 partial.
- List view: dense table, filters work, `<StatusChip>` consistent.
- Detail view: two-column (items + meta) with `<Money>`. Edit affordances are fine but there's no clear "what do I do next with this order" CTA (submit, assign delivery, mark delivered).
- **Next pass:** detail view needs a top action bar with the one primary verb for current status.

### `/admin/customers`, `/admin/customers/[id]`, `/admin/customers/[id]/products`
State: 🟡 partial.
- List is a table with search; detail is tabbed (Profile / Orders / Products) but tabs are plain links, not the `<Tabs>` primitive. Per-customer product override page is a dense table with inline edits.
- **Weak spot:** no empty state on the products override page ("no overrides yet — inherited from catalog" message would carry a lot).

### `/admin/catalog`, `/admin/catalog/[id]`, `/admin/catalog/pallets`, `/admin/catalog/pallets/[id]`
State: 🟡 partial.
- Product & pallet management. No product imagery anywhere — even though the customer-facing redesign is about to depend on images, admin has no surface to upload or preview them. This is a structural gap, not styling.
- Detail forms are long single-column with inline saves.

### `/admin/brands`
State: 🟡 partial.
- Simple CRUD table. Fine for now.

### `/admin/staff`
State: 🟡 partial.
- Invite + role management. Works. Same "generic CRUD" feel.

### `/admin/reports`
State: 🟡 partial.
- Report picker + date range + table export. Functional but visually flat — no charts, no emphasis on "this is the part you look at on Monday morning."
- **Next pass:** decide whether reports deserves a chart-forward redesign or stays as an export tool.

---

## Cross-cutting observations

1. **`<PageHeader>` adoption is uneven.** Most admin pages use it; `/portal/[token]/orders`, `/portal/[token]/account`, and some admin detail sub-routes still have ad-hoc `<h1>`. Sweep item.

2. **`<EmptyState>` is under-used.** Empty lists currently render plain `<p class="text-muted-foreground">No X yet.</p>`. Every list surface should use the primitive so the tone is consistent.

3. **No product imagery anywhere.** Customer order-builder redesign assumes it — admin catalog has no upload surface yet. This blocks the order-builder visual direction.

4. **Admin has no mobile story.** Every admin page is a table. If salesmen work from phones (warehouse, driver), this is a design-phase question, not a styling fix.

5. **Login surfaces are unbranded.** Whole product has zero wordmark / identity right now — "Universal Beverages" lives in copy but not as a visual mark. The next design phase should produce a one-line logotype before the login rebrand.

6. **Modal system is solid** — glass blur + centered creation / mobile bottom-sheet confirm is working across Dialog and AlertDialog. No outstanding modal work.

7. **Button width rule is holding.** Post-sweep audit of `w-full` on buttons: only the bottom-sheet confirm rows + mobile form-submit patterns remain. Any new `w-full` in PRs should be treated as a regression.

---

## Next-phase priority (recommended order)

1. ~~**Customer nav redesign**~~ — ✅ landed 2026-04-17 (`PortalTopBar`).
2. ~~**Product imagery**~~ — already wired: `products.image_url` + `pallets.image_url` columns exist, admin uses `<ImageUploadField>`, storage folder `products`. Not a blocker. (Correction to prior note.)
3. **Customer order-builder rebuild** — the redesign this whole pass has been leading to. Imagery is ready to consume.
4. **Customer `/orders` + `/account` polish** — once nav is sorted.
5. **Login / auth rebrand** — wordmark + branded login surface.
6. **Admin opinionated pass** — dashboard hero, order-detail action bar, catalog with imagery. Lowest priority per user posture ("customer first").

Round-2 bug-level items remain tracked in [docs/st-9-round-2-issues.md](./st-9-round-2-issues.md).
