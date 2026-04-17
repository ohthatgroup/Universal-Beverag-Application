alter table profiles
  add column if not exists disabled_at timestamptz;

create table if not exists staff_invites (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  status text not null check (status in ('pending', 'accepted', 'revoked')),
  created_by uuid not null references profiles(id),
  last_sent_at timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_staff_invites_pending_profile
  on staff_invites(profile_id)
  where status = 'pending';

create unique index if not exists idx_staff_invites_pending_email
  on staff_invites (lower(email))
  where status = 'pending';

create index if not exists idx_profiles_disabled_at
  on profiles(disabled_at)
  where disabled_at is not null;

drop trigger if exists trg_staff_invites_updated_at on staff_invites;
create trigger trg_staff_invites_updated_at
before update on staff_invites
for each row
execute procedure set_updated_at();
