# ST-9 UI/UX Critique

Companion to [docs/st-9-application-flow-inventory.md](st-9-application-flow-inventory.md). The inventory says what the product *does*; this document says what it *feels like* to use today, where it is visually and interactively weak, and what the redesign needs to solve.

**Method.** Walked every flow in the inventory in a local `npm run dev` build against the seeded DB. Admin flows reviewed at 1440×900 desktop. Portal flows reviewed at 390×844 (iPhone 14 Pro) because the portal is the customer-facing surface and is almost certainly opened on phones. Screenshots saved under `docs/ui-ux-screenshots/`.

**Framing.** The user has stated that no screen has been properly designed yet — the app is functionally complete but visually unstyled. This critique treats every screen as a skeleton and focuses on what the redesign must fix, not on small polish issues.

---

## 1. Cross-Cutting Observations

These issues repeat across most screens. Fixing them at the system level will lift every flow.

### 1.1 No visual hierarchy

Screens currently read as a flat stack of text + gray form rows. Page titles, section headings, field labels, and help text look similar in weight. The eye has nothing to grab onto. There is no clear primary action on any screen — `Save`, `Send Invite`, `New Draft Order`, `Run Report`, `Add Product`, `Save With Pallets` are all styled the same as secondary buttons.

### 1.2 No design system

- Typography is near-default; no defined scale, no display face, no tabular figures for money/quantities.
- Color use is ad-hoc. Status pills (`Draft` / `Submitted` / `Delivered`) are indicated by a raw circle glyph (`○` / `●` / `✓`) and grey text instead of color-coded chips.
- Spacing feels cramped and inconsistent — form fields and card sections have no rhythm; density varies screen to screen.
- Radix + shadcn is already installed (see `package.json`), but primitives appear under-used. The raw `<input type=date>` appears in multiple places (customer detail, reports, portal home) with the native browser chrome — it sits in jarring contrast to the rest of the UI, and is unusable on mobile Safari for range pickers.

### 1.3 Tables are not mobile-safe and not visually scannable

The dashboard, customer list, staff list, and portal order lists all show "table-ish" rows:
- On mobile they truncate or overflow. The portal home (critical customer-facing screen) shows a column-heading row — "Date / Items / Total / Status / Actions" — that is only readable on desktop.
- On desktop, rows are low-density but visually noisy: status icon + word + checkbox + inline action buttons + CSV link + copy-link button all crowd the Actions column.
- Row hover / focus / selection states are not visually distinct. Bulk selection is hard to discover — the leading checkbox is unlabeled.

### 1.4 Navigation model is thin

Admin sidebar is a plain-text vertical list ("Dashboard / Customers / Staff / Catalog / Reports") with no icons, no grouping, no active-state styling beyond text color, and no indication of who is signed in or how to sign out (`Signed in as Admin User` is a plain text label squeezed into the page content). Portal top nav has three links (brand / Home / Account) — no cart indicator, no sign of the customer's business name, no delivery-date context once you leave the home page.

### 1.5 Empty / loading / error states are undifferentiated

The login form has an `alert` live region, but no visible error appears unless an auth failure triggers it. Invalid-token portal route shows a plain Next.js 404 page instead of a branded "This link is no longer valid — contact your salesman" screen. No skeletons or progress indicators anywhere during route transitions; the app flashes between states.

### 1.6 Copy is developer-voiced

Lots of terse, system-y labels: `APR 17, 2026` headers in all-caps, `CURRENT ORDERS` / `PREVIOUS ORDERS` / `PORTAL LINK` section headers in all-caps, `0 excluded` counters, `mixed`/`single` pallet types rendered raw. The tone is fine for an internal admin but wrong for a customer-facing portal.

### 1.7 Accessibility smell-tests fail

- Multiple buttons lack visible labels (the copy-icon button on customer rows renders as an empty `<button>` with only an icon).
- Form field labels are generally present but not always visually associated.
- Focus rings appear to rely on browser defaults.
- Status indicators use glyph + color only, no screen-reader text (`●` submitted vs `○` draft).

### 1.8 Density/Prominence mismatch on the two most important screens

- **Admin dashboard** — the single highest-value action (create a new draft order for a customer) is buried next to the search box and not visually distinct. The stat cards are a great idea but are rendered as plain bordered boxes with no visual weight; they should be the first thing you see but currently compete with the Orders table header.
- **Portal order builder** — the catalog occupies most of the screen, but the running cart/total is either hidden in a sidebar that doesn't exist on mobile or visible only as a floating `Continue (2 items)` button with no dollar total. The customer has no persistent answer to "how much am I about to spend?"

