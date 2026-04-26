# Promo & Portal Roadmap — Wiring → Design → Build

> **⚠️ Status: most of this roadmap shipped.** The Wiring + Design phases
> are complete. The Build phase (B1–B9) mostly shipped — see
> `docs/handoff/state-and-next-steps-2026-04-26.md` §6 for per-item status,
> and §4 of that doc for the current "what's next" list. Schema decisions
> in §5 have all been implemented and in some cases superseded
> (`customer_announcements` was rebuilt as `announcement_overrides` with a
> two-tier cascade — see migration `202604260006`). Preserved here for the
> design rationale and the architecture record.

A first-principles roadmap derived from schema and code, not from
earlier design intent. This doc governs *what to build next, in what
order, and why*.

The structure is: **Part 1** names the people and the flows that drive
the work. **Parts 2–4** are the three phases — Wiring, Design, Build.
**Part 5** is the resolved decisions that shape Phase 1 and Phase 3.

Companion doc: [`2026-04-26-flows-and-wireframes.md`](2026-04-26-flows-and-wireframes.md)
walks each flow screen-by-screen with wireframes for anything new.

A note on honesty: every "today: real" claim in this doc was verified
by reading the cited file in this session. Every "today: mock" or "0%
persisted" claim was confirmed by grep. Where I had it wrong before,
the correction is called out inline.

---

## Part 1 — Who and what

### The customer

