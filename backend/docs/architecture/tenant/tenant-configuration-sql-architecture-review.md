# Tenant Configuration — SQL Architecture Review

| Field | Value |
|---|---|
| Module | Tenant Management |
| Capability | Tenant Configuration |
| Phase | Phase 5 |
| Status | Draft — approval required before PostgreSQL migrations |
| Prerequisite | Physical Database Design approved |
| Date | 2026-07-30 |

## Objective

Review the approved physical design for PostgreSQL correctness, safe migration
ordering, compatibility, security, constraints, and write-boundary behavior.

## Review Decision

**Result: Approved design candidate for forward-only migration.**

The existing `organization_configurations` table has zero records and no
inbound dependencies. It can be safely evolved in place without data mapping,
table drop, table rename, or application downtime assumptions.

## Migration Order

| Order | Migration responsibility | Why this order is required |
|---|---|---|
| 1 | Preflight guard | Stops migration if unexpected configuration data or dependencies appear |
| 2 | Create `configuration_definitions` | Tenant overrides require a governed target definition |
| 3 | Evolve `organization_configurations` | Add Definition relation and enterprise integrity safely |
| 4 | Add indexes and active uniqueness | Applied after columns/constraints exist |
| 5 | Create transactional write functions | Functions depend on final tables, constraints, and indexes |
| 6 | Seed approved Definition catalogue | Separate migration after business keys are approved |
| 7 | Add API permissions | Must exist before management API is enabled |

## Schema Review

### `configuration_definitions`

- UUID primary keys are application-generated; no business-ID default is used.
- `configuration_key` is normalized by the write boundary and uniquely indexed
  among active, non-deleted definitions.
- `validation_rule` uses `JSONB` because validation metadata is structured and
  evolves independently of override records.
- Status, value type, blank key, and version constraints are database-enforced.
- Audit actors use `RESTRICT` foreign keys to prevent historical audit loss.

### `organization_configurations`

- Existing table and column names are retained.
- `configuration_definition_id` is added first, then made required because the
  preflight proves there are no existing rows to map.
- Existing `config_key` remains a compatibility mirror; write functions derive
  it from the Definition and never trust a client-provided value.
- Existing `config_value` remains the stored Organization override value.
- Existing `is_deleted` remains for compatibility; active conditions require
  both `deleted_at IS NULL` and `is_deleted = FALSE`.
- `id` remains the physical override identifier; its UUID default is removed so
  new business identifiers are application-generated.

## Constraint and Index Review

| Concern | Control |
|---|---|
| Definition key duplication | Partial unique index using normalized key, active/non-deleted predicate |
| Override duplication | Partial unique index on `(organization_id, configuration_definition_id)` for active/non-deleted rows |
| Tenant isolation | All write functions accept Organization ID and constrain every update/delete by it |
| Invalid definition | Foreign key plus active/overridable validation in write functions |
| Invalid status/type | Check constraints |
| Audit integrity | Required audit actors/timestamps plus user foreign keys |
| Stale update | `WHERE id = ... AND version = expected_version`, then increment |
| Soft delete | `deleted_at`, `deleted_by`, `is_deleted`, updated audit, version increment |

## Transactional SQL Write Boundary

The following functions will be created after tables and indexes:

| Function | Responsibility |
|---|---|
| `create_tenant_configuration_override` | Validate Definition/type/value; create override at version 1 |
| `update_tenant_configuration_override` | Versioned value update within Organization tenant |
| `set_tenant_configuration_override_status` | Versioned activate/deactivate transition |
| `soft_delete_tenant_configuration_override` | Versioned tenant-scoped retirement |
| `resolve_effective_tenant_configuration` | Return active override or Definition default for a known key |

The functions will validate `BOOLEAN`, `INTEGER`, `STRING`, and `ENUM` in
Phase 5. `JSON` definitions will be blocked from tenant writes until a later
approved JSON-schema validation enhancement.

## Initial Definition Catalogue Decision

The business architecture approved categories, but not specific configuration
keys. Therefore:

- The structural migration creates no arbitrary definitions.
- The tenant override API remains unable to create an override until a separate
  business-approved seed migration defines keys.
- The first seed migration must document each key, category, value type,
  default, validation, override policy, and consuming module.

This prevents accidental product rules from being introduced as database seed
data.

## Permission Dependency

`tenant.configurations.view` and `tenant.configurations.manage` are new IAM
permissions. Their exact storage/seed pattern must be inspected before the
API migration is implemented. The structural schema migration does not enable
any API route or bypass the existing permission model.

## Compatibility and Rollback Position

- No destructive rollback is provided or required.
- Failed migration transactions roll back atomically.
- Future corrections use new forward migrations only.
- Existing zero-row table keeps its identity and Organization relationship.

## Review Checklist

| Check | Result |
|---|---|
| Existing records assessed | Passed: zero |
| Existing dependencies assessed | Passed: no inbound dependencies |
| No table drop/rename proposed | Passed |
| UUID application strategy respected | Passed |
| Audit standard respected | Passed |
| Tenant isolation designed | Passed |
| Soft delete and OCC designed | Passed |
| Definition catalogue governance retained | Passed |
| SQL migration order safe | Passed |

## Pause for Approval

Approve or amend this SQL Architecture Review. After approval, the next step
is the forward-only PostgreSQL structural migration scripts—without seeding
business configuration keys.
