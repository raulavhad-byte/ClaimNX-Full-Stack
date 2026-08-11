-- Persist the User Management directory type and non-authentication profile
-- fields. The browser previously held these values only, so reloading caused
-- every record without local state to be interpreted as a Hospital.

BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS entity_type TEXT NOT NULL DEFAULT 'User'
    CHECK (entity_type IN ('User', 'Hospital', 'Partner')),
  ADD COLUMN IF NOT EXISTS profile_data JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(profile_data) = 'object');

-- Existing application accounts are staff users unless they are explicitly
-- reclassified when edited through the portal.
UPDATE public.users
SET entity_type = 'User'
WHERE entity_type IS NULL;

COMMIT;
