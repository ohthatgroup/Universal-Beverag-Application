# ST-9 — Admin Design Theory

Parallel to `st-9-portal-design-theory.md`. The portal pass established: *object-first, form-grade, one figure per screen, phone as the primary viewport*. The admin surface is a different user in a different context, but the same theory applies — with different weights on each principle.

---

## 1. Who uses this

**Primary user:** salesman on the road, working from a phone or tablet. Sometimes alone, sometimes standing next to the customer at the counter.

**Not this user:** operations clerk at a desk, dual-monitor setup, power-user bulk editing.

That distinction sinks most of the current admin UI. It is a dense, table-first, desktop-grade tool that renders gamely on a phone but wasn't *designed for* a phone.

## 2. The five jobs, ranked

The salesman ranked the work:

| # | Job | Frequency | Context |
|---|-----|-----------|---------|
| A | Share / co-fill order with the customer (in person) | Daily, multiple times | In-store, phone or tablet, customer is watching or holding the device |
| B | Post-visit order update (status, line-item tweaks) | Daily | Car, back office, between visits |
| C | Customer account setup & customization | Weekly | Desk moment, not time-pressured |
| D | Catalog create/edit/corporate sync | Rare, batch | Desk moment, deliberate |
| E | Brand + pallet deal setup | Rare | Desk moment |

**Design implication.** A and B are the load-bearing daily flows. C–E are occasional. Current admin weights them the opposite way: the dashboard is a stat panel, the navigation treats Catalog / Brands / Staff as peers with Orders, and the "share order with customer" moment has *no* affordance at all.

## 3. Theoretical frame

- **Shneiderman direct manipulation.** A salesman building an order with a customer is direct manipulation — touch, stepper, immediate feedback. The current admin order-edit uses a `ProductPickerDialog` that models the task as "pick from a catalog, then configure," which is catalog-first, not list-editing-first. Same mistake the customer portal used to make. Fix: the admin order-edit screen should reuse the customer `OrderBuilder` with an admin prop overlay.
- **Tesler's Law of modes.** Job A ("co-fill with customer") is a distinct mode from job B ("post-visit edit alone"). Today they share one UI, which means admin chrome (delete-line, price override, status chip) is always visible — even when the customer is standing there and the screen is in their face. That's a mode collapse. Explicit mode: *Present mode* vs *Edit mode*.
- **Cooper task primacy.** Dashboard today answers "show me numbers." The salesman's real first question landing on `/admin` is "what orders need my attention right now?" The dashboard should be that list, with the stats collapsed to a secondary strip.
- **Norman feedback + visibility.** Status changes inline on the orders list work. Good. But changes elsewhere (catalog, brands) happen through a "Save" button pattern with dirty-state tracking. On a phone, in a salesman's pocket, that's a minefield — half-finished edits in a dirty row, no visible save target. Admin-side edits should autosave wherever possible, with clear "Saving… / Saved" feedback — matching the portal's autosave model.
- **Arnheim figure/ground.** Admin tables today are eight+ columns of equal weight. No figure. On a phone this breaks: the user can't tell what's primary without reading every cell. Fix: one dominant column per row, rest demoted to supporting text.
- **Fitts's Law.** Today the admin order detail has a horizontal action bar (Status + Add product + Mark delivered + CSV + Portal link + Cancel + Delete). That's seven peer affordances on a phone. Reorder by frequency, collapse rare actions into an overflow menu.

## 4. Per-page critique (grounded in the inventory)

### Dashboard — `/admin/dashboard`
**Today.** 6 stat cards above, orders-section below. Stats first, orders second.

**Broken for the salesman.**
- First-screen answer is "Orders: 47, Revenue: $...", not "which orders need me today."
- On a phone the 6 stat cards push the actual orders below the fold.
- Stat cards *do* act as filters — that's clever but unlabeled; the affordance isn't visible.

