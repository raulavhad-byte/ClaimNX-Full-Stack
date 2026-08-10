# Tenant Configuration — Physical Database Design

| Field | Value |
|---|---|
| Module | Tenant Management |
| Capability | Tenant Configuration |
| Phase | Phase 5 |
| Status | Draft — approval required before SQL architecture review |
| Prerequisites | Workflow and implementation plan approved; database preflight completed |
| Database | PostgreSQL / Supabase |
| Date | 2026-07-30 |

## Objective

Define the production PostgreSQL physical design for the platform Configuration
Definition catalogue and Organization-scoped Tenant Configuration Overrides.

## Why

Tenant overrides must be governed by platform definitions, isolated by
Organization, auditable, soft-deletable, versioned, and safe to evolve without
breaking the existing `organization_configurations` foundation.

## Preflight Result

The read-only Supabase preflight confirmed:

| Check | Result |
|---|---|
| Existing override records | 0 |
| Active/inactive/retired records | 0 / 0 / 0 |
| Existing configuration keys | None |
| Inbound dependencies | None |
| Existing foreign key | `organization_configurations.organization_id → organizations.id` |
| Audit/version invalid records | 0 |

**Decision:** Evolve `public.organization_configurations` forward in place.
It will not be dropped, renamed, or recreated.

## Table 1 — `configuration_definitions`

### Ownership

Platform Configuration Catalogue owns this table. Tenant Configuration reads
definitions but does not let Organization users administer them in Phase 5.

### Column Design

| Column | Type | Required | Purpose |
|---|---|---|---|
| `configuration_definition_id` | UUID | Yes | Application-generated primary key |
| `configuration_key` | VARCHAR(150) | Yes | Globally unique stable machine key |
| `display_name` | VARCHAR(200) | Yes | Administrator-facing label |
| `configuration_category` | VARCHAR(100) | Yes | Governance grouping |
| `value_type` | VARCHAR(20) | Yes | `BOOLEAN`, `INTEGER`, `STRING`, `ENUM`, `JSON` |
| `default_value` | TEXT | No | Active platform fallback value |
| `validation_rule` | JSONB | No | Approved range, pattern, or allowed values |
| `override_allowed` | BOOLEAN | Yes | Allows Organization override |
| `status` | VARCHAR(20) | Yes | `ACTIVE` or `INACTIVE` |
| `created_by`, `created_at` | UUID, TIMESTAMPTZ | Yes | Creation audit |
| `updated_by`, `updated_at` | UUID, TIMESTAMPTZ | Yes | Update audit |
| `deleted_by`, `deleted_at` | UUID, TIMESTAMPTZ | No | Soft-delete audit |
| `version` | INTEGER | Yes | Starts at `1` |

### Constraints

| Name | Rule |
|---|---|
| `pk_configuration_definitions` | Primary key on `configuration_definition_id` |
| `uq_configuration_definitions_key_active` | One active non-deleted normalized configuration key |
| `ck_configuration_definitions_key_not_blank` | Key cannot be blank |
| `ck_configuration_definitions_value_type` | Approved value type only |
| `ck_configuration_definitions_status` | `ACTIVE` or `INACTIVE` only |
| `ck_configuration_definitions_version` | `version >= 1` |
| `fk_configuration_definitions_*_user` | Audit actors reference `public.users(id)` |

### Index Strategy

| Index | Purpose |
|---|---|
| `idx_configuration_definitions_category_active` | Discover active definitions by category |
| `idx_configuration_definitions_key_active` | Resolve known key efficiently |

## Table 2 — `organization_configurations` (evolved in place)

### Ownership

Tenant Configuration owns Organization-specific overrides. The physical table
retains its existing name to preserve compatibility; its logical name is
**Tenant Configuration Override**.

### Existing Columns Retained

`id`, `organization_id`, `config_key`, `config_value`, `description`,
`status`, audit fields, `is_deleted`, and `version` remain. The existing `id`
is the physical implementation of the logical Tenant Configuration Override
identifier.

### New Column

| Column | Type | Required after migration | Purpose |
|---|---|---|---|
| `configuration_definition_id` | UUID | Yes | Governing platform definition |

### Compatibility Rules

1. `config_key` remains as a legacy-compatible mirror of the referenced
   Definition key; new writes must not accept it as an uncontrolled input.
2. `config_value` remains the canonical Organization override value and is
   validated against the referenced Definition.
3. `description` remains an optional administrator note; it does not override
   Definition validation or display metadata.
4. Because there is no existing data, audit actor columns can be made required
   and given foreign keys in the approved migration.
5. UUID defaults are removed from business identifiers in the final migration;
   the application supplies new override and definition UUIDs.

### Constraints

| Name | Rule |
|---|---|
| `fk_organization_configurations_definition` | Definition reference to `configuration_definitions` |
| `fk_organization_configurations_created_by_user` | `created_by → users.id` |
| `fk_organization_configurations_updated_by_user` | `updated_by → users.id` |
| `fk_organization_configurations_deleted_by_user` | `deleted_by → users.id` |
| `uq_organization_configurations_org_definition_active` | One active non-deleted override per Organization + Definition |
| `ck_organization_configurations_status` | `ACTIVE` or `INACTIVE` |
| `ck_organization_configurations_version` | `version >= 1` |
| `ck_organization_configurations_key_not_blank` | Legacy mirror key cannot be blank |

### Index Strategy

| Index | Purpose |
|---|---|
| `idx_organization_configurations_organization_active` | List Organization overrides |
| `idx_organization_configurations_definition_active` | Resolve override for a Definition |
| `uq_organization_configurations_org_definition_active` | Enforce and retrieve active override efficiently |

## Referential Integrity and Delete Rules

| Source | Target | Delete rule |
|---|---|---|
| `organization_configurations.organization_id` | `organizations.id` | `RESTRICT` |
| `organization_configurations.configuration_definition_id` | `configuration_definitions.configuration_definition_id` | `RESTRICT` |
| Audit actor columns | `users.id` | `RESTRICT` |

Normal business deletion is always soft deletion. No physical cascade is
permitted for definitions or tenant overrides.

## Value Validation Strategy

The database enforces structural integrity, ownership, status, version, and
active uniqueness. The application and transactional SQL write boundary enforce
Definition-specific value type and validation rules.

The initial migration will not seed arbitrary business definitions. A separate
reviewed definition-seed migration is required after the business confirms the
initial approved configuration keys.

## Migration Strategy

1. Re-run read-only preflight checks in the migration transaction.
2. Create `configuration_definitions` without defaults for business UUIDs.
3. Add nullable `configuration_definition_id` to existing table.
4. Because the table has zero records, enforce audit fields and Definition
   relationship after structural validation.
5. Add constraints and partial active uniqueness indexes.
6. Retain legacy `config_key` and `config_value` for compatibility.
7. Do not seed tenant overrides until catalogue definitions are approved.
8. Verify zero data loss, foreign keys, indexes, and audit integrity.

## Validation

- Existing foundation data: zero records; no migration data conversion needed.
- Existing dependency: only Organization owner foreign key.
- No destructive operation is proposed.
- Tenant isolation, audit, soft delete, and concurrency are present in both
  tables.
- No PostgreSQL migration has been written yet.

## Pause for Approval

Approve or amend this Physical Database Design. The next step is SQL
Architecture Review and then forward-only PostgreSQL migration scripts.
