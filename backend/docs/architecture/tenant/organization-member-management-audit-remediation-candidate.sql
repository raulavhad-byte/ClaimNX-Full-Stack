-- ============================================================================
-- ClaimNX Phase 5: Organization Member Management
-- Audit Remediation Candidate Check (READ ONLY)
-- ============================================================================
-- Objective:
--   Show every Organization Member missing an audit actor and the existing
--   IAM User linked to that membership. Review this result before any audit
--   remediation is proposed.
--
-- Safety:
--   This script contains SELECT statements only. It makes no database change.
-- ============================================================================

SELECT
    member.id AS organization_member_id,
    member.organization_id,
    member.user_id AS member_user_id,
    user_record.email AS member_user_email,
    member.status,
    member.created_by,
    member.created_at,
    member.updated_by,
    member.updated_at,
    member.version,
    member.deleted_at,
    member.is_deleted,
    CASE
        WHEN user_record.id IS NULL THEN 'BLOCKED: membership user does not exist in public.users'
        WHEN member.deleted_at IS NOT NULL OR COALESCE(member.is_deleted, FALSE) = TRUE THEN 'REVIEW: retired membership'
        ELSE 'CANDIDATE: linked active IAM User; confirm this user is the correct migration audit actor'
    END AS remediation_review_status
FROM public.organization_members member
LEFT JOIN public.users user_record
  ON user_record.id = member.user_id
WHERE member.created_by IS NULL
   OR member.updated_by IS NULL
ORDER BY member.created_at, member.id;
