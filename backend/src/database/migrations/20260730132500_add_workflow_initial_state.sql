-- ============================================================================
-- ClaimNX Phase 6: Add approved Workflow Definition initial-State invariant
-- ============================================================================
-- Corrects an omission in the original additive schema migration. The approved
-- Workflow Definition aggregate requires exactly one active initial State prior
-- to activation. This migration is backward-compatible and does not replace or
-- remove any legacy Workflow structure.
-- ============================================================================

BEGIN;

ALTER TABLE public.workflow_states
    ADD COLUMN IF NOT EXISTS is_initial BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_workflow_states_definition_initial_active
    ON public.workflow_states (workflow_definition_id)
    WHERE is_initial = TRUE
      AND deleted_at IS NULL
      AND COALESCE(is_deleted, FALSE) = FALSE;

COMMENT ON COLUMN public.workflow_states.is_initial IS
    'Approved Workflow Definition start State. Exactly one active initial State is allowed per Definition; activation requires one.';

COMMIT;
