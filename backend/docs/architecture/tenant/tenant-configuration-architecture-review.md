# Tenant Configuration — Architecture Review and API Design Principles

| Field | Value |
|---|---|
| Module | Tenant Management |
| Capability | Tenant Configuration |
| Phase | Phase 5 |
| Status | Draft — approval required before workflow and implementation plan |
| Prerequisite | Logical ERD approved |
| Date | 2026-07-30 |

## Objective

Validate that the Tenant Configuration design respects ClaimNX DDD, Clean
Architecture, tenant-isolation, audit, security, and future-evolution rules.

## Architecture Decision Record

### Decision 1 — Governed catalogue plus Organization override

**Decision:** Configuration Definitions are platform-governed; Organizations
may store only permitted overrides.

**Reason:** A generic free-form setting store would permit inconsistent keys,
invalid values, and unreviewable product behavior.

### Decision 2 — Override aggregate is independent per key

**Decision:** Each Organization + Configuration Definition override is one
aggregate with its own version.

**Reason:** Independent keys can be updated concurrently without a tenant-wide
configuration lock.

### Decision 3 — Effective value is resolved, never copied

**Decision:** Consumers receive a resolved effective value; they do not copy
configuration values into their own tables.

**Reason:** This prevents stale configuration and preserves a single source of
truth.

### Decision 4 — Existing table evolves forward-only

**Decision:** `public.organization_configurations` must be assessed and evolved
only through a forward migration after physical design approval.

**Reason:** Existing data and dependent applications must not be broken by a
structural replacement.

### Decision 5 — Secrets are excluded

**Decision:** Configuration cannot store secrets, passwords, API keys, or
credentials.

**Reason:** Secret lifecycle needs a dedicated secrets-management capability,
not a business configuration table.

## Clean Architecture Boundaries

```text
API Layer
  → DTO validation, authenticated actor, route tenant
Application Layer
  → membership check, commands, effective-value resolution
Domain Layer
  → value validation, state transitions, invariants
Repository Layer
  → tenant-scoped persistence only
Database Layer
  → foreign keys, active uniqueness, audit, version checks
```

No layer may bypass the tenant boundary by accepting an unverified Organization
identifier from a client.

## Security Review

| Control | Design response |
|---|---|
| Authentication | JWT guard on every API endpoint |
| Authorization | Granular permissions for read and administration |
| Tenant isolation | Route Organization ID plus active membership check plus tenant-scoped database query |
| Write conflict | Expected version required for update/state change/retire |
| Audit | Actor and timestamp for every business write |
| Secrets | Rejected by catalogue and validation policy |
| Data exposure | Effective configuration read returns only keys authorized for the consumer context |

## Proposed Permissions — For Approval

| Permission | Purpose |
|---|---|
| `tenant.configurations.view` | Read active overrides and effective values within an authorized Organization |
| `tenant.configurations.manage` | Create, update, activate, deactivate, and retire Organization overrides |
| `platform.configuration-definitions.manage` | Future platform-only catalogue administration; not part of initial tenant API |

## API Design Principles

1. All tenant APIs are Organization-scoped:

```text
/v1/organizations/:organizationId/configurations
```

2. Configuration Definition catalogue endpoints are platform-scoped and are
not part of the initial Organization override implementation.

3. Create, update, activate, deactivate, and retire operations use dedicated
commands, never generic CRUD replacement of a full tenant configuration set.

4. Mutating endpoints require `version` where an override already exists.

5. Normal DELETE means soft retirement only.

6. Effective configuration is read by known key; client-generated arbitrary
keys are rejected.

## Proposed Tenant Override API

| Method | Route | Permission | Purpose |
|---|---|---|---|
| GET | `/v1/organizations/:organizationId/configurations` | `tenant.configurations.view` | List active/inactive tenant overrides |
| GET | `/v1/organizations/:organizationId/configurations/effective/:configurationKey` | `tenant.configurations.view` | Resolve override or platform default |
| POST | `/v1/organizations/:organizationId/configurations` | `tenant.configurations.manage` | Create an override for an approved Definition |
| PATCH | `/v1/organizations/:organizationId/configurations/:configurationId` | `tenant.configurations.manage` | Update override value using expected version |
| PATCH | `/v1/organizations/:organizationId/configurations/:configurationId/activate` | `tenant.configurations.manage` | Activate an inactive override |
| PATCH | `/v1/organizations/:organizationId/configurations/:configurationId/deactivate` | `tenant.configurations.manage` | Deactivate an active override |
| DELETE | `/v1/organizations/:organizationId/configurations/:configurationId` | `tenant.configurations.manage` | Soft-retire an override using expected version |

## Compatibility and Future Evolution

- Consumer modules use the effective-value resolver, not direct tables.
- The Definition catalogue may later be managed through a platform-admin API.
- Feature-flag targeting beyond Organization scope is explicitly out of scope.
- Workflow and Insurance modules may add new catalogue entries through approved
  migrations, not runtime key creation.

## Architecture Review Result

| Dimension | Result |
|---|---|
| DDD ownership | Approved design candidate |
| Tenant isolation | Enforced at API, service, repository, and database layers |
| Audit and soft delete | Required on every override |
| Concurrency | Independent aggregate versioning |
| Compatibility | Forward-only assessment required |
| Security | No secrets; permission-controlled access |
| Extensibility | Catalogue-driven future modules |

## Validation

- No Hospital or IAM ownership boundary is violated.
- No new database table, column, migration, or implementation exists.
- All physical schema decisions remain deferred.

## Pause for Approval

Approve or amend this Architecture Review and API Design Principles document.
The next step is Tenant Configuration Workflow Design and Implementation Plan.
