-- ============================================================================
-- ClaimNX Phase 5: Organization Member Management
-- Approved-audit remediation candidate (WRITE SCRIPT — RUN ONLY AFTER APPROVAL)
-- ============================================================================
-- Scope:
--   Repairs the missing created_by and updated_by audit actors on the one
--   verified legacy Organization Member record. The actor is the existing IAM
--   User already linked to the membership and verified in the read-only check.
--
-- Safety:
--   - One explicit Organization Member UUID only.
--   - One explicit, existing IAM User UUID only.
--   - Transactional: any failed validation rolls back the entire operation.
--   - Does not change Organization, User, status, employment fields, Hospital
--     Member records, or access-scope records.
--   - Increments version because this is a persisted record correction.
-- ============================================================================

BEGIN;

DO $$
DECLARE
    migration_actor_id UUID := '09a6e607-4846-4d4d-9ad3-86ae90310f18';
    target_organization_member_id UUID := '131d5625-0462-426e-979c-e7e56a4db7ae';
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.users user_record
        WHERE user_record.id = migration_actor_id
    ) THEN
        RAISE EXCEPTION 'Organization Member audit remediation blocked: migration actor does not exist.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.organization_members member
        WHERE member.id = target_organization_member_id
          AND member.user_id = migration_actor_id
          AND member.deleted_at IS NULL
          AND COALESCE(member.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'Organization Member audit remediation blocked: target member is missing, retired, or not linked to the verified actor.';
    END IF;

    UPDATE public.organization_members member
    SET
        created_by = COALESCE(member.created_by, migration_actor_id),
        updated_by = migration_actor_id,
        updated_at = NOW(),
        version = member.version + 1
    WHERE member.id = target_organization_member_id
      AND (member.created_by IS NULL OR member.updated_by IS NULL);

    IF EXISTS (
        SELECT 1
        FROM public.organization_members member
        WHERE member.id = target_organization_member_id
          AND (member.created_by IS NULL OR member.updated_by IS NULL)
    ) THEN
        RAISE EXCEPTION 'Organization Member audit remediation did not complete successfully.';
    END IF;
END $$;

COMMIT;