---

## 2. Per-Flow Critique

Flows listed in the same order as the ST-9 inventory. Each section: **what exists → what's wrong → direction for redesign.** Numbered screenshots in `docs/ui-ux-screenshots/` are referenced by index.

### 2.1 Admin sign-in — `/auth/login`

*Screenshot: 01-auth-login.png*

- **What exists:** centered card with "Universal Beverages" wordmark, "Admin Sign In" subhead, email + password fields, `Sign in` button, `Forgot password?` button.
- **What's wrong:**
  - Wordmark is just text — no brand mark, no weight, no color.
  - `Sign in` is a generic outlined button; it should be the unambiguous primary action.
  - `Forgot password?` styled identically to `Sign in`, so both compete for the click.
  - No error affordance rendered until submit; the `admin_only` / `profile_missing` / `admin_disabled` error messages defined by the inventory are invisible here — need to verify their surface treatment.
  - No visual context that this is the *salesman* login (nothing distinguishes it from "customer login" if a customer lands here by mistake).
- **Direction:** this is the first impression for every salesman. Deserves a real brand mark, a colored primary CTA, muted secondary for `Forgot password?`, and a clear "For staff only — customers use the link from your salesman" hint.

### 2.2 Admin invite acceptance — `/auth/accept-invite`

- **Not screenshotted** (requires a fresh invite token; behavior verified in inventory).
- **What's wrong (by reading the flow):** five different terminal outcomes (`Invite Already Used` / `Invite Revoked` / `Account Disabled` / `Invite Link Invalid` / happy path → reset-email-sent) are all likely rendered as text blurbs. They need to be treated as distinct illustrated states, each with a clear next step ("Contact your admin" / "Resend from manager" / etc.).
- **Direction:** design one "outcome screen" template and parameterize it (title, body, primary CTA). Same template should serve the `/auth/reset-success`, `/auth/reset-email-sent`, and invalid-token portal screens.

### 2.3 Password reset — `/auth/reset-password`, `/auth/reset-success`

- **Not screenshotted.**
- Expected issue: three entry modes (`code`, `token`, `email+otp`) likely render in a single form with conditional fields. Needs a clearer single path per mode and a shared confirmation screen.
- **Direction:** collapse into the same "outcome screen" template above for completion, and give the form a confidence-building "Password strength" affordance.

### 2.4 Admin dashboard — `/admin/dashboard`

*Screenshot: 02-admin-dashboard.png*

- **What exists:** page title + date, six stat-cards ("Orders Today / Pending Review / Drafts / Customers / Products / Pallets") each with an `Open` link, a second `Orders` section with `New Draft Order` button, search input, status-filter tabs (`All / Submitted / Drafts / Delivered`), and a flat table of all orders grouped by day (`APR 17, 2026`, `APR 16, 2026`, `APR 15, 2026`).
- **What's wrong:**
  - Stat cards are the highest-value information but are the visually weakest element. No differentiation between the six metrics, no trend arrows, no colored accents.
  - The orders table is long and dense. Status is a `<select>` inline on every row — this is powerful but looks like a form field, not a status chip.
  - Per-row actions stack up (status dropdown, CSV link, copy-link button). This is four interactive elements per row with no hierarchy.
  - `New Draft Order` is the single most common salesman action — it should be a prominent primary CTA (floating button / top-right header button), not a secondary gray button next to the table title.
  - Date-grouped sub-headers (`APR 17, 2026 / APR 16, 2026 / APR 15, 2026`) repeat the entire column header row each day. With 3–7 day groups this is visually exhausting.
  - No way to collapse a day group.
  - Customer search input has no filter chip showing the active customer search once applied.
- **Direction:** treat this as a two-pane workspace. Left: persistent filter/search sidebar with stats. Right: a single, smarter orders table with grouped virtual rows (one header row per day, not one table per day), colored status chips, icon-only row actions revealed on hover, and an inline row-expand for quick line-item peek without leaving the page. Primary CTA (`+ New Order`) pinned top-right.

### 2.5 Staff overview — `/admin/staff`

*Screenshot: 03-admin-staff.png*