**Redesign direction.**
- Flip the stack. First-class object on the dashboard is **today's live orders**, grouped by delivery date, status-filterable as it is now.
- Collapse the 6 stat cards into a single narrow summary strip at the top: `12 submitted · 3 drafts · $4,820`. One line. Tap to filter same as today.
- The "New draft order" creation path needs to be the most prominent single action on the screen, because that's the A-flow entry (salesman starts an order with a customer standing there).

### Orders list (within dashboard via `OrdersSection`)
**Today.** Groups by delivery date. Inline status pill. Deep-link copy button. Bulk selection + bulk status + bulk delete. On mobile: card list with items/total; on desktop: table.

**Keeping.** The delivery-date grouping, the inline status pill, the deep-link copy, the autosaving status change.

**Broken.**
- Bulk selection on a phone is a poor fit for the salesman's use case — bulk ops are a desk task.
- The "Copy portal link" icon is ambiguous — there's no visual signal that this is the "hand-off to the customer" door.
- The status filter tabs (All / Submitted / Drafts / Delivered) are useful but parsed as equal weight. For the salesman, *Drafts needing attention* and *Submitted in the last 24h* are the real views.

**Redesign direction.**
- Mobile: hide bulk selection behind a long-press or explicit "Select" toggle. Default tap on row = open order.
- Make the status filter a segmented control at the top, with sensible labels — "Today's orders / Open drafts / Submitted / All".
- Replace the icon-only "Copy link" with a prominent `Share with customer →` affordance per-row — because that IS job A.

### Order detail — `/admin/orders/[id]`
**Today.** Action bar at top (Status + Add product + Delivered + CSV + Portal + Cancel + Delete). Customer info block. Line items list (mobile) / 5-col table (desktop). Custom item picker via `ProductPickerDialog`. Does NOT share code with customer `OrderBuilder`.

**Broken.**
- This is the surface the salesman uses in-store. Currently it has *zero* co-fill affordance — no "present to customer" mode, no way to hide admin chrome.
- Two separate implementations (admin edit flow + customer portal) drift. Any Usuals / filter / pallet improvements on the customer side don't land here.
- Seven action buttons in the header is a Fitts's Law violation on mobile.

