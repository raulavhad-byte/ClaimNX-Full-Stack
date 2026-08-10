BEGIN;

-- Phase 5 compatibility migration.
-- Only missing audit values are populated; existing audit history is never overwritten.

DO $$
DECLARE
    migration_actor_id UUID := '09a6e607-4846-4d4d-9ad3-86ae90310f18';
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = migration_actor_id) THEN
        RAISE EXCEPTION 'Configured Phase 5 migration audit actor does not exist in public.users.';
    END IF;

    UPDATE hospitals
    SET
        created_by = COALESCE(created_by, migration_actor_id),
        updated_by = COALESCE(updated_by, migration_actor_id),
        created_at = COALESCE(created_at, NOW()),
        updated_at = COALESCE(updated_at, NOW())
    WHERE created_by IS NULL
       OR updated_by IS NULL
       OR created_at IS NULL
       OR updated_at IS NULL;

    IF EXISTS (
        SELECT 1
        FROM hospitals
        WHERE created_by IS NULL
           OR updated_by IS NULL
           OR created_at IS NULL
           OR updated_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Hospital audit remediation did not complete successfully.';
    END IF;
END $$;

COMMIT;
