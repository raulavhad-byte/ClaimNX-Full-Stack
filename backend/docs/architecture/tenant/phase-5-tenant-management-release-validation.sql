-- ClaimNX Phase 5 Tenant Management release validation (READ ONLY).
-- Every *_exists, *_integrity, and *_ready value must return true.

SELECT
    to_regclass('public.hospitals') IS NOT NULL AS hospitals_table_exists,
    to_regclass('public.hospital_address') IS NOT NULL AS hospital_address_table_exists,
    to_regclass('public.hospital_contact') IS NOT NULL AS hospital_contact_table_exists,
    to_regclass('public.hospital_department') IS NOT NULL AS hospital_department_table_exists,
    to_regclass('public.configuration_definitions') IS NOT NULL AS configuration_definitions_table_exists,
    to_regclass('public.organization_configurations') IS NOT NULL AS organization_configurations_table_exists,
    to_regclass('public.organization_members') IS NOT NULL AS organization_members_table_exists,
    EXISTS (
        SELECT 1
        FROM pg_constraint constraint_record
        WHERE constraint_record.conrelid = 'public.hospitals'::regclass
          AND constraint_record.conname = 'fk_hospitals_primary_address'
          AND constraint_record.contype = 'f'
    ) AS hospital_primary_address_integrity,
    EXISTS (
        SELECT 1
        FROM pg_constraint constraint_record
        WHERE constraint_record.conrelid = 'public.hospitals'::regclass
          AND constraint_record.conname = 'fk_hospitals_primary_contact'
          AND constraint_record.contype = 'f'
    ) AS hospital_primary_contact_integrity,
    EXISTS (
        SELECT 1
        FROM pg_constraint constraint_record
        WHERE constraint_record.conrelid = 'public.organization_members'::regclass
          AND constraint_record.conname = 'ck_organization_members_soft_delete_consistency'
          AND constraint_record.contype = 'c'
    ) AS organization_member_soft_delete_integrity,
    EXISTS (
        SELECT 1
        FROM pg_constraint constraint_record
        WHERE constraint_record.contype = 'f'
          AND constraint_record.conrelid = 'public.hospital_members'::regclass
          AND constraint_record.confrelid = 'public.organization_members'::regclass
    ) AS hospital_member_compatibility_integrity,
    (SELECT COUNT(*) FROM public.configuration_definitions definition
      WHERE definition.status = 'ACTIVE'
        AND definition.deleted_at IS NULL) >= 5 AS configuration_catalogue_ready,
    NOT EXISTS (
        SELECT 1
        FROM public.hospitals hospital
        WHERE hospital.deleted_at IS NULL
          AND COALESCE(hospital.is_deleted, FALSE) = FALSE
          AND (hospital.created_by IS NULL OR hospital.updated_by IS NULL OR hospital.version < 1)
    ) AS hospital_audit_ready,
    NOT EXISTS (
        SELECT 1
        FROM public.organization_members member
        WHERE (member.deleted_at IS NULL AND COALESCE(member.is_deleted, FALSE) = TRUE)
           OR (member.deleted_at IS NOT NULL AND COALESCE(member.is_deleted, FALSE) = FALSE)
           OR member.created_by IS NULL
           OR member.updated_by IS NULL
           OR member.version < 1
    ) AS organization_member_audit_ready,
    (SELECT COUNT(*) FROM public.hospitals hospital
      WHERE hospital.deleted_at IS NULL AND COALESCE(hospital.is_deleted, FALSE) = FALSE) AS active_hospital_count,
    (SELECT COUNT(*) FROM public.organization_members member
      WHERE member.deleted_at IS NULL AND COALESCE(member.is_deleted, FALSE) = FALSE) AS active_organization_member_count,
    (SELECT COUNT(*) FROM public.organization_configurations configuration
      WHERE configuration.deleted_at IS NULL AND COALESCE(configuration.is_deleted, FALSE) = FALSE) AS active_configuration_override_count;