- **What exists:** invite form (Name, Email, `Send Invite`), helper paragraph, staff table with Name / Email / Status / Last Invite / Actions columns. Each row has 3-4 action buttons: `Send Invite` / `Copy Invite` / `Resend` / `Revoke` / `Disable`.
- **What's wrong:**
  - Every action row looks the same — no hierarchy between destructive (`Revoke`, `Disable`) and normal (`Resend`, `Copy Invite`).
  - `Disable` on the currently-signed-in admin row (`Admin User`) looks clickable — is there a confirm? The UI gives no hint that this is self-destructive.
  - Status "Active / Invited" are plain text — need colored chips consistent with the order statuses.
  - Invite form floats above the table with no visual frame or grouping.
- **Direction:** move destructive actions into a kebab menu per row. Style the invite form as a right-aligned inline "Invite a salesman →" affordance, not a standalone form block. Colored status chips shared with the rest of the app.

### 2.6 Customers list — `/admin/customers`

*Screenshot: 04-admin-customers.png*

- **What exists:** add-customer inline form at top (Business Name + Email + `Add Customer`), search box, table with Business / Email / Phone / Last Order / Portal columns. Each row has a checkbox + a "Copy URL" button under the Portal column.
- **What's wrong:**
  - Columns feel arbitrary — Phone and Last Order are half-empty for most seeded rows, making the table look sparse.
  - "Copy URL" is the most-used action for sharing with a customer, but it's visually indistinct and tucked in the last column.
  - No at-a-glance indicator of whether a customer has a *live* / *recent* / *dormant* relationship (when was last order? any drafts? unreviewed submitted orders?).
  - Inline add-customer form has only two fields; the rest of customer data is captured on detail page. That's fine, but the form's presence at the top of a listing page is awkward — feels like the listing is secondary to creating.
- **Direction:** move "Add Customer" to a primary button that opens a dialog. Listing becomes a clean scannable list: business name (large) → contact/email (secondary) → "3 open drafts" / "Last order 2 days ago" badges → a single prominent `Copy portal link` icon-button. Search pinned to top. Mobile card layout below a breakpoint.

### 2.7 Customer detail — `/admin/customers/[id]`

*Screenshot: 05-admin-customer-detail.png*

