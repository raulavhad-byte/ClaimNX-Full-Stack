# Tenant Configuration — Workflow Design and Implementation Plan

| Field | Value |
|---|---|
| Module | Tenant Management |
| Capability | Tenant Configuration |
| Phase | Phase 5 |
| Status | Draft — approval required before physical database design |
| Prerequisite | Architecture Review approved |
| Date | 2026-07-30 |

## Objective

Define approved workflows and the exact implementation order for Tenant
Configuration before physical database design begins.

## Workflow 1 — Create Tenant Override

```text
Authorized actor
  ↓
Authenticated Organization route
  ↓
Active Organization membership check
  ↓
Load active Configuration Definition by known key or identifier
  ↓
Confirm definition permits Organization override
  ↓
Validate configured value against definition type/rule
  ↓
Confirm no active override exists for Organization + Definition
  ↓
Create override at version 1 with audit actor
  ↓
Return override
```

## Workflow 2 — Update Tenant Override

```text
Authorized actor
  ↓
Authenticated Organization route and membership check
  ↓
Load active Organization-owned override
  ↓
Validate expected version
  ↓
Validate new configured value against Definition
  ↓
Atomic versioned update plus audit update
  ↓
Return updated override
```

## Workflow 3 — Activate / Deactivate

```text
Authorized actor
  ↓
Tenant and override ownership validation
  ↓
Expected version check
  ↓
Transition ACTIVE ⇄ INACTIVE
  ↓
Increment version and record audit actor
  ↓
Return resulting override
```

## Workflow 4 — Retire Tenant Override

```text
Authorized actor
  ↓
Tenant and override ownership validation
  ↓
Expected version check
  ↓
Soft-delete override; record deleted/updated actor and timestamps
  ↓
Increment version
  ↓
Platform default becomes effective
```

## Workflow 5 — Resolve Effective Configuration

```text
Authorized actor / approved consumer
  ↓
Tenant membership and known-key validation
  ↓
Load active Configuration Definition
  ↓
Load active, non-deleted Organization override if present
  ↓
Return override value; otherwise Definition default
```

## Implementation Sequence

The implementation order is mandatory.

| Order | Deliverable | Status |
|---|---|---|
| 1 | Business Understanding | Complete and approved |
| 2 | Domain Analysis | Complete and approved |
| 3 | Bounded Context and Aggregate Design | Complete and approved |
| 4 | Logical ERD and Data Model | Complete and approved |
| 5 | Architecture Review and API Principles | Complete and approved |
| 6 | Workflow Design and Implementation Plan | Draft — current approval gate |
| 7 | Physical Database Design | Blocked pending approval |
| 8 | PostgreSQL migration strategy and scripts | Blocked |
| 9 | Domain Layer | Blocked |
| 10 | Repository Layer | Blocked |
| 11 | Application Layer | Blocked |
| 12 | API Layer and DTO validation | Blocked |
| 13 | Testing and integration validation | Blocked |

## Physical Database Design Scope — Next Step

The physical design must decide and document:

1. Whether the existing `organization_configurations` table evolves in place
   or is complemented by new approved definition/override tables.
2. The source of truth for Configuration Definitions and their defaults.
3. UUID generation strategy consistent with ClaimNX application-generated
   business identifiers.
4. Exact audit, version, soft-delete, foreign key, check, uniqueness, and
   index strategy.
5. A data migration and compatibility plan that never drops existing tables or
   silently changes existing tenant settings.

## Implementation Guardrails

- Do not use an ORM schema as the source of truth.
- Do not make frontend configuration choices authoritative.
- Do not add a generic `config_key` write API without catalogue validation.
- Do not drop, rename, or recreate `organization_configurations`.
- Do not begin NestJS implementation before SQL architecture review and
  migration approval.
- Do not store secrets or credentials in Tenant Configuration.

## Validation Plan

| Area | Required validation |
|---|---|
| Tenant isolation | Cross-Organization reads/writes rejected |
| Catalogue governance | Unknown/non-overridable/inactive definitions rejected |
| Value validation | Wrong type/range/enum rejected |
| Concurrency | Stale update/state change returns `409 Conflict` |
| Lifecycle | Inactive/retired override falls back to platform default |
| Audit | Every write has valid audit actor and timestamp |
| Uniqueness | Duplicate active Organization + Definition rejected |
| Compatibility | Existing settings remain readable and are preserved |

## Pause for Approval

Approve or amend this Workflow Design and Implementation Plan. After approval,
we begin Physical Database Design, starting with legacy-table assessment and
Configuration Definition physical design.

## Final Implementation Status — 2026-07-30

This section supersedes the earlier planning statuses. Tenant Configuration is
complete for the approved Phase 5 scope.

| Deliverable | Final Status |
|---|---|
| Physical Database Design | Complete and approved |
| PostgreSQL migrations | Complete and applied to Supabase |
| Domain Layer | Complete |
| Repository Layer | Complete |
| Application Layer | Complete |
| REST API and DTO validation | Complete |
| Integration validation | Complete |

### Applied Migrations

- `20260730110000_create_configuration_definitions.sql`
- `20260730111000_evolve_organization_configurations_for_tenant_configuration.sql`
- `20260730112000_seed_configuration_definitions.sql`
- `20260730113000_create_tenant_configuration_override_functions.sql`

### Validation Evidence

| Validation | Result |
|---|---|
| Structural schema checks | Passed: tables, foreign keys, and active uniqueness indexes exist. |
| Initial catalogue | Passed: five approved active Definitions have correct audit ownership and version `1`. |
| Effective-value read | Passed: `platform.date_format` resolves to `DD/MM/YYYY` from `DEFAULT`. |
| Override lifecycle | Passed: create, update, deactivate, activate, retire, and default restoration verified. |
| Invalid value | Passed: invalid enum value returns `400 Bad Request`. |
| Tenant isolation | Passed: cross-Organization reads and writes return `403 Forbidden`. |
| Optimistic concurrency | Passed: stale update returns `409 Conflict`. |
| Cleanup | Passed: controlled temporary overrides are absent from active reads after retirement. |

### Code Verification

- Tenant Configuration unit tests: `14` passed.
- NestJS production build: passed.

New catalogue keys, additional value types, or configuration policies must
begin with business approval from their owning bounded context.
