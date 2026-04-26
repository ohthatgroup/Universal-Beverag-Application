# State of the System + Next Steps

Snapshot taken at the end of the 2026-04-26 working session. Replaces
`docs/handoff/homepage-redesign.md` as the current truth — that doc is
preserved for history but most of its TODO entries are now resolved
(see §Resolved-since-handoff below).

This doc is the canonical pointer for "what's wired, what's mocked,
what's the next move." Read this first before picking up another piece
of the system.

---

## §1 What shipped this session

Six commits since `f2c86c3` ("CTA deep-linking to curated product
surfaces"). In commit order:

| # | Commit | What it did |
|---|---|---|
| 1 | `6bbcc26` | **Phase-1 wiring.** `profiles.created_by`, `announcements` + `customer_announcements` tables (later replaced — see #5/#6), admin announcements API CRUD, RSC swaps, `apply_usuals_to_draft` SQL, StartOrderDrawer paths to real endpoints. Killed the last 3 `window.alert`s in the drawer. |
| 2 | `c634765` | **`<PromoSheet>` drawer model.** Every promo banner click opens a bottom-sheet with line-item rows + bulk commit. Replaced the standalone `/promo/[id]` route. |
| 3 | `abe948d` | **Per-product locked qty.** Salesman can preselect quantities + lock per product on a deal/announcement. Renders as a pinned qty pill in the drawer with "Quantity set by your salesman" sub-line. |
| 4 | `2abc612` | **Pallets merged into announcements.** `kind = 'deal' \| 'announcement'`. Dropped `pallet_deals`, `pallet_deal_items`, `order_items.pallet_deal_id`. Backfill landed real "COKE CLASSIC PALLET" data. |
| 5 | `8e9a660` | **Customer Groups + cascading overrides foundation.** New `customer_groups` table + `profiles.customer_group_id` 1:1. Dropped `customer_announcements`. New `announcement_overrides` (`scope` ∈ `'group'\|'customer'`, `is_hidden`, `sort_order`). Resolver: customer override → group override → global default. |
| 6 | `1e24912` | **Groups + overrides UI.** `/admin/customer-groups` list/CRUD page; customer-edit page gains a Group select + per-row override panel; `/admin/announcements` row dropdown adds "Group overrides…" dialog. |

Dead code + lint debt cleared in this cleanup pass:

- Deleted `components/portal/start-order-fork.tsx`, `components/portal/reorder-list.tsx` (zero inbound refs after the StartOrderDrawer became the canonical entry).
- Deleted `components/admin/customer-homepage-manager.tsx` + `app/(admin)/admin/customers/[id]/homepage/page.tsx` (replaced by the override panel inside `/edit`).
- Configured `argsIgnorePattern: '^_'` so intentional underscore-args stop firing unused-var warnings.
- Removed unused `Copy` icon import from `share-submitted-order-menu.tsx`.

**`npm run lint` reports zero warnings or errors. `npm run typecheck` clean. `npm run test` 112/112 passing.**

---

## §2 What works end-to-end today

### Customer side (`/portal/[token]/...`)

- **Homepage** (`page.tsx`) renders the announcement stack with the full cascade resolver applied (customer override → group override → global default).
- **Resume / start order** via the homepage card or `<StartOrderDrawer>`. All three drawer paths — reorder a recent order, apply usuals, start scratch — hit real endpoints (no `window.alert`s anywhere in the customer portal).
- **Promo banner click** opens `<PromoSheet>` with line-item rows. Stepper edits stay local; bulk-commit on the footer button creates a draft if needed and routes to the order builder. URL-target banners still open in a new tab — the only exception.
- **Locked-qty deals** render the qty as a pinned pill instead of a stepper, with the "Quantity set by your salesman" sub-line.
- **Salesman name** ("Call Dave") in the top bar resolves via `profiles.created_by` joined to the salesman's profile. Falls back to a generic "Your salesman" + hidden Call button when no link.

### Salesman side (`/admin/...`)

- **Deals & Announcements** (`/admin/announcements`) — tabs split by `kind` (Announcements / Deals); inside each, Live + Scheduled subgroups. Inline reorder/toggle/delete + the type-picker dialog. Per-row "Group overrides…" dropdown opens a dialog listing every group with hide/show/sort + reset.
- **Customer Groups** (`/admin/customer-groups`) — list + inline create/edit/delete. Member counts surfaced from the join.
- **Customer edit** (`/admin/customers/[id]/edit`) — a "Customer group" select (Targeting section) writes `profiles.customer_group_id`. Below the form, the override panel lists every announcement + deal with resolved order/source label, per-row sort_order input, hide/show toggle, and "Apply Group Default" reset button.
- **Customer onboard, brands CRUD, products list, presets, staff invites, pallet deals (now via announcements UI), orders list** — unchanged from before this session, all real.

### Schema state

8 migrations under `db/migrations/202604260*`:

| File | What it does |
|---|---|
| `202604260001_profiles_created_by.sql` | `profiles.created_by` for the salesman link |
| `202604260002_announcements.sql` | `announcements` table |
| `202604260003_apply_usuals_to_draft.sql` | SQL function for the drawer's usuals path |
| `202604260004_announcements_product_quantities.sql` | `product_quantities jsonb` column for per-product locked qty |
| `202604260005_merge_pallets_into_announcements.sql` | Drops pallet tables + `order_items.pallet_deal_id`; backfills pallets as `kind='deal'` announcements |
| `202604260006_customer_groups_and_overrides.sql` | `customer_groups`, `profiles.customer_group_id`, `announcement_overrides`; drops `customer_announcements` |

**Net schema impact:**
- New: `customer_groups`, `announcement_overrides`, `announcements`, `profiles.customer_group_id`, `profiles.created_by`, `announcements.product_quantities`.
- Dropped: `pallet_deals`, `pallet_deal_items`, `order_items.pallet_deal_id`, `customer_announcements`.

---

## §3 What's still mocked or stubbed

Surveyed via `grep "// TODO\|window.alert"` across the codebase. Just one entry remains, and it's a non-blocking polish item:

| Location | What it is | Severity |
|---|---|---|
| `app/(portal)/portal/[token]/layout.tsx:105` | `// TODO: cutoff-aware utility (see handoff entry 11)`. The "next-next delivery date" is computed as `nextDeliveryDate + 7d`; should use the `OrderCutoff` config + `ProductCutoffOverride` rows so it skips weekends/holidays/per-product cutoffs. | Low — nothing visibly wrong today; matters when the date the drawer hands the customer is wrong by a day. |

That's it. Every other handoff entry from `homepage-redesign.md` has been resolved — see §6.

---

## §4 Next steps (ranked)

In rough leverage-per-hour order. Pick whichever block matches the next session's intent:

### S1 — Per-customer audience-tag intersection on the homepage filter (½ hour)

The `fetchHomepageAnnouncements` resolver applies `(audience_tags = '{}' or audience_tags && profile.tags)`. A salesman could end up with stale tags on a customer that no longer belong to any active deal — silent failure mode. Add a small "audience reach" indicator on the announcement-create dialog (we sketched this as **B6** in the original roadmap; partially built — `<TagChipInput>` doesn't show a count). Concrete:

- Add `GET /api/admin/announcements/preview-reach?tags=...` — count of customers matching those tags + `disabled_at is null`.
- Surface as a sub-line under the Audience Tags input in `<AnnouncementDialog>`. Zero-result rendered destructive ("0 customers — check your tags?").

### S2 — Customer-group bulk-membership management (1–2 hours)

Today you assign a customer to a group on the customer-edit page (one customer at a time). The `/admin/customer-groups` page should allow:
- Click a group → drill into a detail page listing members.
- "+ Add customers" picker (search + multi-select from all `role='customer'` profiles).
- Per-row "Remove from group" button.

Files:
- New `app/(admin)/admin/customer-groups/[id]/page.tsx` (RSC; loads members + non-members).
- New `app/(admin)/admin/customer-groups/[id]/group-members-manager.tsx` (client; multi-select + apply via PATCH /api/admin/customers/[id] with `customerGroupId`).
- Reuse `<ProductPicker>`'s search-as-you-type pattern for the customer picker.

### S3 — Promo dialog: live preview pane (1 hour)

The salesman authors an announcement in `<AnnouncementDialog>` then has to open the customer portal in another tab to verify it looks right. A right-half preview pane rendering `<AnnouncementCard>` with the in-progress form values would close that loop.

Files:
- `components/admin/announcement-dialog.tsx` — split body into 2-col on desktop (`md:grid md:grid-cols-2`).
- Right column: `<AnnouncementCard>` with mock token + the form's resolved values.
- Mobile: collapse to a `[ 👁 Preview ]` button that opens a `<Panel variant="bottom-sheet">`.

### S4 — Cutoff-aware delivery-date utility (1 hour)

The remaining `// TODO` from §3 above. Build `lib/server/cutoff.ts:resolveNextEligibleDate(customerId, after)` that walks the calendar skipping per-customer cutoffs (read `OrderCutoff` + `ProductCutoffOverride`). Use it in `portal/[token]/layout.tsx`'s `nextNextDeliveryDate`.

### S5 — Image upload for announcement banners (1–2 hours)

`<AnnouncementDialog>`'s Image URL field is a plain text input. Catalog uses `<ImageUploadField>` somewhere — extract it to `components/ui/` if it's not already there, then wire into the announcement dialog with folder = `'announcements'`. The R2 bucket allowlist already includes `announcements` (`lib/server/assets.ts`).

### S6 — Audit + drop dead schema columns (½ hour)

After the `customer_announcements` and `pallet_deal_id` removals, `lib/database.generated.ts` is regenerated but I haven't audited every `Database` type consumer for stale column refs. Quick `grep "pallet_deal_id\|customer_announcements"` across the repo to catch any straggler references in test fixtures, scripts, or seeds.

### S7 — Customer onboarding flow polish (longer)

Today you create a customer either via CSV import (`/api/admin/customers/bulk`) or by editing an existing one. There's no dedicated "+ New customer" form. We sketched this in the wireframes doc as a `<Panel variant="centered">` modal with the create form. Useful but not urgent — CSV covers the bulk case.

---

## §5 Architecture notes (for the next reader)

### Override resolver

`fetchHomepageAnnouncements` in `lib/server/announcements.ts` is the single place the cascade runs. It joins `announcement_overrides` twice — once for `scope='customer'`, once for `scope='group'` (matched against the customer's `customer_group_id` resolved inline) — then `coalesce(co.X, go.X, a.X)` per column. Every override column cascades independently; NULL means "inherit from parent scope."

The customer-side filter applies `audience_tags && profile.tags` BEFORE the override join. So a `is_hidden=false` override at the customer scope can't surface an announcement whose audience tags don't match — overrides shape order/visibility within the audience-matched set, not the set itself.

### Group membership = 1:1

Customers belong to *at most one* group via `profiles.customer_group_id`. Multi-group resolution was deliberately rejected to avoid the "which group's override wins?" question. If two segments need to share an override, the salesman puts both customers in the same group.

### Promo drawer (`<PromoSheet>`)

All five announcement card types (`text`, `image`, `image_text`, `product`, `specials_grid`) open the same drawer when clicked. The body is a line-item list (small image + title + pack/price + stepper) matching `<CartReviewSurface>`'s shape. Stepper edits are local; bulk-commit on the footer button does the work.

The footer button is *stateful*:
- 0 selected → `Select products…` (muted, disabled)
- 1+ selected, has draft → `Added items {N}/{M} — Continue to order page?`
- 1+ selected, no draft → `Added items {N}/{M} — Start a {Day} order?`

`{N}/{M}` = (tiles with qty>0) / (total products in promo).

Locked-qty rows render a pinned qty pill instead of a stepper, with the "Quantity set by your salesman" sub-line. Seed precedence:
1. Locked override (forces qty regardless of existing-draft qty)
2. Existing-draft qty
3. Unlocked default_qty
4. 0

### Migration sequence

The `2026-04-26` cluster of 6 migrations went in a specific order:

1. `created_by` (independent)
2. `announcements` table (no FK on `pallet_deals` deliberately — that table goes away in #5)
3. `apply_usuals_to_draft` SQL function (independent)
4. `announcements.product_quantities` (additive)
5. `merge_pallets_into_announcements` (drops 2 tables + 1 column; backfills via SELECT INTO; rewrites `clone_order` to remove `pallet_deal_id` from its insert)
6. `customer_groups_and_overrides` (drops `customer_announcements` after #2 created it; introduces `announcement_overrides`)

If we ever reset and replay all migrations, this order is the correct one (alphabetical → numeric prefix sort handles it).

---

## §6 Resolved since `homepage-redesign.md`

For history. The original handoff doc had 19 entries; here's the count:

| # | Original entry | Status |
|---|---|---|
| 1 | Portal homepage `MOCK_ANNOUNCEMENTS` | ✅ Real DB query via `fetchHomepageAnnouncements` |
| 2 | Portal homepage `MOCK_STATS` | Not addressed this session — `<AccountStatsCard>` was removed entirely from the homepage redesign |
| 3 | Admin announcements page `MOCK_ANNOUNCEMENTS` | ✅ Real query |
| 4 | Admin customer homepage `customerName` | ✅ Page deleted (orphaned) |
| 5 | AnnouncementsManager mutations local-only | ✅ All 4 wired to API |
| 6 | CustomerHomepageManager mock data | ✅ Component deleted; replaced by override panel inside `/edit` |
| 7 | AnnouncementDialog plain-text product fields | ✅ `<ProductPicker>` replaced both raw inputs |
| 8 | AnnouncementDialog plain-text image URL | ⏳ Still a text input — see S5 above |
| 9 | ProductSpotlightCard "Add to order" with no draft | ✅ Replaced by `<PromoSheet>` model |
| 10 | SpecialsGridCard autosave is local-only | ✅ Replaced by `<PromoSheet>` model |
| 11 | `nextNextDeliveryDate` is a 7-day add | ⏳ Still — see S4 above |
| 12 | StartOrderFork path handlers fire `window.alert` | ✅ Component deleted; StartOrderDrawer is real |
| 13 | Confirm-replace dialog doesn't actually replace | ✅ Real (clone endpoint with `?replace=true`) |
| 13a | OrderPreviewSheet line items are mocked | ✅ Real items endpoint |
| 14 | (was 13a) | ✅ |
| 15 | StartOrderDrawer actions all `window.alert` | ✅ Real endpoints |
| 16 | manage-usuals-list hardcoded | ✅ (resolved earlier) |
| 17 | catalog `MOCK_PRODUCTS` | ✅ (resolved earlier) |
| 18 | layout `MOCK_USUALS_COUNT` | ✅ (resolved earlier) |
| 19 | inline-SVG wordmark logo stand-in | ⏳ Still a placeholder — would need a real brand asset |
| 20 | salesman name hardcoded | ✅ `profiles.created_by` join |

Only #2 (account stats card was removed from the design entirely), #8 (image upload — S5), #11 (cutoff-aware date — S4), and #19 (real logo asset — needs the user to provide the file) remain unresolved out of 20.

---

## §7 Files of note

For someone picking this up cold, these are the entry points:

**Customer side:**
- `app/(portal)/portal/[token]/page.tsx` — homepage RSC, calls `fetchHomepageAnnouncements`
- `app/(portal)/portal/[token]/layout.tsx` — top bar + StartOrderDrawer mounting; salesman name lives here
- `components/portal/promo-sheet.tsx` — the drawer everything-promo opens into
- `components/portal/announcement-card.tsx` — `<CardSurface>` wraps each card type and decides drawer vs URL vs no-action
- `components/portal/announcements-stack.tsx` — type definitions for `Announcement`, `AnnouncementKind`, `ProductQuantityOverride`

**Salesman side:**
- `app/(admin)/admin/announcements/page.tsx` + `components/admin/announcements-manager.tsx` — list + tabs + dialog launcher
- `app/(admin)/admin/customer-groups/page.tsx` + `components/admin/customer-groups-manager.tsx` — groups CRUD
- `app/(admin)/admin/customers/[id]/edit/page.tsx` — customer edit + override panel
- `components/admin/customer-overrides-panel.tsx` — per-customer override editor
- `components/admin/announcement-group-overrides-dialog.tsx` — per-group override editor
- `components/admin/announcement-dialog.tsx` — type picker + content fields + per-product qty/lock controls

**Server:**
- `lib/server/announcements.ts` — `rowToAnnouncement`, `fetchHomepageAnnouncements` (the resolver), `fetchAllAnnouncements`, `pickResolvedProducts`, `pickDrawerProducts`
- `lib/server/schemas.ts` — Zod for announcements, kinds, overrides
- `app/api/admin/announcements/route.ts` + `[id]/route.ts` + `[id]/overrides/route.ts` + `reorder/route.ts`
- `app/api/admin/customer-groups/route.ts` + `[id]/route.ts`
- `app/api/portal/orders/[id]/items/route.ts` — bulk PUT used by `<PromoSheet>` commit
- `db/migrations/202604260*.sql` — the whole story

---

That's the state of the system. Pick a next-step from §4 and dive in.