- **What exists:** breadcrumb back to Customers, business name H1, email link, three titled sections — `PORTAL LINK`, `CUSTOMER INFO`, `CATALOG SETTINGS` — plus `Manage Products`, `Delete Customer`, and an `ORDERS` section with a date picker, `New` button, and a list of existing orders (Draft / Submitted / Delivered).
- **What's wrong:**
  - `PORTAL LINK` section is arguably the most important element on the page (it's the link you hand to customers), yet the URL is plain text with a tiny copy icon and a `Regenerate Token` button. The link looks like console output.
  - Form is a single tall column of `Label / Input` rows with no grouping beyond section titles. On desktop this wastes half the screen.
  - `Show prices` and `Custom pricing` toggles are shoehorned into the "CATALOG SETTINGS" section with plain-text labels. These are decisions that change the customer's experience dramatically — they deserve card-style toggles with explanatory copy ("If off, customer sees products without prices").
  - `Default Grouping` is a dropdown with only "Brand" / "Size" — feels like a 50/50 choice that should be a segmented control.
  - `Manage Products 0 excluded` link is styled identically to a row but is actually a navigation CTA — confusing.
  - `Delete Customer` sits in the same visual flow as the editable form — no guardrails.
  - Orders section has its own mini-flow (pick date → `New` draft, or click existing). The date picker here duplicates work on the dashboard; unclear why this subflow exists in-page rather than opening the order builder.
- **Direction:** top-of-page "Portal card" with the link rendered as a copy-to-clipboard pill + `Regenerate` / `Preview as customer` / `Email link to customer` actions. Two-column form body (Business / Contact / Email / Phone in one column, Address block in the other). Settings surface as a Radix Switch row with help text. Order history as a compact timeline, not a table. Destructive "Delete Customer" moved to a danger zone at the bottom.

### 2.8 Customer products — `/admin/customers/[id]/products`

*Screenshot: 06-admin-customer-products.png*

- **What exists:** per-customer overrides — hide products, set custom prices, create customer-only products.
- **What's wrong:** likely re-uses the same flat list that catalog uses. Needs clear visual distinction between "inherited from global catalog," "hidden for this customer," and "custom-priced / custom-created for this customer." Today this state is implicit.
- **Direction:** tri-state row indicator (inherited / overridden / custom), badge + color. Filter chips at top: "All / Hidden / Custom priced / Custom product." Save/discard banner that floats when any changes are pending.

### 2.9 Catalog — `/admin/catalog`

*Screenshot: 07-admin-catalog.png*

- **What exists:** 535-product list rendered as vertical rows: product name (all-caps), brand + size, price + status.
- **What's wrong:**
  - No thumbnails, no brand logos — every row looks identical. For a beverage business, the image is the fastest recognizer.
  - No visible grouping, filtering, or brand facet.
  - 535 rows without virtualization or visible pagination is a performance trap and a cognitive trap.
  - Drag-reorder is supported per the inventory but there's no affordance visible (grip handle).
  - Bulk actions referenced by the inventory are not visible until rows are selected — need to verify.
  - `Add Product` button is a plain secondary-style button in the top corner.
- **Direction:** product grid with thumbnails as the default view; table view as an option. Sticky filter rail (Brand / Size / Status / Tag). Grip handle on hover. Bulk action bar slides in from bottom when rows are selected. Inline brand/size creation should use a combobox with "+ Create new" — likely already built, needs styling.

### 2.10 Pallet deals — `/admin/catalog/pallets`

*Screenshot: 08-admin-pallets.png*

- **What exists:** list of pallet deals with title, type (`mixed` / `single`), price, status.
- **What's wrong:**
  - Five rows of "New Pallet Deal $0.01 single Active" — seed data, but it reveals that there's no guardrail against publishing half-configured pallets; `Active` should not be the default for a $0.01 deal.
  - `mixed` vs `single` are typed words with no visual differentiation — these are fundamentally different products (a pallet of one SKU vs. a mix-and-match) and should read as distinct card styles.
- **Direction:** pallets deserve a richer card view (hero image, contents preview, price-per-unit breakdown). Gate `Active` behind a validity check.

### 2.11 Brands — `/admin/brands`

*Screenshot: 09-admin-brands.png*

- **What exists:** brand manager UI per inventory.
- **What's wrong (from screenshot):** brands are likely rendered as a plain table of names. Brand logos are referenced as uploads — they should be the primary visual element here.
- **Direction:** grid of logo tiles, each with a pencil-edit on hover and a `+ New Brand` tile at the end.

### 2.12 Order detail — `/admin/orders/[id]`

*Screenshot: 10-admin-order-detail.png*

- **What exists:** per the inventory — line items, totals, customer link, status controls, CSV export, cancel/delete.
- **What's wrong (expected from other screens):**
  - Status transition controls (`submitted → delivered`, `cancel back to draft`) are likely inline buttons with no guardrails. A delivered-to-cancelled flip should require confirmation.
  - `Download CSV` and `Copy customer portal order link` share visual weight with structural nav.
  - Line items probably repeat the flat-row pattern — needs a clean invoice-style table with totals footer.
- **Direction:** page splits into "Order summary card" (customer, delivery date, status chip, totals) on the right, "Line items" invoice-style on the left. Status transitions as a wizard-like stepper at top (`Draft → Submitted → Delivered`), one-click advance, confirmation on reversal. Action group (CSV / copy link / cancel / delete) tucked into a kebab or a right-sidebar footer.

### 2.13 Reports — `/admin/reports`

*Screenshot: 11-admin-reports.png*

- **What exists:** date-range pickers, `Run Report`, three stat cards (Orders / Revenue / Items Sold), orders list below, `Top Products` section.
- **What's wrong:**
  - No chart. For a date-range revenue report, a sparkline or daily-totals bar is the single most useful affordance and it's missing entirely.
  - Stat cards same weak treatment as dashboard.
  - Orders list is a raw text dump of `YYYY-MM-DD / glyph / status / $ / N items` — unreadable at a glance.
  - `Top Products` shows one row with no ranking numbers, no comparison.
- **Direction:** presets above the date pickers (`Today / 7 days / 30 days / This month / Custom`). Hero chart: stacked bars by status per day. Stat cards with delta vs. previous period. Top products as a ranked bar list with share-of-revenue %.

### 2.14 Portal home — `/portal/[token]`

*Screenshot: 12-portal-home-mobile.png (390×844)*

- **What exists on mobile:** wordmark, date button (`Apr 17, 2026`), `+ New Order`, a persistent `Continue (2 items)` CTA, `CURRENT ORDERS` list, `PREVIOUS ORDERS` list. Same table format as admin (Date / Items / Total / Status / Actions).
- **What's wrong:**
  - This is *the* customer touchpoint. It must not look like the admin. Currently it uses the exact same type, spacing, table, and chrome.
  - The customer's business name is nowhere on screen — they land on a link and see only "Universal Beverages" and generic lists. They need immediate confirmation "Hi {Business} — this is your order portal."
  - The date picker is a native `<input type=date>` styled as a button; on iOS this opens the OS wheel picker but the tap target is tiny.
  - "CURRENT ORDERS" / "PREVIOUS ORDERS" use all-caps grey headers that look like legal fine print.
  - Column headers (`Date / Items / Total / Status / Actions`) repeat above each section and are cramped on mobile.
  - `Continue (2 items)` button is above the fold but shows no dollar total, no delivery date reminder.
- **Direction:** mobile-first vertical cards. Top hero: salesman-branded greeting + "Next delivery: Friday, Apr 17" + a giant `+ Start order for Fri, Apr 17` CTA. Below it, a "Pick up where you left off" strip for the open draft (with total). Below that, a simple timeline of past orders rendered as stacked cards, not a table. Use swipe-to-reorder. CSV download hidden behind a share menu.

### 2.15 Order builder — `/portal/[token]/order/[date]`

*Screenshot: 13-portal-order-builder-mobile.png*

This is the highest-value screen in the product.

- **What exists on mobile:** header with date & `Save With Pallets`, filter row (`All brands`, `All sizes`, grouping toggle `Brand`, `New Items`), catalog grouped by brand (Coca-Cola, Pepsi, Mexican, Canada Dry, Dr. Browns, …), each product with `-` and `+` quantity controls.
- **What's wrong:**
  - Running total is invisible. There is no always-visible "Your order: 2 items · $57.00" bar at the bottom.
  - Filter row crams four controls into one line on mobile — a segmented 2-state grouping toggle, two dropdowns, and a "New Items" pill. They look identical.
  - `Save With Pallets` is the title-bar button — unclear on its own. "Save" and "Pallets" are two different concepts jammed together.
  - Brand list is exhausting. 22+ brand buttons stacked vertically with no collapse, no favorites, no search. On mobile the customer scrolls through a wall of brand-name buttons before reaching products.
  - Quantity controls (`-` `+`) are the same visual weight as brand-filter buttons.
  - No product images in the rows seen — just text and `-`/`+`.
  - No visual distinction for items already in the cart (should have a badge/highlight, "✓ 2 in order").
  - Pallet mode (screenshot 17) toggles the whole screen but the mode-switch is not a clearly reversible state — a customer could get lost.
- **Direction:**
  - Persistent sticky footer cart: item count + $ subtotal + `Review order →`.
  - Sticky top: search field is the primary filter; brand/size become chip filters in a horizontally-scrollable row; grouping becomes a small segmented control in a secondary position.
  - Catalog items as image-forward cards (thumbnail, name, size, price, stepper). When an item is in the cart, the card shows qty + total inline.
  - Pallet mode as a distinct top-of-screen tab, not a toggle on the save button. Returning to regular items is one tap.
  - Bottom-sheet review drawer triggered by the footer cart showing the cart line items, delivery date, customer notes, `Submit order` as the single unmistakable primary CTA.

### 2.16 Readonly / submitted order — `/portal/[token]/order/link/[id]`

*Screenshot: 15-portal-order-readonly-mobile.png*

- **What exists:** readonly view of the submitted order; CSV link; reorder/clone and cancel-to-draft where surfaced.
- **What's wrong:** likely reuses the builder layout stripped of interactions. Needs its own "order receipt" treatment — clearly readonly, clearly "here's what you submitted," with the delivery date and status chip prominent.
- **Direction:** receipt-style layout: header block (order #, date, status chip, total), line items with image + qty + price, totals block, actions row (`Download CSV`, `Reorder`, `Contact salesman`). Submitted/delivered watermark or subtle banner.

### 2.17 Portal account — `/portal/[token]/account`

*Screenshot: 14-portal-account-mobile.png*

- **What exists:** contact name, email, phone, address/city/state/zip, save.
- **What's wrong:** same flat-form problem as admin customer detail. On mobile, a tall column of unstyled inputs is OK but the save affordance needs to be a sticky footer CTA; otherwise the customer saves invisibly.
- **Direction:** grouped sections (Contact / Delivery address), sticky `Save changes` footer that only activates when fields are dirty.

### 2.18 Invalid token — `/portal/[bad-token]/*`

*Screenshot: 16-portal-invalid-token-mobile.png*

- **What exists:** appears to render the default Next.js 404.
- **What's wrong:** a customer who pastes a truncated URL or uses an old link sees a dev-flavored 404. They have zero path to recovery.
- **Direction:** branded "This link isn't active" screen — "The link you used may have expired or been replaced. Please ask your sales contact for an updated link." Include a generic `contact@universalbeverages.com` mailto and the brand wordmark.

### 2.19 Compatibility routes — `/c/[token]/*`

Redirect only. No UI to critique. Verify the redirect preserves the subpath and that Playwright covers it.

---

## 3. Design Priorities (drives the redesign phase)

Ranked by leverage — P0 items unlock the most perceived quality for the least work.

### P0 — Design system foundation

Nothing else matters until this exists.

1. **Typography scale + brand face.** Pick a display typeface for headings and a readable sans for body. Define 6–8 sizes. Use tabular figures for money/quantity.
2. **Color tokens.** Neutrals, brand primary, brand secondary, and semantic colors for statuses (draft=slate, submitted=blue, delivered=green, cancelled=red). Define dark-on-light and light-on-dark variants.
3. **Spacing + radius scale.** One 4px-based spacing scale used everywhere.
4. **Primitives.** Wrap the shadcn/radix components already in `package.json` with brand styling: Button (primary/secondary/ghost/destructive), Input, Select, Switch, Dialog, Toast, Badge/Chip, Card, DataTable.
5. **Status chip component** used for order status everywhere (dashboard rows, customer history, portal order lists, order detail, reports).

### P0 — Portal order builder redo

This is the screen the whole business rests on. It needs:
- Sticky footer cart with subtotal + Review CTA.
- Search-first filtering.
- Image-forward product cards.
- Pallet mode as a sibling tab, not a save-button modifier.
- In-cart product indicator.

### P0 — Portal home redo

- Personalized greeting with business name.
- One hero CTA: start an order for the next delivery date.
- Resumable-draft strip.
- Card-based order history for mobile.

### P1 — Admin dashboard redo

- Weighted, colorful stat cards with delta vs. previous period.
- Unified orders table (not re-headered per day).
- Colored status chips + row actions collapsed to a kebab or hover-reveal.
- Prominent "+ New Order" primary CTA.

### P1 — Customer detail redo

- Portal link as a hero affordance (big copy button + preview + email + regenerate).
- Two-column form body.
- Switch-style settings with help text.
- Danger zone for delete.

### P1 — Admin catalog redo

- Grid view with thumbnails as default.
- Sticky brand/size/status filter rail.
- Virtualized list for 500+ rows.
- Bulk-action bar that slides in on selection.

### P2 — Outcome-screen template

Shared template for `/auth/reset-success`, `/auth/reset-email-sent`, invite-acceptance terminal states, invalid portal token. One component, many states.

### P2 — Reports with real charts

- Date-range presets.
- Hero chart (daily stacked-bar by status).
- Delta stat cards.
- Ranked top products.

### P2 — Staff, brands, pallets polish

Once P0/P1 primitives exist, these get a straightforward pass with the new chip/table/card/dialog components.

### P2 — Auth surfaces

Login, forgot password, reset — benefit from the design system but are low traffic. Do last.

---

## 4. Verification plan for the redesign

Once a redesign pass lands on any flow, re-run this same walkthrough against it (same routes, same viewports) and diff against the screenshots in `docs/ui-ux-screenshots/`. A screen is "done" when:

- Every action is reachable within the design system primitives.
- Mobile 390-wide and desktop 1440-wide both render without overflow.
- Primary action is unambiguous.
- Empty / loading / error states are designed, not defaulted.
- Every flow in `docs/st-9-application-flow-inventory.md` is still supported.

---

## 5. Out of scope for this critique

- Performance (LCP, TBT, bundle size) — worth a Lighthouse pass after the redesign.
- Accessibility beyond smell-tests — full audit (axe, keyboard-only, screen reader) after design tokens are set.
- Email templates (invite, password reset, portal link) — listed as manual flows in the inventory; needs its own critique once the brand system exists.
- Marketing / public-facing pages — the app has none today.