**Redesign direction.**
- **Reuse `OrderBuilder`.** Pass an `adminOverlay` prop with the admin-only affordances (unit-price override, delete-line-item, status control). The core list-editing surface is the same UI the customer sees.
- **Add "Present mode" toggle.** When on, the admin overlay collapses; the screen becomes the customer view. Salesman hands the phone to the customer.
- Header action bar → primary affordance (`Share with customer →`) + overflow menu for the rest (CSV, Cancel, Delete).
- Status change stays inline (it's already good).

### Customers list — `/admin/customers`
**Today.** Header + "Add Customer" inline form + search + list (mobile cards / desktop table). Per-row: name, email, phone, last order, portal URL.

**Broken.**
- The "Add Customer" form sits above the list always. 99% of the time the salesman isn't creating a customer — they're looking one up.
- Portal URL rendered as a copy button inline — correct action, unclear surface.

**Redesign direction.**
- Search + list is the default view. Move "Add Customer" to a `+ New customer` button that opens a sheet/dialog.
- Per-row primary affordance: tap row → customer detail. Per-row secondary: `Share portal →` (the A-flow entry point, same verb as on orders).

### Customer detail — `/admin/customers/[id]`
**Today.** Desktop: two-column (form left, orders right). Mobile: stacked. Portal link section prominent at top. Catalog settings (show_prices, custom_pricing, default_group) mixed with contact form. Delete at bottom of form. "Manage products" as a link to a separate page.

**Broken.**
- The form mixes contact info (rarely changed) with commercial settings (rarely changed) with portal token (rarely changed). Everything is low-frequency. Nothing demands primary placement.
- Orders pane on the right is actually the *high-frequency* element — the salesman looks at what this customer ordered recently. On mobile it drops to the bottom.
- Portal link UI shows the full URL in a `<code>` block — too much chrome for what is conceptually "copy this link."

**Redesign direction.**
- First block: orders (recent + "Start new order" button). Object-first — the customer *is* their ordering history.
- Second block: portal share — compact `Share portal →` pill with copy + regenerate behind an overflow.
- Third block (collapsed by default): contact + commercial settings, as a single "Edit details" accordion.
- "Manage products" stays linked to its own page; that flow is detailed enough to deserve a page.

### Customer products — `/admin/customers/[id]/products`
**Today.** Search + brand filter + product list grouped by brand. Hide/show toggle, pin-to-usuals star, custom price override (when enabled), "Add custom product" modal. Sticky save/discard bar when custom prices dirty.

**Keeping.** The grouped-by-brand structure, the per-product toggles, the autosaving hide/show.

**Broken.**
- The sticky save/discard bar for custom prices is a dirty-state pattern that contradicts the portal's autosave principle. Price edits should autosave per-row with debounce.
- The "Pin to usuals" star icon is visible but semantically opaque for a new user.

**Redesign direction.**
- Autosave prices per-row (debounce 300–500ms, Norman feedback via a tiny `Saved ✓` indicator).
- Delete the sticky footer bar. Inconsistent UX pattern vs. the rest of the system.
- Replace star with an explicit `📌 Pin to usuals` toggle or a labeled chip — makes the action readable.

### Catalog products — `/admin/catalog`
**Today.** Create form toggle + search + draggable table (desktop) / card list (mobile). Reorder via drag or move-to-top/bottom/position. Bulk delete. Row click → detail page.

**This is a job D screen (rare, batch, desk).** Different treatment than A/B:
- Desktop-first is actually fine here. The salesman does this at a desk with intention.
- Drag-reorder works on desktop; on mobile the move-buttons are the fallback.

**Broken.**
- The "Add Product" flow being an inline form that toggles visibility is awkward — partial page jumps, form appears/disappears.
- Search disables drag with a UI message — confusing. Better: preserve drag; the sort is just on filtered results.
- The status column shows "Discontinued / New / Active" which is three concepts jammed together. New is a promotional flag; discontinued is a lifecycle flag; active is implied.

**Redesign direction.**
- "Add Product" opens a sheet (mobile) or dialog (desktop), matching the design system rules in `feedback_modal_style.md`. Not an inline collapsible form.
- Surface `is_new` and `is_discontinued` as explicit chip filters, not as overloaded status.
- Keep drag-reorder on desktop, make the mobile move-buttons more prominent per-row (three-dot menu → Move to top / Move here).
- **Corporate sync** isn't in the UI today. If the user mentioned it as a job, we need to design it — probably a separate "Sync from corporate" button that opens a diff-review sheet.

### Catalog product detail — `/admin/catalog/[id]`
**Today.** Single form, 11 fields in a 2-col grid + image upload + two toggles.

**Broken.**
- Form is flat — name, pack, price, size, image, tags, flags all at equal weight.
- Save button lives at the bottom of a tall form. On mobile that means scroll-to-save.

**Redesign direction.**
- Group fields: **Identity** (brand, title, image) / **Pack** (pack_details, pack_count, size_value, size_uom) / **Commercial** (price, tags, is_new, is_discontinued).
- Autosave per-group with clear feedback. Remove the Save button.
- Hierarchy: identity is primary (name + image), pack/commercial are secondary.

### Pallet deals list & detail — `/admin/catalog/pallets`, `/admin/catalog/pallets/[id]`
**Today.** List: drag-reorder + bulk. Detail: two-column (settings left, contents editor right). Contents editor autosaves on blur.

**Keeping.** Autosave in contents editor. Two-column detail works for desktop which is the right viewport for this job.

**Broken.**
- List: "New Pallet" creates an empty deal titled "New Pallet Deal" at price $0.01 and redirects to detail. Works but ugly — the operator sees their bad data in the list until they fix it. Better: creation flow prompts for title/type on creation.
- Detail: the "contents editor" is scrollable inside the page (`max-h-[68vh]`) which creates a scroll-within-scroll on small screens.
- Mobile: two-column collapses to stacked — settings form on top, contents below. The contents editor (the actual high-frequency action) gets pushed down.

**Redesign direction.**
- Create flow: sheet with title + pallet-type radio + initial price before it hits the DB.
- Mobile: flip the stack — contents editor on top, settings collapsed into an accordion below.
- Kill the `max-h-[68vh]` inner scroll; let the page scroll naturally.

### Brands — `/admin/brands`
**Today.** Create form + list + per-row inline edit with per-row Save button (dirty tracking). Drag reorder. Bulk delete.

**Broken.**
- Per-row dirty tracking + per-row Save is a lot of state for a low-frequency screen.
- On mobile the "Save" button appears/disappears per-row which is hard to notice.

**Redesign direction.**
- Autosave per-row with debounce — same pattern as catalog product detail.
- Logo upload inline, autosave.
- Remove the inline Save button entirely.

### Reports — `/admin/reports`
**Today.** Date range form + 3 stat cards + orders list + top products list. No pagination; 200-row cap silently.

**Broken.**
- "Run report" button model — feels like a desktop BI pattern. The user is a salesman, not an analyst.
- The date form is a 3-col grid on desktop; on mobile it stacks fine, but the Run button is separate from the date inputs which is awkward.
- Orders list in the report is a duplicate of the dashboard orders list but without status change or share affordances.

**Redesign direction.**
- Date range changes reports *immediately* (no Run button). Use a date-range picker component.
- Reports stay informational — no action buttons on rows. If the salesman needs to act on an order, they navigate to it.
- Add a "last 7d / last 30d / this month" quick-preset strip above the date picker.

### Staff — `/admin/staff`
**Today.** Invite form (name+email+send) + info box + staff list with send/resend/revoke/enable/disable.

**Works.** Low-frequency, desk job, form is appropriate, list is appropriate. Minimal changes needed.

**Minor.**
- The "Copy invite URL" button is good. Make the pending-invite state more prominent so the operator can see which invites are stuck.

## 5. Cross-cutting design decisions

- **Reuse `OrderBuilder` on the admin order detail.** This is the single highest-leverage change. Delete `ProductPickerDialog` (or keep it for "Add non-catalog product" as a secondary path). Pass an `adminOverlay` prop to `OrderBuilder` that:
  - Shows unit-price override input on each line.
  - Shows a delete-line button on each row.
  - Shows the status-change control at the top.
  - Everything else (Usuals, Search, Browse, Pallets, Review) is literal shared code.
- **Add an explicit `Present mode` toggle** on the admin order detail. When on: hide admin overlay, show the customer view. Handoff-to-customer becomes a real affordance.
- **Replace all save buttons with autosave** everywhere except deliberately destructive or one-shot operations (bulk delete, sync from corporate, invite).
- **Collapse dashboard stats** into a single summary strip; promote orders list to primary.
- **Kill inline create forms** on customers, catalog, brands, pallet deals. Every "new X" opens a sheet (mobile) or centered dialog (desktop) per the existing modal-style feedback rule.
- **Replace the `Copy portal link` icon** with a `Share with customer →` labeled affordance on both orders list rows and customer detail.

## 6. Scope for the redesign pass

**In:**
1. `OrderBuilder` admin overlay — the single biggest win for job A.
2. Dashboard reframe — orders-first, stats-summary-strip.
3. Order detail — action bar compressed, "Present mode" toggle, `Share with customer`.
4. Autosave everywhere (brands, catalog product detail, customer products custom prices).
5. Create flows to sheets/dialogs.

**Deferred:**
- Corporate catalog sync — design requires understanding the corporate API.
- Reports redesign — needs a date-range picker component decision.
- Drag-reorder mobile affordance — keep existing move-buttons for now.
- Staff page — works well enough.

## 7. Verification plan

Same as portal pass:
1. Typecheck + lint clean.
2. Dev preview on mobile 375×812 and tablet 768×1024 (the salesman's real viewports).
3. Walk each of jobs A–E and time the taps needed vs. today.
4. The co-fill flow: verify handing the phone to a (simulated) customer, they can use the order builder without seeing admin controls.
