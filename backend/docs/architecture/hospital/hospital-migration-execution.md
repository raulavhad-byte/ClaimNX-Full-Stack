# Hospital Phase 5 Migration Execution Runbook

## Objective

Safely evolve the existing production-compatible Hospital schema to the approved
Phase 5 Hospital aggregate design without dropping or recreating legacy tables.

## Why

`public.hospitals` is already referenced by operational tables. The migration
sequence is therefore additive and validates prerequisites before modifying data.

## Execution Location

Run each file in the Supabase Dashboard **SQL Editor**, using the `postgres`
role and the Primary Database. Run one file at a time, in the exact order below.

## Approved Execution Order

1. `src/database/migrations/20260730089500_seed_ahmedabad_city.sql`
2. `src/database/migrations/20260730090000_seed_hospital_reference_data.sql`
3. `src/database/migrations/20260730090500_assign_hospital_migration_audit_actor.sql`
4. `src/database/migrations/20260730091000_evolve_hospitals_for_phase_5.sql`
5. `src/database/migrations/20260730092000_create_hospital_address_and_contact.sql`
6. `src/database/migrations/20260730093000_migrate_hospital_legacy_address_and_contact.sql`
7. `src/database/migrations/20260730094000_evolve_departments_to_hospital_department.sql`
8. `src/database/migrations/20260730095000_enforce_hospital_primary_child_integrity.sql`
9. `src/database/migrations/20260730095500_enforce_hospital_root_integrity.sql`
10. `src/database/migrations/20260730095600_align_hospital_legacy_write_compatibility.sql`
11. `src/database/migrations/20260730096000_create_hospital_aggregate_function.sql`

## Required Result

Each execution must report success. Stop immediately if any file reports an
error; do not run the next file.

## Post-Migration Validation

Run the following read-only query after all six files succeed:

```sql
SELECT
    h.hospital_code,
    h.display_name,
    CASE
        WHEN COALESCE(h.is_deleted, FALSE) = FALSE
         AND h.deleted_at IS NULL THEN 'ACTIVE'
        ELSE 'SOFT_DELETED'
    END AS lifecycle_state,
    h.created_by IS NOT NULL
        AND h.updated_by IS NOT NULL AS audit_ready,
    COUNT(DISTINCT ha.hospital_address_id)
        FILTER (WHERE ha.deleted_at IS NULL) AS active_addresses,
    COUNT(DISTINCT hc.hospital_contact_id)
        FILTER (WHERE hc.deleted_at IS NULL) AS active_contacts
FROM public.hospitals h
LEFT JOIN public.hospital_address ha
    ON ha.hospital_id = h.id
    AND ha.deleted_at IS NULL
LEFT JOIN public.hospital_contact hc
    ON hc.hospital_id = h.id
    AND hc.deleted_at IS NULL
GROUP BY h.id, h.hospital_code, h.display_name, h.is_deleted, h.deleted_at,
         h.created_by, h.updated_by
ORDER BY h.hospital_code;
```

Every active Hospital must show `audit_ready = true`, `active_addresses = 1`,
and `active_contacts = 1`. Soft-deleted legacy Hospitals are intentionally not
migrated into active child records.

## Pause for Approval

The final Department evolution renames the empty legacy `departments` table in
place. PostgreSQL keeps the existing `hospital_members` foreign key valid; no
Department table is dropped.
