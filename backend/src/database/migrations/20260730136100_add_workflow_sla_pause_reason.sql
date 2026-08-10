-- ============================================================================
-- ClaimNX Phase 6: Add Workflow SLA pause reason
-- ============================================================================
-- Objective: Persist the business reason whenever an active Work Item SLA is
-- paused. This completes the approved Work Item SLA ownership model.
-- Why: SLA pause/resume commands must retain an auditable operational reason.
-- Action: Additive, backward-compatible schema correction.
-- ============================================================================

BEGIN;

ALTER TABLE public.workflow_sla
    ADD COLUMN IF NOT EXISTS pause_reason TEXT;

COMMENT ON COLUMN public.workflow_sla.pause_reason IS
    'Business reason recorded when an active Work Item SLA is paused; cleared when the SLA resumes.';

COMMIT;
