-- ClaimNX Phase 11 - Reporting & BI base schema.
-- Purpose: create the tenant-scoped Reporting aggregate persistence required
-- before command-persistence functions are installed.
-- Security: all business records retain tenant scope, audit metadata, soft
-- deletion fields, and optimistic-concurrency versioning.

BEGIN;

CREATE TABLE IF NOT EXISTS public.report_definitions (
    report_definition_id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    report_code VARCHAR(100) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    description TEXT NULL,
    report_category_reference_value_id UUID NOT NULL,
    data_source_type_reference_value_id UUID NOT NULL,
    output_format_reference_value_id UUID NOT NULL,
    report_status_reference_value_id UUID NOT NULL,
    definition_configuration JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_by UUID NULL,
    deleted_at TIMESTAMPTZ NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    version INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT fk_report_definitions_organization
        FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT,
    CONSTRAINT fk_report_definitions_category
        FOREIGN KEY (report_category_reference_value_id) REFERENCES public.reference_values(id) ON DELETE RESTRICT,
    CONSTRAINT fk_report_definitions_data_source_type
        FOREIGN KEY (data_source_type_reference_value_id) REFERENCES public.reference_values(id) ON DELETE RESTRICT,
    CONSTRAINT fk_report_definitions_output_format
        FOREIGN KEY (output_format_reference_value_id) REFERENCES public.reference_values(id) ON DELETE RESTRICT,
    CONSTRAINT fk_report_definitions_status
        FOREIGN KEY (report_status_reference_value_id) REFERENCES public.reference_values(id) ON DELETE RESTRICT,
    CONSTRAINT fk_report_definitions_created_by
        FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_report_definitions_updated_by
        FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_report_definitions_deleted_by
        FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE RESTRICT,
    CONSTRAINT ck_report_definitions_version
        CHECK (version >= 1),
    CONSTRAINT ck_report_definitions_soft_delete
        CHECK (
            (deleted_at IS NULL AND is_deleted = FALSE)
            OR (deleted_at IS NOT NULL AND is_deleted = TRUE)
        )
);

CREATE TABLE IF NOT EXISTS public.report_schedules (
    report_schedule_id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    report_definition_id UUID NOT NULL,
    schedule_code VARCHAR(100) NOT NULL,
    cron_expression VARCHAR(100) NOT NULL,
    timezone VARCHAR(100) NOT NULL,
    delivery_channel_reference_value_id UUID NOT NULL,
    output_format_reference_value_id UUID NOT NULL,
    report_schedule_status_reference_value_id UUID NOT NULL,
    recipient_configuration JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_by UUID NULL,
    deleted_at TIMESTAMPTZ NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    version INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT fk_report_schedules_organization
        FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT,
    CONSTRAINT fk_report_schedules_definition
        FOREIGN KEY (report_definition_id) REFERENCES public.report_definitions(report_definition_id) ON DELETE RESTRICT,
    CONSTRAINT fk_report_schedules_delivery_channel
        FOREIGN KEY (delivery_channel_reference_value_id) REFERENCES public.reference_values(id) ON DELETE RESTRICT,
    CONSTRAINT fk_report_schedules_output_format
        FOREIGN KEY (output_format_reference_value_id) REFERENCES public.reference_values(id) ON DELETE RESTRICT,
    CONSTRAINT fk_report_schedules_status
        FOREIGN KEY (report_schedule_status_reference_value_id) REFERENCES public.reference_values(id) ON DELETE RESTRICT,
    CONSTRAINT fk_report_schedules_created_by
        FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_report_schedules_updated_by
        FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_report_schedules_deleted_by
        FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE RESTRICT,
    CONSTRAINT ck_report_schedules_version
        CHECK (version >= 1),
    CONSTRAINT ck_report_schedules_cron_expression
        CHECK (BTRIM(cron_expression) <> ''),
    CONSTRAINT ck_report_schedules_soft_delete
        CHECK (
            (deleted_at IS NULL AND is_deleted = FALSE)
            OR (deleted_at IS NOT NULL AND is_deleted = TRUE)
        )
);

CREATE TABLE IF NOT EXISTS public.report_executions (
    report_execution_id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    report_definition_id UUID NOT NULL,
    report_schedule_id UUID NULL,
    execution_reference VARCHAR(100) NOT NULL,
    report_execution_status_reference_value_id UUID NOT NULL,
    report_refresh_status_reference_value_id UUID NOT NULL,
    output_format_reference_value_id UUID NOT NULL,
    requested_by UUID NOT NULL,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ NULL,
    completed_at TIMESTAMPTZ NULL,
    output_location_reference TEXT NULL,
    result_summary JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_by UUID NULL,
    deleted_at TIMESTAMPTZ NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    version INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT fk_report_executions_organization
        FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT,
    CONSTRAINT fk_report_executions_definition
        FOREIGN KEY (report_definition_id) REFERENCES public.report_definitions(report_definition_id) ON DELETE RESTRICT,
    CONSTRAINT fk_report_executions_schedule
        FOREIGN KEY (report_schedule_id) REFERENCES public.report_schedules(report_schedule_id) ON DELETE RESTRICT,
    CONSTRAINT fk_report_executions_status
        FOREIGN KEY (report_execution_status_reference_value_id) REFERENCES public.reference_values(id) ON DELETE RESTRICT,
    CONSTRAINT fk_report_executions_refresh_status
        FOREIGN KEY (report_refresh_status_reference_value_id) REFERENCES public.reference_values(id) ON DELETE RESTRICT,
    CONSTRAINT fk_report_executions_output_format
        FOREIGN KEY (output_format_reference_value_id) REFERENCES public.reference_values(id) ON DELETE RESTRICT,
    CONSTRAINT fk_report_executions_requested_by
        FOREIGN KEY (requested_by) REFERENCES public.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_report_executions_created_by
        FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_report_executions_updated_by
        FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_report_executions_deleted_by
        FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE RESTRICT,
    CONSTRAINT ck_report_executions_version
        CHECK (version >= 1),
    CONSTRAINT ck_report_executions_soft_delete
        CHECK (
            (deleted_at IS NULL AND is_deleted = FALSE)
            OR (deleted_at IS NOT NULL AND is_deleted = TRUE)
        )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_report_definitions_organization_code_active
    ON public.report_definitions (organization_id, report_code)
    WHERE deleted_at IS NULL AND is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_report_definitions_organization_active
    ON public.report_definitions (organization_id)
    WHERE deleted_at IS NULL AND is_deleted = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_report_schedules_organization_code_active
    ON public.report_schedules (organization_id, schedule_code)
    WHERE deleted_at IS NULL AND is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_report_schedules_definition_active
    ON public.report_schedules (report_definition_id)
    WHERE deleted_at IS NULL AND is_deleted = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_report_executions_organization_reference_active
    ON public.report_executions (organization_id, execution_reference)
    WHERE deleted_at IS NULL AND is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_report_executions_definition_active
    ON public.report_executions (report_definition_id, requested_at DESC)
    WHERE deleted_at IS NULL AND is_deleted = FALSE;

COMMENT ON TABLE public.report_definitions IS
    'Phase 11 tenant-scoped Reporting definition aggregate. Query execution is deliberately outside this table.';
COMMENT ON TABLE public.report_schedules IS
    'Phase 11 tenant-scoped schedule for a Reporting definition. Delivery recipients are structured metadata, never credentials.';
COMMENT ON TABLE public.report_executions IS
    'Phase 11 tenant-scoped Reporting execution record. Output references are opaque locations; report payloads are not stored here.';

COMMIT;
