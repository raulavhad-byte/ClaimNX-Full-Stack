# Insurance Foundation — Workflow and Implementation Plan

| Field | Value |
| --- | --- |
| Module | Insurance Foundation |
| Phase | Phase 7 — Insurance Foundation |
| Status | Draft — approval required before Physical Database Design |
| Owner | Solution Architecture |
| Approval | Approved by Product Owner on 2026-07-30 |
| Date | 2026-07-30 |

## Objective

Define the approved operating workflows, command boundaries, implementation order, deliverables, validation gates, and safe migration approach for Phase 7 Insurance Foundation.

## Why

The approved data model alone does not control how a Partner becomes usable by a tenant or how lifecycle changes affect downstream operations. This plan translates the architecture into an implementation sequence that preserves ClaimNX business-first design, tenant isolation, auditability, and backward-compatible evolution.

## Operating Workflows

### 1. Platform Partner onboarding

```text
Platform administrator
  → Create Insurance Partner as DRAFT
  → Add/maintain Partner Contacts
  → Create optional Product/Plan records as DRAFT
  → Review completeness
  → Activate Partner
  → Activate eligible Product/Plan records
```

Rules:

- Activation requires an approved Partner Type and an active, non-deleted root.
- Contact and Plan records never bypass their aggregate/command boundary.
- Activation does not enable the Partner for all Organizations.

### 2. Organization Partner enablement

```text
Authorized Organization administrator
  → Select active platform Partner
  → Create tenant Enablement as ACTIVE
  → Use Partner in future coverage/claim workflows
  → Suspend or retire enablement when operational use ends
```

Rules:

- Actor must have active Organization Membership and required tenant permission.
- Partner must be active and non-deleted.
- One active enablement is allowed per Organization–Partner pair.
- An enablement does not grant rights to alter the shared Partner.

### 3. Partner suspension and retirement

```text
Platform administrator
  → Suspend Partner
  → New enablement and selection rejected
  → Existing claim history remains readable
  → Retire dependent active Plans/Enablements through their own workflows
  → Retire Partner by soft delete
```

Rules:

- Retirement is blocked while active dependent records exist.
- No normal operation physically deletes a Partner, Plan, Contact, or Enablement.
- Claim history and audit references are preserved.

### 4. Product/Plan lifecycle

```text
Platform administrator
  → Create DRAFT Product/Plan under Partner
  → Update under optimistic concurrency
  → Activate only if Partner is ACTIVE
  → Inactivate / retire when no longer available for new operations
```

### 5. Downstream consumption rule

```text
Future claim or coverage command
  → Verify Partner active
  → Verify Partner enabled for Organization
  → Verify Plan active and owned by Partner
  → Persist reference/snapshot in downstream aggregate
```

Insurance Foundation supplies validation and canonical data; it never owns or transitions the downstream Claim/Coverage aggregate.

## Command and Read Boundaries

| Area | Commands | Reads |
| --- | --- | --- |
| Insurance Partner | Create, update, activate, suspend, retire | Partner list/detail with owned contacts |
| Partner Contact | Add, update, set primary, retire through Partner root | Included in Partner detail only |
| Product/Plan | Create, update, activate, deactivate, retire | Partner-scoped plan list/detail |
| Organization Enablement | Enable, update, suspend, reactivate, retire | Organization-scoped enabled Partner list/detail |
| Downstream validation | Validate active Partner/Plan/Enablement | Read-only application contract |

## Required Reference Data

The following controlled categories must exist before writes are implemented:

| Category | Initial values / purpose |
| --- | --- |
| `INSURANCE_PARTNER_TYPE` | `INSURER`, `TPA`, future approved scheme types |
| `INSURANCE_PARTNER_STATUS` | `DRAFT`, `ACTIVE`, `SUSPENDED` |
| `INSURANCE_CONTACT_TYPE` | Operational, Billing, Escalation, Integration values approved by business |
| `INSURANCE_PLAN_STATUS` | `DRAFT`, `ACTIVE`, `INACTIVE` |
| `ORGANIZATION_PARTNER_ENABLEMENT_STATUS` | `ACTIVE`, `SUSPENDED` |

Reference categories and values remain owned by Reference Data. Exact values are verified during Physical Database Design; no category is seeded without that verification.

## Implementation Sequence

No step may begin before its predecessor is reviewed and approved.

1. **Physical Database Design**
   - Inspect legacy database state read-only.
   - Specify Partner, Contact, Plan, and Enablement tables, including every audit/version/soft-delete field.
   - Define keys, uniqueness, checks, indexes, foreign keys, and migration compatibility.
2. **SQL Architecture Review**
   - Validate ownership, tenant boundaries, parent/child integrity, lifecycle constraints, and legacy impact.
3. **PostgreSQL Migrations**
   - Create/evolve schema and controlled Reference Data in forward-only migrations.
   - Add command functions for write operations and read validation SQL.
4. **Domain Layer**
   - Implement Partner, Plan, and Enablement aggregates and domain invariants.
5. **Repository Layer**
   - Implement read/write adapters using approved raw SQL command functions.
6. **Application Layer**
   - Implement use cases, tenant access checks, concurrency mapping, and cross-aggregate policies.
7. **API Layer**
   - Add versioned REST controllers, DTO validation, JWT guards, and permission checks.
8. **Testing**
   - Unit, repository/application, database command, API integration, tenant-isolation, lifecycle, and stale-version tests.
9. **Documentation and Release Gate**
   - Update API contract, completion review, roadmap, and operational test evidence.

## Planned Migration Units

Migration names are indicative only and will be finalized after Physical Database Design:

```text
20260730xxxx_create_insurance_partner.sql
20260730xxxx_create_insurance_partner_contacts.sql
20260730xxxx_create_insurance_product_plans.sql
20260730xxxx_create_organization_partner_enablements.sql
20260730xxxx_seed_insurance_reference_data.sql
20260730xxxx_create_insurance_foundation_command_functions.sql
20260730xxxx_validate_insurance_foundation.sql
```

## Validation Gates

| Gate | Required evidence |
| --- | --- |
| Architecture | Approved business understanding, domain analysis, aggregate design, ERD, and review. |
| Database | Read-only preflight, approved physical design, SQL review, migration validation. |
| Security | JWT, permissions, platform-vs-tenant administration separation, tenant isolation tests. |
| Integrity | Foreign key, uniqueness, lifecycle, audit, soft-delete, and optimistic-concurrency checks. |
| API | DTO validation, consistent error mapping, versioned routes, and integration tests. |
| Completion | No active test data, successful build/lint/tests, completion review, GitHub push. |

## Risks and Controls

| Risk | Control |
| --- | --- |
| Existing legacy tables or duplicate payer data | Read-only database preflight before any schema decision. |
| Missing controlled Reference Data | Verify categories/values before migrations; do not use ungoverned strings. |
| Tenant modifying shared Partner master | Separate platform and tenant routes/use cases/permissions. |
| Retirement breaks claims | Block unsafe retirement and preserve downstream historical references. |
| Concurrent operational updates | Expected version required by every mutable aggregate command. |
| Premature contract/benefit implementation | Keep cashless contracts, benefits, coverage, and settlement explicitly out of Phase 7. |

## Validation

- The plan follows the ClaimNX approved implementation order.
- It preserves the aggregate and context boundaries approved for Phase 7.
- It includes database, security, tenant, audit, concurrency, API, test, and documentation gates.
- No physical schema, migration, API, or code is created by this planning artifact.

## Pause for Approval

Approve or amend this plan. After approval, the next step is **Insurance Foundation — Physical Database Design**, beginning with read-only legacy database preflight.
