# ST-9 Application Flow Inventory

This inventory is the source-of-truth flow map for `ST-9`. It is derived from the current route tree, page components, and the UI managers that define supported user actions.

It answers a different question than the certification matrix:

- this file says **what the product actually does**
- `docs/st-9-full-touchpoint-flow-certification.md` says **how each supported flow must be certified**

## Admin Auth and Session Flows

### Admin sign-in

- Route: `/auth/login`
- Audience: salesman
- Supported actions:
  - enter email/password
  - sign in
  - trigger forgot-password
  - consume `code` query param and exchange it into a session
- Supported error states:
  - `auth_callback_failed`
  - `profile_missing`
  - `admin_disabled`
  - `admin_only`

### Admin invite acceptance

- Route: `/auth/accept-invite?token=...`
- Audience: invited salesman
- Supported outcomes:
  - valid pending invite -> renders the dedicated invite-setup form
  - accepted invite -> "Invite Already Used"
  - revoked invite -> "Invite Revoked"
  - disabled account -> "Account Disabled"
  - invalid/missing token -> "Invite Link Invalid"

### Password reset

- Route: `/auth/reset-password`
- Audience: salesman
- Reset request starts from: `/auth/login`
- Supported entry modes:
  - reset via `code`
  - reset via `token`
- Direct access without `code` or `token` reroutes to `/`
- Supported actions:
  - set new password
  - confirm password
  - submit reset
- Supported terminal route:
  - `/auth/reset-success`

### Post-login routing

- Route: `/auth/post-login`
- Audience: signed-in auth users
- Supported outcomes:
  - salesman -> `/admin/dashboard`
  - missing profile -> `/auth/login?error=profile_missing`
  - disabled admin -> sign out then `/auth/login?error=admin_disabled`
  - wrong role -> `/auth/login?error=admin_only`

## Staff Management Flows

### Staff overview

- Route: `/admin/staff`
- Audience: signed-in salesman
- Supported actions:
  - view current staff rows
  - see status: `active`, `invited`, `disabled`
  - copy invite URL for pending invites
  - send invite
  - resend invite
  - revoke pending invite
  - disable or enable salesman

### New staff invite

- UI owner: `components/admin/staff-invite-form.tsx`
- Backend: `POST /api/admin/staff`
- Supported action:
  - create/update a salesman profile and send invite email from dashboard

### Existing staff actions

- UI owner: `components/admin/staff-table-manager.tsx`
- Backends:
  - `POST /api/admin/staff/[id]/invite`
  - `POST /api/admin/staff/[id]/revoke`
  - `POST /api/admin/staff/[id]/disable`

## Admin Surface Flows

### Dashboard

- Route: `/admin/dashboard`
- Supported actions:
  - view stat cards
  - open filtered dashboard views through stat-card links
  - search orders by customer
  - filter orders by status
  - create new draft order
  - create new customer inline while creating a draft
  - open order detail from an order row
  - change order status inline
  - bulk-update or bulk-delete selected orders
  - download CSV from order rows
  - copy customer deep link for an order

### Customers list

- Route: `/admin/customers`
- Supported actions:
  - search customers
  - add customer
  - select customers
  - bulk delete selected customers
  - open customer detail
  - copy customer portal URL

### Customer detail

- Route: `/admin/customers/[id]`
- Supported actions:
  - view customer detail
  - inspect quick email/phone links
  - inspect customer order history
  - view customer portal access link
  - copy customer portal access link
  - regenerate customer portal token
  - edit business/contact/email/phone/address/city/state/zip
  - toggle show prices
  - toggle custom pricing
  - set default grouping
  - save customer profile/settings changes
  - create or reopen a draft order for a selected delivery date
  - open order detail from customer order history
  - open the customer-specific products manager
  - delete customer

### Customer products

- Route: `/admin/customers/[id]/products`
- Supported actions:
  - toggle hidden products for that customer
  - edit custom pricing
  - discard/save custom pricing changes
  - create custom customer-only product

### Catalog

- Routes:
  - `/admin/catalog`
  - `/admin/catalog/[id]`
- Supported actions on list page:
  - search catalog
  - add product
  - create new brand inline during product creation
  - create new size unit inline during product creation
  - upload product image
  - select products
  - reorder products by drag
  - reorder selected products by move top/bottom/position
  - bulk delete products
  - open product detail

