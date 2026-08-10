-- ============================================================================
-- ClaimNX Phase 6: Workflow Instance lifecycle status alignment
-- ============================================================================
-- Objective: allow the approved cancellation lifecycle state.
-- Why: cancel_workflow_instance transitions an open Instance to CANCELLED.
-- Safety: Workflow Instance records were validated as empty before Phase 6.
-- ============================================================================

BEGIN;

ALTER TABLE public.workflow_instances
    DROP CONSTRAINT IF EXISTS chk_workflow_instances_status;

ALTER TABLE public.workflow_instances
    ADD CONSTRAINT ck_workflow_instances_status
    CHECK (status IN ('OPEN', 'CLOSED', 'CANCELLED'));

COMMENT ON COLUMN public.workflow_instances.status IS
    'Workflow Instance lifecycle: OPEN, CLOSED, or CANCELLED. Source references remain immutable after start.';

COMMIT;
