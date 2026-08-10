-- ============================================================================
-- ClaimNX Phase 5: Organization Member Management
-- Post-remediation validation (READ ONLY)
-- ============================================================================

SELECT
    member.id AS organization_member_id,
    member.organization_id,
    member.user_id,
    member.status,
    member.created_by IS NOT NULL AS created_by_ready,
    member.updated_by IS NOT NULL AS updated_by_ready,
    member.created_at IS NOT NULL AS created_at_ready,
    member.updated_at IS NOT NULL AS updated_at_ready,
    member.version AS current_version,
    member.version >= 2 AS version_incremented,
    member.deleted_at IS NULL
        AND COALESCE(member.is_deleted, FALSE) = FALSE AS remains_active_and_not_deleted
FROM public.organization_members member
WHERE member.id = '131d5625-0462-426e-979c-e7e56a4db7ae'::UUID;
