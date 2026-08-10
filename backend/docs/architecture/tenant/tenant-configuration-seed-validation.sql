-- Tenant Configuration initial catalogue validation (read only)
-- Expected result: exactly five active records, all owned by the approved audit user.

SELECT
    configuration_key,
    configuration_category,
    value_type,
    default_value,
    override_allowed,
    status,
    version,
    created_by = '09a6e607-4846-4d4d-9ad3-86ae90310f18'::UUID AS approved_audit_owner
FROM public.configuration_definitions
WHERE deleted_at IS NULL
  AND status = 'ACTIVE'
ORDER BY configuration_key;

SELECT
    COUNT(*) = 5 AS exactly_five_active_definitions,
    COUNT(*) FILTER (WHERE configuration_key IN (
        'platform.time_zone',
        'platform.default_currency',
        'platform.date_format',
        'platform.feature.document_uploads_enabled',
        'platform.feature.notifications_enabled'
    )) = 5 AS approved_keys_present,
    COUNT(*) FILTER (WHERE created_by = '09a6e607-4846-4d4d-9ad3-86ae90310f18'::UUID
                     AND updated_by = '09a6e607-4846-4d4d-9ad3-86ae90310f18'::UUID) = 5 AS audit_owners_valid,
    COUNT(*) FILTER (WHERE version = 1) = 5 AS versions_valid
FROM public.configuration_definitions
WHERE deleted_at IS NULL
  AND status = 'ACTIVE';
