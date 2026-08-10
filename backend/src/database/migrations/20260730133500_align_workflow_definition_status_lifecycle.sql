-- ============================================================================
-- ClaimNX Phase 6: Workflow Definition lifecycle status alignment
-- ============================================================================
-- Objective: allow the approved inactive/retired Definition lifecycle state.
-- Why: the command function retires a Definition by setting status = INACTIVE.
-- Safety: Workflow Definition records were validated as empty before Phase 6.
-- ============================================================================

BEGIN;

ALTER TABLE public.workflow_definitions
    DROP CONSTRAINT IF EXISTS chk_workflow_definitions_status;

ALTER TABLE public.workflow_definitions
    ADD CONSTRAINT ck_workflow_definitions_status
    CHECK (status IN ('DRAFT', 'ACTIVE', 'INACTIVE'));

COMMENT ON COLUMN public.workflow_definitions.status IS
    'Workflow Definition lifecycle: DRAFT, ACTIVE, or INACTIVE. Retirement transitions an unused Definition to INACTIVE.';

COMMIT;