One row in `profiles` per business, `role = 'customer'`. They reach
the portal via a 32-char hex token in the URL
([`lib/server/customer-auth.ts:15`](../../../lib/server/customer-auth.ts#L15)),
no password, no signup. The token is the entire identity.

What the schema says about them
([`db/migrations/202604150001_public_baseline.sql:6-24`](../../../db/migrations/202604150001_public_baseline.sql#L6))
plus three follow-up migrations:

- `business_name`, `contact_name`, contact fields, address.
- `show_prices` (default true) — gates whether prices render.
- `custom_pricing` (default false) — flag for negotiated pricing.
- `default_group` ('brand' | 'size') — the customer's catalog browse
  preference.
- `tags text[]` — audience tags for announcement targeting
  ([`202604230001_profiles_tags_location.sql`](../../../db/migrations/202604230001_profiles_tags_location.sql)).
- `location`, `location_lat`, `location_lng` — geo data.
- `disabled_at` — soft-delete flag
  ([`202604160001_staff_invites.sql:2`](../../../db/migrations/202604160001_staff_invites.sql#L2)).

What they accumulate over time:

- **Orders** (`orders` table). Status enum: `'draft' | 'submitted' |
  'delivered'`. One draft per (customer_id, delivery_date) enforced
  by partial unique index
  ([`baseline.sql:148-150`](../../../db/migrations/202604150001_public_baseline.sql#L148)).
- **Order items** (`order_items` table) — product OR pallet_deal,
  mutually exclusive ([`baseline.sql:117-120`](../../../db/migrations/202604150001_public_baseline.sql#L117)).
  Totals auto-recalc via trigger.
- **Customer-product preferences** (`customer_products`):
  `is_usual`, `is_pinned`, `is_hidden`, `excluded`, `custom_price`.
- **Browse preferences** (`customer_brands`, `customer_sizes` — pinned/hidden per category).

I had nothing about `office_email` driving customer behavior, because
**it doesn't.** That column is on the salesman's profile, queried
only on admin surfaces
([`app/(admin)/admin/settings/page.tsx:10-14`](../../../app/(admin)/admin/settings/page.tsx#L10),
[`app/api/admin/account/route.ts:7-41`](../../../app/api/admin/account/route.ts#L7),
[`app/(admin)/admin/orders/[id]/page.tsx:128-134`](../../../app/(admin)/admin/orders/[id]/page.tsx#L128)).
There is no schema support for a back-office secondary contact on the
customer side. Earlier designs that leaned on it were wrong.

**One persona, two states:** *first-visit* (no draft, no usuals, no
history) and *returning*. The schema doesn't distinguish them — the UI
does, and that's what shapes the screen.

### The salesman

`profiles.role = 'salesman'`. Provisioned by other salesmen via the
invite flow ([`lib/server/staff-invites.ts`](../../../lib/server/staff-invites.ts)).
They sign in by email/password, sessioned by cookie. They see *every*
customer and *every* product — no scoping.

**Critical absence:** there is **no `profiles.created_by`**. I confirmed
by grepping `db/migrations/`: the only `created_by` column lives on
`staff_invites` (which salesman invited which other salesman). Customers
have no salesman link in the schema. Today the customer-portal layout
hardcodes "Dave Garcia / +15551234567"
([`app/(portal)/portal/[token]/layout.tsx:81-84`](../../../app/(portal)/portal/[token]/layout.tsx#L81))
because there's nothing to query. Every "your salesman" surface is
fiction until that column lands.

**Two job-modes that exist or near-exist today:**

- **Onboarder** — fully real. Invites peers, runs CSV imports/exports
  for customers and products, manages pallet deals + presets.
- **Marketer** — UI exists, **0% persisted**. Authoring an
  announcement mutates React state and disappears on refresh
  ([`components/admin/announcements-manager.tsx`](../../../components/admin/announcements-manager.tsx)
  has 4× `// TODO` mock-mutation sites at lines 76, 85, 91, 136).

A third (Account-rep — pin a note to one customer) has zero
infrastructure today; covered in §5 as a gap, not a flow.

### The flows we'll work against

Customer-side, six total. Walked tap-by-tap in **Phase 2 (Part 3)**:

- **C1 — Resume + submit** (the dominant Tuesday-morning flow)
- **C2 — First-time submit** (no draft, no usuals, no history)
- **C3 — Promo-tap → in draft** (the salesman's lever)
- **C4 — Manage usuals** (catalog-editor mode)
- **C5 — Reorder a past order** (clone path)
- **C6 — Adjust quantities mid-draft** (autosave path)

Salesman-side, two:

- **S1 — Onboard a new customer** (real today)
- **S2 — Author an announcement** (UI today, 0% persisted)

S3 (per-customer pinned content) is in §5, not in the flows table — it
has no schema, no API, no UI, and listing it as a flow would inflate
the "what works" surface in the reader's head.

---

## Part 2 — Phase 1: Wiring

The schema + API work that has to ship before the design phase even
makes sense. Each item has: what + which flow it unblocks + file:line
evidence + acceptance check + can-run-in-parallel-with-Phase-2 marker.

### W1 — Migration: `profiles.created_by uuid references profiles(id)`

- **Unblocks:** the salesman-name surface in the portal layout, and
  is a prerequisite for any per-customer content scoping (§5).
- **Evidence:** [`app/(portal)/portal/[token]/layout.tsx:81-84`](../../../app/(portal)/portal/[token]/layout.tsx#L81)
  hardcodes `{ name: 'Dave Garcia', phone: '+15551234567' }` because
  the column doesn't exist. Grep of `db/migrations/` confirms only
  `staff_invites.created_by` exists.
- **Acceptance:** column exists, nullable, references `profiles(id)`.
  Backfill leaves NULL. Layout reads the column and falls back to a
  generic "Your salesman" string when null (so the change is
  non-breaking before existing customers are backfilled).
- **Ships:** before Phase 2 starts (Phase 2 designs against the
  post-migration state).

### W2 — Migration: `announcements` + `customer_announcements` tables

- **Unblocks:** S2 entirely. Removes the entire mock layer
  (`lib/mock/announcements.ts`).
- **Evidence:** the file is 192 lines of seed data and exists only
  because the table doesn't.
- **Acceptance:** `announcements` table maps 1:1 to the existing
  TypeScript `Announcement` interface in
  [`components/portal/announcements-stack.tsx`](../../../components/portal/announcements-stack.tsx).
  Schema:
  ```sql
  create table announcements (
    id                       uuid primary key default gen_random_uuid(),
    content_type             text not null check (content_type in
                               ('text','image','image_text','product','specials_grid')),
    title                    text,
    body                     text,
    image_url                text,
    cta_label                text,
    cta_target_kind          text check (cta_target_kind in ('products','product','url')),
    cta_target_url           text,
    cta_target_product_id    uuid references products(id) on delete set null,
    cta_target_product_ids   uuid[] not null default '{}',
    product_id               uuid references products(id) on delete set null,
    product_ids              uuid[] not null default '{}',
    badge_overrides          jsonb not null default '{}',
    audience_tags            text[] not null default '{}',
    starts_at                date,
    ends_at                  date,
    is_active                boolean not null default true,
    sort_order               integer not null default 0,
    created_at               timestamptz not null default now(),
    updated_at               timestamptz not null default now()
  );
  create index on announcements (sort_order);
  create index on announcements (is_active, starts_at, ends_at);
  create index on announcements using gin (audience_tags);
  ```
  `customer_announcements` schema is the one in
  [§5 D1 below](#d1--per-customer-overrides--dedicated-customer_announcements-table)
  — `(customer_id, announcement_id)` PK, `is_hidden`, `pin_sort_order`,
  `on delete cascade` from both parents. Hard-delete only
  ([D2](#d2--announcement-deletion--hard-delete)).
- **Ships:** before Phase 2 starts. Phase 2's S2 walkthrough
  designs against this schema.

### W3 — API: `/api/admin/announcements/[POST | PATCH | DELETE | reorder]`

- **Unblocks:** S2 (replaces all 4 `// TODO` sites in
  [`announcements-manager.tsx:76,85,91,136`](../../../components/admin/announcements-manager.tsx#L76)).
- **Evidence:** `Glob` of `app/api/admin/**/route.ts` confirms zero
  routes under `app/api/admin/announcements/` today.
- **Acceptance:** local-state mutations in
  `announcements-manager.tsx` swap to fetch calls. Optimistic UI
  with rollback on error.
- **Ships:** depends on W2; can ship in parallel with the rest of
  Phase 2.

### W4 — RSC swap: stop calling `getHydratedMockAnnouncements`

- **Unblocks:** all C-flow surfaces that show announcements (today
  every customer reads the same 5 mocks).
- **Evidence:** three call sites import from
  [`lib/mock/announcements.ts`](../../../lib/mock/announcements.ts) —
  the homepage RSC, the promo-route RSC, the admin-list RSC.
- **Acceptance:** mock file deletes; three RSCs query the table
  directly with the audience filter from W5.
- **Ships:** depends on W2 + W3 + W5.

### W5 — Audience-tag filter + per-customer override join on the portal-side query

- **Unblocks:** C3 targeting honesty (today every customer sees
  every promo, even with the schema in place this would happen
  without the filter) **and** the per-customer hide/pin behavior
  the salesman authors via D1.
- **Evidence:** the breakdown doc §6.3 specifies a simpler query
  but it isn't built; the join shape is determined by D1.
- **Acceptance:** the query in
  [§5 D1 above](#d1--per-customer-overrides--dedicated-customer_announcements-table)
  — left-joins `customer_announcements`, applies audience filter
  + active-window filter + `coalesce(is_hidden, false) = false`,
  orders by `coalesce(pin_sort_order, sort_order) asc`.
- **Ships:** lands with W4.

### W6 — Replace `window.alert` paths in `start-order-drawer.tsx:121-138`

- **Unblocks:** C5 (reorder path), C2 (scratch path), and the usuals
  path that C1's "I want a fresh draft this week" hits.
- **Evidence:** I verified the 3 `window.alert` calls at lines 126,
  131, 135 ([`start-order-drawer.tsx`](../../../components/portal/start-order-drawer.tsx#L121)).
  The `clone_order(source_order_id, new_delivery_date)` SQL function
  already exists in the baseline migration; the
  [`/api/portal/orders/[id]/clone`](../../../app/api/portal/orders/[id]/clone/route.ts)
  endpoint already wraps it. The plain "create draft" already exists
  at [`/api/portal/orders`](../../../app/api/portal/orders/route.ts) POST.
  **Only the "apply usuals" SQL helper is missing.**
- **Acceptance:** all 3 paths route to existing endpoints + the new
  usuals helper. `window.alert` strings disappear entirely from
  the file.
- **Ships:** can run in parallel with Phase 2 design work — this is
  pure replacement, the design is settled.

### W7 — Image upload bucket for the announcements folder

- **Unblocks:** S2 ergonomics. Today salesmen paste a URL.
- **Evidence:** `image_url` is a plain `<Input>` in
  [`components/admin/announcement-dialog.tsx:339`](../../../components/admin/announcement-dialog.tsx#L339)
  with a `// TODO: replace with ImageUploadField` comment.
- **Acceptance:** announcements dialog uses `<ImageUploadField>` —
  the same primitive used in the catalog admin (need to confirm
  exists; if not, building it is part of this item).
- **Ships:** can ship in parallel with Phase 2.

### What is NOT a Phase-1 item (correction)

I had `/api/admin/customers/[id]` PATCH on the wiring list. **It already
exists** ([`app/api/admin/customers/[id]/route.ts`](../../../app/api/admin/customers/[id]/route.ts))
with full Zod schema, and the customer-edit form calls it
([`app/(admin)/admin/customers/[id]/edit/customer-edit-form.tsx:51`](../../../app/(admin)/admin/customers/[id]/edit/customer-edit-form.tsx#L51)
on PATCH, line 87 on DELETE). The earlier audit was wrong about this
one. Item dropped.

### Phase-1 dependency graph

```
W1 ──────────────────────────────────► (W6 can also start)
W2 ─► W3 ─► W4 ◄──── W5
                ▲
                └─── (W4 also consumes W5)
W7 ───────────────────────────────────► (parallel)
```

Critical path: **W2 → W3 → W4** (about a day each if uneventful).
W1, W6, W7 are independent and can land in any order or in parallel.

---

## Part 3 — Phase 2: Design

The 8 flows walked tap-by-tap. For each: entry state → action → tap
budget → today vs. target → open questions for Phase 3.

Tap-budget convention: **best** = customer/salesman is fluent and
takes the shortest path. **acceptable** = anything more is a regression.

### C1 — Resume + submit (the dominant flow)

**Entry state:** customer opens the portal homepage. Has at least one
draft.

**What's in front of them:**
[`HomepageStartSection`](../../../components/portal/homepage-start-section.tsx)
renders a big accent "Resume draft for {date} · {N items} →" block.
If multiple drafts: primary as the accent block, others below.

**Action:** tap Resume → drops into the order builder
([`OrderBuilder`](../../../components/catalog/order-builder.tsx)).
Adjust qty (autosaves on each change via
[`useAutoSavePortal`](../../../lib/hooks/useAutoSavePortal.ts), 300ms debounce).
Tap Review → the cart-bar lifts into the review drawer
([`CartReviewSurface`](../../../components/catalog/cart-review-surface.tsx)).
Tap Submit → PATCH `/api/portal/orders/[id]/status` with
`{status: 'submitted'}` → redirect to `/portal/[token]/orders`.

**Tap budget — best: 4** (Resume → adjust → Review → Submit).
**Acceptable: 6** (with one or two extra adjustments).

**Today vs. target:** **real, end to end.** Verified
[`order-builder.tsx`](../../../components/catalog/order-builder.tsx) +
[`cart-review-surface.tsx`](../../../components/catalog/cart-review-surface.tsx) +
[`/api/portal/orders/[id]/status/route.ts`](../../../app/api/portal/orders/[id]/status/route.ts).
The submit handler checks `ALLOWED_TRANSITIONS` (draft↔submitted),
sets `submitted_at = now()`. Customers can cancel back to draft.

**Phase-3 question:** none.

### C2 — First-time submit

**Entry state:** brand-new customer. No drafts. No usuals. No history.
Was created by a salesman, just clicked their portal link.

**What's in front of them:** the homepage's "no drafts" state — single
big accent "Start an order →" button
([`homepage-start-section.tsx:39-57`](../../../components/portal/homepage-start-section.tsx#L39)).

**Action:** tap → opens `<StartOrderDrawer>`
([`start-order-drawer.tsx`](../../../components/portal/start-order-drawer.tsx))
as a bottom-sheet panel. Pick a delivery date (defaults to next
available). Three paths:
*Reorder a recent order* (empty list — none yet).
*Add usuals* (disabled — usualsCount is 0).
*Start with empty draft* — this is what works.

**Tap budget — best: 3** (Start order → date is fine → Start empty)
+ then C1's 4 = **7 total** to first submit.
**Acceptable: 9.**

**Today vs. target:** **partial.** Drawer renders the right shape, but
"Start empty" still fires `window.alert` at
[`start-order-drawer.tsx:135`](../../../components/portal/start-order-drawer.tsx#L135).
**Blocked on W6.** Once that lands, this flow is fully real.

**Phase-3 question:** the empty-draft case for a new customer arriving
with no history is currently treated identically to the empty-draft
case for a returning customer who wants a fresh weekly start. Is that
right, or should first-visit get a different drawer (e.g., "build your
usuals first" CTA)? Default position: **same drawer** — minimum
surface, no special-casing. Surface a one-line "💡 First time? Browse
the catalog and tap ⭐ to mark items as usuals" hint inside the drawer
when `usualsCount === 0` *and* `recentOrders.length === 0`. Cheap, no
new surface.

### C3 — Promo-tap → in draft

**Entry state:** customer on homepage. Sees an announcement card in
the "For you" stack.

**What's in front of them:** one of five card types
([`AnnouncementCard`](../../../components/portal/announcement-card.tsx)).
Editorial cards (text/image/image_text) carry a CTA button.

**Action — for editorial cards with `cta_target_kind in
('product','products')`:** tap CTA → opens `<PromoSheet>` drawer over
the homepage → pre-select items → tap "Add to order" → bulk-save into
primary draft → drawer closes → toast confirms. See
[flows-and-wireframes C3.2](2026-04-26-flows-and-wireframes.md) for
the screen-by-screen.

**Architecture change:** the current `/promo/[id]` route is being
**deleted** in B8. It opened in a new page with no commit affordance —
stepper taps autosaved silently and the only exit was a back button.
The drawer model gives the customer pre-select + explicit commit, and
keeps them on the homepage so the "I tapped that announcement" mental
model stays intact.

**Sub-flow — has draft:** stepper taps inside the drawer mutate local
state. Tap "Add to order" → bulk PUT to
[`/api/portal/orders/[id]/items`](../../../app/api/portal/orders/[id]/items/route.ts)
→ drawer closes.

**Sub-flow — no draft yet:** stepper taps still mutate local state.
The commit button label changes to "Start a Tuesday order" with a
date sub-line (tappable to change). Tap → POST
[`/api/portal/orders`](../../../app/api/portal/orders/route.ts) with
the picked date → bulk PUT items → drawer closes.

**Action — for product spotlight (inline):** tap "Add to order" → qty
becomes 1 in place. **Has draft path: works.** **No-draft path: fires
`window.alert`** at
[`announcement-card.tsx:218-224`](../../../components/portal/announcement-card.tsx#L218).
Blocked on a Phase-3 build item.

**Action — for specials grid:** stepper tap on a tile. **Today: local
state only.** `setQty` mutates a `Record<string, number>` and never
talks to the server
([`announcement-card.tsx:309-313`](../../../components/portal/announcement-card.tsx#L309)).
Blocked on a Phase-3 build item.

**Tap budget — best: 2** (tap card → tap stepper).
**Acceptable: 3.**

**Today vs. target:** **mixed; route surface is being replaced.**
- Editorial card → /promo route: **real today, but being replaced by
  the drawer (B8).** The route works mechanically but the UX is wrong
  — silent autosave, no commit signal, back button as only exit.
  Surface is deleted as part of B8.
- Spotlight inline (has draft):
  [`announcement-card.tsx:213-227`](../../../components/portal/announcement-card.tsx#L213)
  uses `useState(0)` with no autosave call. Qty doesn't persist.
  **Mock.**
- Spotlight no-draft: **mock** (`window.alert`).
- Specials grid: **mock** (local state only).

**Resolved during wireframing:** the spotlight keeps its
inline-conversion model (B2) rather than opening the drawer. The
drawer is specifically for the "2+ products to choose from" case;
spotlight shows one product, so there's nothing to "pre-select" and
bulk-commit doesn't add value.

### C4 — Manage usuals

**Entry state:** customer on `/portal/[token]/catalog` (reached via
the bottom nav).

**What's in front of them:**
[`ManageUsualsList`](../../../components/portal/manage-usuals-list.tsx) —
all catalog products with three filter tabs (All / My usuals / Not in
usuals) and a star toggle per row.

**Action:** tap star → optimistic toggle → PATCH `/api/portal/usuals` →
on error, rollback.

**Tap budget — best: 1 per item** (no review, no batch).

**Today vs. target:** **real.** Verified
[`/api/portal/usuals/route.ts`](../../../app/api/portal/usuals/route.ts)
exists. Optimistic UI + rollback per the manage-usuals-list source.

**Phase-3 question:** none.

### C5 — Reorder a past order

**Entry state:** customer on `/portal/[token]/orders` (Order History).

**What's in front of them:**
[`OrderHistoryList`](../../../components/portal/order-history-list.tsx)
with eye-icon Preview + Reorder button per row.

**Action:** tap Reorder → POST `/api/portal/orders/[id]/clone` with
tomorrow's date → redirect to new draft. Or tap Preview → bottom-sheet
with line items → "Reorder these items" footer button.

**Tap budget — best: 1** (Reorder direct).
**Acceptable: 3** (Preview → check → Reorder).

**Today vs. target:** **real, verified.** Clone endpoint exists
([`/api/portal/orders/[id]/clone/route.ts:11-30`](../../../app/api/portal/orders/[id]/clone/route.ts#L11)).
Items endpoint for the preview exists too.

**Note:** the "Reorder from drawer" flow inside `<StartOrderDrawer>`
hits `window.alert` instead. Blocked on W6. The Order History flow is
the working one today.

**Phase-3 question:** should W6's drawer-reorder land on the same
existing draft if one is in progress, or always create a new one?
Default: **conflict-replace dialog already exists** (the
[`ConfirmReplaceDialog`](../../../components/portal/start-order-drawer.tsx#L302)),
just needs the actual replace logic.

### C6 — Adjust quantities mid-draft

**Entry state:** customer in the order builder. Already has items.

**What's in front of them:** product tiles with floating steppers
([`ProductTile`](../../../components/catalog/product-tile.tsx) +
[`Stepper`](../../../components/ui/stepper.tsx)).

**Action:** tap +/- on a stepper. Each tap mutates local state;
debounced 300ms then writes via `useAutoSavePortal`. Qty 0 → DELETE.

**Tap budget — best: 1 per change.**

**Today vs. target:** **real.** Verified
[`useAutoSavePortal.ts`](../../../lib/hooks/useAutoSavePortal.ts) end
to end. One known soft spot:
[`useAutoSavePortal.ts:122,151`](../../../lib/hooks/useAutoSavePortal.ts#L122)
silently swallows in-flight save failures with `.catch(() => undefined)`
if the component unmounts during a debounce. Customer never sees an
error in that window. **Phase-3 question:** wire a "saved" status
indicator that turns red on swallow, or accept the silent-swallow for
unmount?

### S1 — Onboard a new customer

**Entry state:** salesman signed in to admin. On `/admin/customers`.

**What's in front of them:** customer directory + "+ New customer"
button.

**Action — create:** form (business_name, contact_name, email, phone,
address, tags, location). Submit → POST `/api/admin/customers/bulk`
(verified
[`route.ts`](../../../app/api/admin/customers/bulk/route.ts) exists,
cited in earlier exploration; CSV import is the standard path).
The single-add form ultimately calls
[`/api/admin/customers/[id]`](../../../app/api/admin/customers/[id]/route.ts)
PATCH after the bulk insert returns the id, or directly via the bulk
endpoint with one row.

**Action — assign token:** today the `access_token` is generated and
stored on the profile. The salesman shares the URL via SMS/email
(out-of-band; not a UI flow).

**Tap budget — best: ~8** (open New → 6 fields → Save → copy link).
**Acceptable: 12.**

**Today vs. target:** **mostly real.** PATCH endpoint verified
([`/api/admin/customers/[id]/route.ts:30-40`](../../../app/api/admin/customers/[id]/route.ts#L30)).
The customer-edit form wires to it
([`customer-edit-form.tsx:51,87`](../../../app/(admin)/admin/customers/[id]/edit/customer-edit-form.tsx#L51)).
Pallet-deal CRUD endpoints verified
([`/api/admin/pallet-deals/route.ts:5-26`](../../../app/api/admin/pallet-deals/route.ts#L5)).
Bulk import and CSV export endpoints verified by Glob.

**Gap:** there's no "set salesman as `created_by`" step today (W1
unblocks it). Once W1 lands, the create-customer endpoint should
default `created_by = currentSalesmanId`.

**Phase-3 question:** does single-customer-add need its own UI, or
does CSV import cover the salesman's needs? Default: **add a single
"+ New" form** that posts to the bulk endpoint with one row — the
endpoint already exists and supports it.

### S2 — Author an announcement

**Entry state:** salesman on `/admin/announcements`.

**What's in front of them:**
[`AnnouncementsManager`](../../../components/admin/announcements-manager.tsx) —
sortable list of announcement rows + "+ New" top-right.

**Action:** tap "+ New" → 2-step
[`AnnouncementDialog`](../../../components/admin/announcement-dialog.tsx).
Step 1: pick content type (Text / Image+text / Image / Product
spotlight / Specials grid). Step 2: type-specific fields + audience
tags + dates + active flag. Save.

**Tap budget — best: ~8** (image+text with single CTA target).
**Worst: ~14** (specials grid with 5 products + audience).

**Today vs. target:** **0% persisted.** UI is fully built — the
dialog, the picker, the destination chooser, the validation. The
manager's `handleSave`, `moveRow`, `toggleActive`, `removeRow` all
mutate React state only. Verified 4 `// TODO` sites at
[`announcements-manager.tsx`](../../../components/admin/announcements-manager.tsx)
lines 76, 85, 91, 136. No `/api/admin/announcements/*` route exists
(verified by Glob).

**Blocked on W2 + W3.**

**Phase-3 question:** when the salesman saves a new announcement with
audience-tags and starts_at in the future, the Save button label
should say "Schedule" not "Save & publish." That micro-copy is doing
the work of three confirmation modals. Worth doing.

---

## Part 4 — Phase 3: Build

Concrete component-level work. Each item names the Phase-2 flow it
satisfies, the files involved, and the primitives it reuses.

### B1 — Spotlight no-draft date picker

- **Satisfies:** C3 (Spotlight no-draft sub-flow).
- **Files:** [`components/portal/announcement-card.tsx`](../../../components/portal/announcement-card.tsx)
  `ProductSpotlightCard.handleAddPress` (line 218).
- **Primitives reused:** `<Panel variant="bottom-sheet">`, the
  date-picker pattern from `<StartOrderDrawer>`, the
  ensure-draft-then-bulk-save pattern from `<PromoSheet>` (B8).
- **Test surface:** click "Add to order" with no draft → bottom sheet
  appears → pick date → draft created → qty set to 1 → autosave.
- **Depends on:** W6 (or equivalent — could be done first as a
  one-off).

### B2 — Spotlight inline autosave

- **Satisfies:** C3 (Spotlight has-draft sub-flow). I had this as
  "real" in the narrative; verified today it isn't —
  [`announcement-card.tsx:213`](../../../components/portal/announcement-card.tsx#L213)
  uses local `useState(0)` and never calls autosave.
- **Files:** same component.
- **Primitives reused:** `useAutoSavePortal` hook, threaded with
  `primaryDraftOrderId` from the parent.
- **Test surface:** with an existing draft, tap Add → qty 1 → tap +
  → qty 2 → reload page → qty 2 still there.

### B3 — Specials-grid autosave wiring

- **Satisfies:** C3 (Specials grid per-tile sub-flow).
- **Files:** [`announcement-card.tsx`](../../../components/portal/announcement-card.tsx)
  `SpecialsGridCard.setQty` (line 309).
- **Primitives reused:** `useAutoSavePortal` per tile, with the same
  null-orderId / resolved-orderId split pattern that the catalog's
  `<ProductTile>` uses elsewhere. (The grid does *not* adopt the
  drawer's pre-select model — it lives inline on the homepage and
  needs to autosave per-tap to match the rest of the announcements
  stack.)
- **Test surface:** tap stepper on a specials grid tile → reload →
  qty persists.

### B3+ — "Add all" bulk action on `SpecialsGridCard`

- **Satisfies:** C3 (Specials grid bulk sub-flow). Pairs with B3.
- **Files:** [`announcement-card.tsx`](../../../components/portal/announcement-card.tsx)
  `SpecialsGridCard` — render an action button below the grid.
- **Behavior:** dynamic label —
  `Add all {N} to my order` (when no tile has qty>0),
  `Add the rest ({N} more)` (when some have qty>0),
  hidden (when all have qty>0). Tap → bulk PUT to
  [`/api/portal/orders/[id]/items`](../../../app/api/portal/orders/[id]/items/route.ts)
  with qty=1 for every product not already at qty>0. No-draft case
  uses the same ensure-draft-then-bulk-save pattern as B8.
- **Primitives reused:** `<Button>`, the bulk-save handler from
  `<PromoSheet>` (B8) — extracted into a small util once we have
  two callers.
- **Test surface:** open homepage with a specials grid → tap "Add
  all 3" → cart bar count goes up by 3 → tap again → button is
  hidden.

### B9 — Callout pills on specials-grid tiles

- **Satisfies:** C3 (Specials grid presentation) and S2 (salesman
  authoring).
- **Why:** the schema column `announcements.badge_overrides` JSONB
  already exists ([W2](#w2--migration-announcements--customer_announcements-tables)).
  No UI exposes it today.
- **Files:**
  - **Customer-side render:**
    [`announcement-card.tsx`](../../../components/portal/announcement-card.tsx)
    `SpecialsGridCard` — render a pill in the top-left corner of each
    tile that has a `badge_overrides[product.id]` entry. Use
    [`<ProductTile>`'s overlaySlot](../../../components/catalog/product-tile.tsx)
    or a simple absolute-positioned span.
  - **Admin-side authoring:**
    [`announcement-dialog.tsx`](../../../components/admin/announcement-dialog.tsx)
    `<CtaDestinationField>` — when a specials-grid product is
    selected, show a small `[ Badge: ___ ]` text input next to its
    chip in the multi-product picker. On submit, persist into the
    `badge_overrides` jsonb.
  - **Picker UI:** extend
    [`<ProductPicker>`](../../../components/admin/product-picker.tsx)
    multi-mode to surface a per-chip badge input when used by
    `SpecialsGridCard`. (Other consumers — e.g. CTA target —
    don't need this.)
- **Pill style:** small, rounded, accent-bg by default. Optional
  destructive-bg for urgency text (cheap heuristic on keywords like
  "last", "today", "ends", or just give the salesman a 2-color
  toggle). Reuses existing color tokens.
- **Test surface:** admin enters "-15%" on Cherry Coke chip → save →
  customer homepage's specials grid shows the "-15%" pill on the
  Cherry Coke tile.

### B4 — Live preview pane in announcement dialog

- **Satisfies:** S2 ergonomics (cuts the salesman's "save then check
  in another tab" round-trip).
- **Files:** [`components/admin/announcement-dialog.tsx`](../../../components/admin/announcement-dialog.tsx)
  — add a right-pane preview rendering `<AnnouncementCard>` with the
  in-progress form values.
- **Primitives reused:** `<AnnouncementCard>` directly. The dialog
  becomes a 2-pane layout on desktop, stacked on mobile.

### B5 — Audience-tag autocomplete

- **Satisfies:** S2 — prevents typos that silently target zero
  customers ("donwtown").
- **Files:** [`components/ui/tag-chip-input.tsx`](../../../components/ui/tag-chip-input.tsx),
  add a `suggestions` prop. Dialog reads distinct tags via a small
  RSC query + passes them down.
- **Primitives reused:** existing `<TagChipInput>`.

### B6 — Reach indicator

- **Satisfies:** S2 — closes the "did I target the right people?"
  loop.
- **Files:** dialog footer, small "{N} customers will see this" line
  under the audience-tag input. Backed by a `GET
  /api/admin/announcements/preview-reach` endpoint that runs the
  query from [§5 D3](#d3--reach-indicator--live-debounced-500ms).
- **Behavior:** live, debounced 500ms. Empty tags → "All N
  customers." Specific tags → "{N} customers (of M)." Zero result
  rendered destructive ("0 customers — check your tags?") to catch
  typos early.
- **Acceptance criteria:** see [§5 D3](#d3--reach-indicator--live-debounced-500ms).

### B7 — Salesman name resolution in the portal layout

- **Satisfies:** the "your salesman" surface across the whole portal.
- **Files:** [`app/(portal)/portal/[token]/layout.tsx:81-84`](../../../app/(portal)/portal/[token]/layout.tsx#L81)
  — replaces the hardcoded const with a join: `select p2.contact_name,
  p2.phone from profiles p2 where p2.id = (select created_by from
  profiles where id = $1)`.
- **Depends on:** W1.
- **Fallback:** when `created_by` is null (legacy customers), use a
  generic "Your salesman" string and a default support phone — define
  a constant in a config file rather than hardcoding here.

### B8 — `<PromoSheet>` drawer (replaces `/promo/[id]` route)

- **Satisfies:** C3 editorial-card-with-product-CTA flow.
- **Why this exists:** the `/promo/[id]` route gives the customer
  no commit affordance — autosave runs silently per stepper tap and
  the only exit is the back button. The drawer replaces that with a
  pre-select + bulk-commit model that matches the rest of the
  portal's interaction grammar.
- **Built on `<CartReviewSurface>`'s shell.** The same Panel-bottom-sheet
  chrome — header with close, scrollable body, sticky-footer-with-button —
  is reused. New code is the body grid + the stateful footer button
  logic.
- **Stateful footer button (the load-bearing UX detail):**
  - 0 selected → `Select products…` (muted, disabled)
  - 1+ selected, has draft → `Added items {N}/{M} — Continue to order page?`
  - 1+ selected, no draft → `Added items {N}/{M} — Start a {Day} order?`
  - `{N}/{M}` = `{tilesWithQty>0} / {totalProductsInPromo}`.
  - On commit: bulk-save items → close drawer → **`router.push` to
    the order builder for the primary draft** (the "Continue to
    order page?" promise). Customer lands in C1.2.
- **Files:**
  - **Create:** `components/portal/promo-sheet.tsx` — new component
    that imports the structural pieces from `<CartReviewSurface>`
    (Panel chrome, header pattern) and adds: a product grid body,
    local selection state, a stateful footer button.
  - **Modify:** [`components/portal/announcement-card.tsx`](../../../components/portal/announcement-card.tsx)
    `<CtaLink>` — for `cta_target_kind in ('product', 'products')`,
    render a `<button>` that opens `<PromoSheet>` instead of a
    `<Link>` to the route.
  - **Delete:** [`app/(portal)/portal/[token]/promo/[id]/page.tsx`](../../../app/(portal)/portal/[token]/promo/[id]/page.tsx)
    and [`components/portal/promo-product-grid.tsx`](../../../components/portal/promo-product-grid.tsx) —
    the route and its grid client component are obsolete.
  - **Reuse:** [`<CartReviewSurface>`](../../../components/catalog/cart-review-surface.tsx)
    chrome, [`<ProductTile>`](../../../components/catalog/product-tile.tsx),
    [`<ProductPopout>`](../../../components/catalog/product-popout.tsx),
    [`<Stepper>`](../../../components/ui/stepper.tsx),
    [`<Panel>`](../../../components/ui/panel.tsx) variant
    `bottom-sheet`.
  - **Refactor opportunity:** if `<CartReviewSurface>`'s chrome
    (Panel + header + scrollable body + sticky footer) is reused
    here, consider extracting it into a shared `<DrawerScaffold>`
    primitive at the same time — `<CartReviewSurface>` becomes
    `<DrawerScaffold>` + line-item body, `<PromoSheet>` becomes
    `<DrawerScaffold>` + grid body. Optional; only do it if the
    extraction stays under ~80 lines.
- **Behavior diff vs current:** stepper taps no longer autosave;
  they mutate local state. Bulk-save fires only on the commit
  button. Closing the drawer without committing discards the
  selection (no warning needed — nothing was sent to the server).
- **RSC consequence:** the homepage RSC must pre-resolve the
  `PromoProduct[]` arrays for each announcement that has a
  product CTA, so opening the drawer is instant. The route did this
  in its own RSC; the homepage RSC needs to take it over.
- **Test surface:** open drawer from each editorial card type;
  pre-select 3 items; tap footer button; verify items land in the
  primary draft and the customer is now in the order builder. With
  no draft: same flow but verify draft creation precedes the items
  insert.

### What's NOT in Phase 3

The Account-rep flow (per-customer pinned content). It needs a
schema decision (covered in §5) and an entire new admin surface. It's
a Phase-4-or-later candidate.

---

## Part 5 — Decisions

The three open questions are resolved as follows. These shape W2 (the
announcements migration) and B6 (the reach indicator).

### D1 — Per-customer overrides → dedicated `customer_announcements` table

Override semantics (hide-globally-but-pin-here,
pin-globally-but-hide-here) need boolean columns, not tags.

```sql
create table customer_announcements (
  customer_id     uuid not null references profiles(id) on delete cascade,
  announcement_id uuid not null references announcements(id) on delete cascade,
  is_hidden       boolean not null default false,
  pin_sort_order  integer,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (customer_id, announcement_id)
);

create index on customer_announcements (customer_id);
```

**Portal-side query** (replaces W5's simpler version):

```sql
select a.*, ca.is_hidden, ca.pin_sort_order
from announcements a
left join customer_announcements ca
  on ca.announcement_id = a.id and ca.customer_id = $1
where a.is_active
  and (a.starts_at is null or a.starts_at <= now())
  and (a.ends_at   is null or a.ends_at   >= now())
  and (a.audience_tags = '{}' or a.audience_tags && $2)
  and coalesce(ca.is_hidden, false) = false
order by coalesce(ca.pin_sort_order, a.sort_order) asc;
```

`pin_sort_order` overrides the global `sort_order` when set —
that's how a salesman pins an announcement to the top for one
customer specifically.

### D2 — Announcement deletion → hard delete

Announcements have no downstream FK references (no `order_items`
references them). Audit trail is the `is_active` flag plus
`created_at`. Soft-delete is overkill.

`customer_announcements.announcement_id` has `on delete cascade`, so
deleting an announcement automatically wipes its per-customer
overrides. Clean.

The admin manager already shows a confirm dialog before delete
([`announcements-manager.tsx`](../../../components/admin/announcements-manager.tsx)
line ~88) — that's the only safety net needed.

### D3 — Reach indicator → live, debounced 500ms

The query is microseconds-fast against the existing
[`profiles.tags` GIN index](../../../db/migrations/202604230001_profiles_tags_location.sql):

```sql
select count(*)::int as reach
from profiles
where role = 'customer'
  and disabled_at is null
  and ($1::text[] = '{}' or tags && $1::text[]);
```

Wired as a small `GET /api/admin/announcements/preview-reach?tags=…`
endpoint. The dialog calls it 500ms after the last tag edit. Empty
tags → "All N customers." Specific tags → "{N} customers (of M)."

**B6 acceptance criteria** (concretized from this decision):

- Endpoint exists and returns `{reach: number, total: number}`.
- Dialog renders the indicator under the audience-tags input.
- Empty input shows total customer count.
- Editing a tag chip re-queries 500ms after the last change.
- Result of zero shows in destructive color ("0 customers — check your
  tags?") to catch typos.

---

## Sequencing summary

```
Phase 1 (Wiring)              Phase 2 (Design)          Phase 3 (Build)
─────────────                  ─────────────              ─────────────
W1 ─────────────────────────────────────────────────────► B7
W2 ─► W3 ─► W4 ◄── W5 ─────► (S2 design honest)  ──────► B4, B5, B6
W6 ──────────────────────────► (C2 / C5 honest)   ──────► (W6 was the build)
W7 ──────────────────────────────────────────────────────► (W7 was the build)
                              (C3 design)  ──────────────► B1, B2, B3
```

Phase 1 takes ~1–2 weeks of focused work. Phase 2 is design review and
spec edits, ~3 days. Phase 3 is the bulk of the build, ~1 week.

Where this differs from the earlier "let's just ship the announcements
table next" instinct: **W6 is the highest-leverage single item**
(unblocks 3 customer flows for the cost of replacing 3 `window.alert`s
with calls to existing endpoints) and should land first or second,
regardless of where it sits in the dependency graph.