### Pallet deals

- Routes:
  - `/admin/catalog/pallets`
  - `/admin/catalog/pallets/[id]`
- Supported actions:
  - view pallet deals
  - open pallet detail
  - edit pallet contents/items
  - manage pallet configuration and visibility

### Brands

- Route: `/admin/brands`
- Supported actions:
  - search brands
  - create/edit/delete brands through the brand manager UI
  - upload/change brand logo where the manager supports it

### Orders alias route

- Route: `/admin/orders`
- Behavior:
  - redirects to `/admin/dashboard` with any query filters preserved

### Order detail

- Route: `/admin/orders/[id]`
- Supported actions:
  - inspect a specific order
  - inspect line items and totals
  - open linked customer detail
  - open linked product or pallet detail from line items
  - add product to a draft order
  - update order status through detail surface
  - mark submitted orders as delivered
  - download CSV
  - copy customer portal order deep link
  - cancel order back to draft
  - delete order
  - navigate back to the filtered dashboard context

### Reports

- Route: `/admin/reports`
- Supported actions:
  - run report for date range
  - inspect order summary
  - inspect revenue summary
  - inspect top products

## Customer Portal Flows

### Portal home

- Route: `/portal/[token]`
- Audience: bearer-link customer
- Supported actions:
  - view upcoming draft/current orders
  - view past orders
  - start new order via date selector

### New order / order builder

- Route: `/portal/[token]/order/[date]`
- Supported actions:
  - browse purchase catalog
  - search products
  - filter by brand
  - filter by size
  - switch grouping between brand and size
  - view "New Items"
  - expand/collapse grouped product sections
  - add/update/remove product quantities
  - switch into pallet-deal mode
  - filter pallet deals by selected product
  - select single pallets
  - set mixed-pallet quantities
  - review current order in sidebar/sheet
  - reset all items
  - submit order

### Existing order / readonly order

- Route: `/portal/[token]/order/link/[id]`
- Supported actions:
  - view readonly submitted/delivered order content
  - export CSV when surfaced
  - reorder/clone where surfaced
  - cancel back to draft where surfaced

### Account

- Route: `/portal/[token]/account`
- Supported actions:
  - update contact name
  - update email
  - update phone
  - update address/city/state/zip
  - save changes

### Orders alias route

- Route: `/portal/[token]/orders`
- Behavior:
  - redirects back to canonical portal home

### Invalid token

- Route family: `/portal/[bad-token]/*`
- Supported behavior:
  - show not-found/error behavior instead of portal content

## Compatibility Route Flows

### Legacy customer routes

- Route family: `/c/[token]/*`
- Supported behavior:
  - compatibility redirect only
  - old shared links should land on equivalent `/portal/[token]/*` pages

## Upload and Asset Flows

### Admin uploads

- Backend: `POST /api/uploads`
- Supported actions from admin UIs:
  - upload product image
  - upload brand logo
  - upload pallet asset where surfaced
- Supported validation behavior:
  - reject unsupported file types
  - reject oversize files
  - return app-owned URL

### Uploaded asset consumption

- Product/catalog and brand surfaces render uploaded asset URLs
- ST-9 must verify both the upload action and the final render target

## API-Driven Flows That Must Be Certified Through UI

These are not standalone user routes, but they are part of supported UI behavior and therefore part of ST-9:

- admin staff invite/create/resend/revoke/disable APIs
- customer create/regenerate-token APIs
- admin bulk order/customer/product/brand operations
- portal order create/update/status/clone/csv/profile APIs
- upload API

`ST-9` should certify them through the UI whenever a supported UI trigger exists, and only drop to direct API verification when the UX is intentionally thin.

## Explicitly Manual or Collaborative Flows

These are still product flows, but they require human observation even if a scripted trigger exists:

- invite email receipt, branding, sender, CTA target
- password setup email receipt and CTA target
- password reset email receipt and CTA target
- portal access-link sharing/copy wording
- any visual/copy judgment call on key screens

## How To Use This Inventory

- If a supported behavior appears here, it belongs in the ST-9 certification matrix.
- If a flow is absent here but present in the product, the inventory is incomplete and must be updated before ST-9 can be called comprehensive.
- If a flow is in the matrix but not grounded here, the matrix is drifting from the actual application.
