-- ClaimNX Phase 9 Financial Management completion validation (READ ONLY).
-- Expected: every boolean is true. Counts may be greater than zero after API tests.
SELECT
  to_regclass('public.financial_remittance_batch') IS NOT NULL AS remittance_batch_table_exists,
  to_regclass('public.financial_remittance_evidence') IS NOT NULL AS remittance_evidence_table_exists,
  EXISTS (SELECT 1 FROM pg_proc procedure_record JOIN pg_namespace schema_record ON schema_record.oid = procedure_record.pronamespace WHERE schema_record.nspname = 'public' AND procedure_record.proname = 'create_financial_remittance_batch') AS create_remittance_batch_function_exists,
  EXISTS (SELECT 1 FROM pg_proc procedure_record JOIN pg_namespace schema_record ON schema_record.oid = procedure_record.pronamespace WHERE schema_record.nspname = 'public' AND procedure_record.proname = 'create_financial_remittance_evidence') AS create_remittance_evidence_function_exists,
  EXISTS (
    SELECT 1 FROM public.reference_values value
    JOIN public.reference_categories category ON category.id = value.category_id
    WHERE category.code = 'FINANCIAL_REMITTANCE_STATUS'
      AND value.code = 'RECEIVED'
      AND value.organization_id IS NULL
      AND value.is_active = TRUE
      AND value.deleted_at IS NULL
      AND COALESCE(value.is_deleted, FALSE) = FALSE
  ) AS received_remittance_status_exists,
  NOT EXISTS (
    SELECT 1
    FROM public.financial_remittance_batch batch
    WHERE batch.deleted_at IS NULL
      AND (batch.organization_id IS NULL OR batch.hospital_id IS NULL OR batch.created_by IS NULL OR batch.updated_by IS NULL OR batch.version < 1)
  ) AS active_remittance_batch_audit_and_scope_valid,
  NOT EXISTS (
    SELECT 1
    FROM public.financial_remittance_evidence evidence
    WHERE evidence.deleted_at IS NULL
      AND (evidence.organization_id IS NULL OR evidence.hospital_id IS NULL OR evidence.created_by IS NULL OR evidence.updated_by IS NULL OR evidence.version < 1)
  ) AS active_remittance_evidence_audit_and_scope_valid,
  (SELECT COUNT(*) FROM public.financial_remittance_batch WHERE deleted_at IS NULL) AS active_remittance_batch_count,
  (SELECT COUNT(*) FROM public.financial_remittance_evidence WHERE deleted_at IS NULL) AS active_remittance_evidence_count;
