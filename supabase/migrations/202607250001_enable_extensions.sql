BEGIN;

-- ============================================================================
-- ClaimNX Enterprise RCM Platform
-- Migration : 202607250001_enable_extensions.sql
-- Description : Enable required PostgreSQL extensions
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

COMMENT ON EXTENSION pgcrypto IS
'Provides cryptographic functions including gen_random_uuid().';

COMMIT;