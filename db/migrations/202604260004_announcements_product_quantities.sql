-- Per-product quantity preselection + lock for announcements.
--
-- Lets a salesman seed each product in a promo with a default quantity and
-- decide whether the customer can adjust it. Shape:
--
--   { "<product_id>": { "default_qty": number, "locked": boolean }, ... }
--
-- Both fields are optional at runtime — missing entries fall back to the
-- existing behavior (stepper starts at 0 / existing-draft qty, fully
-- editable). Stored as jsonb so we can evolve the per-product object
-- without further migrations.

alter table announcements
  add column if not exists product_quantities jsonb not null default '{}'::jsonb;
