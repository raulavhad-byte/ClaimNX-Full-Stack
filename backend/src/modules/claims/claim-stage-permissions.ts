export interface ClaimStageActor {
  id: string;
  role?: string | null;
  permissions?: unknown;
}

const ADMIN_ROLES = new Set([
  'SUPER ADMIN',
  'ADMIN',
  'PRIMARY ADMIN',
]);

// These keys must remain aligned with ROLE_STAGE_ENTITLEMENTS in the
// frontend. They represent only cashless stages governed by System Access ->
// Roles -> Cashless Stage Visibility. Product-specific statuses outside this
// list continue to use their own authorization rules.
const CASHLESS_STAGE_KEYS = new Set([
  'pending_medical_review',
  'pending_medical_team',
  'medical_query_raised',
  'medical_query_replied',
  'pre_auth_initiated',
  'pre_auth_approved',
  'initial_query_pending',
  'query_reply_done',
  'pre_auth_rejected',
  'enhancement_initiated',
  'enhancement_approved',
  'enhancement_query_raised',
  'enhancement_query_resolved',
  'enhancement_rejected',
  'discharge_initiated',
  'discharge_query_raised',
  'discharge_query_reply',
  'discharge_rejected',
  'discharged_approved',
  'discharge_reconsideration_raised',
  'discharge_reconsideration_approved',
  'file_dispatch_pending',
  'file_dispatched',
  'claim_under_process',
  'claim_under_query',
  'claim_query_resolved',
  'claim_approved',
  'partially_claim_settled_recoverable',
  'partially_claim_settled_non_recoverable',
  'complete_settlement',
  'settlement_failed',
  'account_reconciliation',
  'bank_reconciliation_completed',
]);

const normalizeStageKey = (status: string) => status
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

const CASHLESS_STAGE_ALIASES: Record<string, string> = {
  // ClaimStatus uses "Replied", while role configuration uses "Reply".
  discharge_query_replied: 'discharge_query_reply',
};

export const getStageUpdatePermission = (
  status?: string | null,
): string | null => {
  if (!status) return null;

  const normalizedStatus = normalizeStageKey(status);
  const stageKey = CASHLESS_STAGE_ALIASES[normalizedStatus] ?? normalizedStatus;
  if (!CASHLESS_STAGE_KEYS.has(stageKey)) return null;

  return `stage_permissions:stage_${stageKey}:update`;
};

export const canUpdateClaimAtStage = (
  actor: ClaimStageActor,
  status?: string | null,
): boolean => {
  const requiredPermission = getStageUpdatePermission(status);

  // This entitlement controls only the configured cashless stages. Reads and
  // statuses belonging to another product are intentionally unaffected.
  if (!requiredPermission) return true;

  if (ADMIN_ROLES.has(String(actor.role ?? '').trim().toUpperCase())) {
    return true;
  }

  const permissions = Array.isArray(actor.permissions)
    ? actor.permissions.filter((permission): permission is string => (
        typeof permission === 'string'
      ))
    : [];

  return permissions.some((permission) => {
    const normalizedPermission = permission.trim().toLowerCase();
    return normalizedPermission === 'all' ||
      normalizedPermission === requiredPermission.toLowerCase();
  });
};
