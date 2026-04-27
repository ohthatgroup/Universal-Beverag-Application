-- Admin prompts v2: customer outreach log + message template overrides.
--
-- `customer_outreach` records every "I contacted this customer" action
-- driven by a prompt drawer (or any future contact action). Powers the
-- 21-day suppression rule for outreach-driven prompts and serves as
-- the audit trail for "have we reached out about this?".
--
-- `message_templates` stores admin-edited overrides for the per-kind
-- default templates compiled into the resolver. Empty by default; the
-- resolver falls back to the in-code default when no row exists.

create table if not exists customer_outreach (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles(id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'sms', 'email')),
  kind text not null,
  sent_at timestamptz not null default now(),
  salesman_id uuid references profiles(id) on delete set null,
  message_snapshot text not null,
  related_order_id uuid references orders(id) on delete set null
);

create index if not exists idx_customer_outreach_customer_sent
  on customer_outreach (customer_id, sent_at desc);

create index if not exists idx_customer_outreach_kind_sent
  on customer_outreach (kind, sent_at desc);

create table if not exists message_templates (
  kind text primary key,
  body text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id) on delete set null
);
