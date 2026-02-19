-- Add access_token column to profiles for customer portal links
ALTER TABLE profiles ADD COLUMN access_token text;

-- Unique index (only non-null tokens) for fast lookups
CREATE UNIQUE INDEX idx_profiles_access_token ON profiles (access_token) WHERE access_token IS NOT NULL;

-- Backfill existing customers with random tokens
UPDATE profiles
SET access_token = encode(gen_random_bytes(16), 'hex')
WHERE role = 'customer' AND access_token IS NULL;

-- Drop FK from profiles.id -> auth.users(id)
-- Salesmen still use auth, but customers won't have auth.users rows going forward
ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;

-- Ensure every customer has a token
ALTER TABLE profiles ADD CONSTRAINT chk_customer_has_token
  CHECK (role != 'customer' OR access_token IS NOT NULL);
