# Hospital Module Implementation Plan

## Objective

Implement the approved Hospital Aggregate for Phase 5 - Tenant Management in
the required architecture sequence: database, domain, repository, application,
API, validation, and testing.

## Why

The Hospital module is a tenant-owned aggregate. Its child entities must never
be independently managed, reassigned to another Hospital, or accessed outside
the Organization tenant boundary.

## File Path

`docs/architecture/hospital/hospital-implementation-plan.md`

## Current Status

| Step | Deliverable | Status |
|---|---|---|
| Physical database design | Approved schema design | Complete |
| SQL migrations | Phase 5 migrations `20260730089500` through `20260730100000` | Complete and validated in Supabase |
| Root integrity correction | `20260730095500_enforce_hospital_root_integrity.sql` | Complete and validated in Supabase |
| Legacy write compatibility | `20260730095600_align_hospital_legacy_write_compatibility.sql` | Complete and validated in Supabase |
| Transactional create function | `20260730096000_create_hospital_aggregate_function.sql` | Complete and validated in Supabase |
| Domain layer | `Hospital` Aggregate and domain rules | Complete and tested |
| Repository layer | Typed tenant-scoped aggregate read repository | Complete and tested |
| Application layer | Tenant-scoped retrieval and transactional Create Hospital use case | Complete |
| API layer | Versioned tenant API, typed DTOs, authentication, and permission checks | Complete |
| Validation | Request, Domain, database, and tenant validation | Complete for Create/Retrieve |
| Testing | Create/Retrieve integration, negative paths, and tenant isolation | Complete |
| Root update | Version-protected Hospital root PATCH | Complete and validated in Supabase |
| Address sub-resource | Tenant-scoped Address create, update, list, and soft delete | Complete and validated in Supabase |
| Contact sub-resource | Tenant-scoped Contact create, update, list, and soft delete | Complete and validated in Supabase |
| Department sub-resource | Tenant-scoped Department create, update, list, and soft delete | Complete and validated in Supabase |
| Primary child reassignment | Atomic root-versioned primary Address and Contact selection | Complete and validated in Supabase |

## Completed Production Content

### Domain Layer

- `src/modules/hospitals/domain/hospital.aggregate.ts`
- `src/modules/hospitals/domain/hospital.aggregate.spec.ts`

The Aggregate enforces child ownership, primary Address integrity, primary
Contact integrity by Contact Type, Department uniqueness, and optimistic
concurrency version validity.

### Repository Layer

- `src/modules/hospitals/infrastructure/hospital-database.mapper.ts`
- `src/modules/hospitals/infrastructure/hospital-aggregate.repository.ts`
- `src/modules/hospitals/infrastructure/hospital-database.mapper.spec.ts`

The repository loads the root and all child entities by `organization_id` and
active-state criteria, then rehydrates the Domain Aggregate. It deliberately
does not use the legacy generic CRUD repository for new Phase 5 use cases.

## Validation

- Hospital physical database validation: passed in Supabase on 2026-07-30.
- Domain and mapper unit tests: 5 passed.
- NestJS production build: passed.
- Live Create/Retrieve API integration: passed on 2026-07-30.
- Duplicate Hospital Code rejection: `409 Conflict` passed.
- Invalid child foreign-key rollback: `400 Bad Request` and zero persisted root rows passed.
- Cross-tenant read attempt: `403 Forbidden` passed.

## Application Layer Progress

- `src/modules/hospitals/application/get-hospital.use-case.ts`
- `src/modules/hospitals/application/get-hospital.use-case.spec.ts`

The first use case requires both `organizationId` and `hospitalId`. A missing
or cross-tenant Hospital receives the same not-found result, preventing tenant
data disclosure.

### Create Hospital

- `src/modules/hospitals/application/create-hospital.use-case.ts`
- `src/modules/hospitals/application/create-hospital.use-case.spec.ts`

The use case generates all business UUIDs in the application layer, constructs
the Aggregate, applies its child-ownership and uniqueness rules, then invokes
the atomic `create_hospital_aggregate` database function.

### Tenant Access

- `src/modules/hospitals/application/hospital-tenant-access.service.ts`

Every Hospital use case now verifies active Organization membership in the
service layer. The future API may receive an Organization selection, but it
cannot trust it without this server-side membership check.

## Pause for Approval

### Update Hospital Root

- `src/database/migrations/20260730100000_create_update_hospital_root_function.sql`
- `src/modules/hospitals/application/update-hospital-root.use-case.ts`
- `src/modules/hospitals/api/dto/update-hospital-root-request.dto.ts`
- `src/modules/hospitals/api/hospital-v1.controller.ts`
- `docs/architecture/hospital/hospital-root-update-api-test.ps1`

`PATCH /v1/organizations/:organizationId/hospitals/:hospitalId` updates only
the Hospital root. It requires an expected `version`, checks active tenant
membership, writes audit fields, increments the root version atomically, and
returns `409 Conflict` when the supplied version is stale. Live validation
passed on 2026-07-30: version `1` to `2`, followed by a stale-version `409`.

### Hospital Address Sub-Resource

- `src/database/migrations/20260730101000_create_hospital_address_functions.sql`
- `src/modules/hospitals/application/hospital-address.use-cases.ts`
- `src/modules/hospitals/api/dto/hospital-address-request.dto.ts`
- `docs/architecture/hospital/hospital-address-api-test.ps1`

Address writes are independently versioned. New Addresses are non-primary;
the current primary Address cannot be deleted. Live validation passed on
2026-07-30: create version `1`, update version `2`, and soft delete with no
remaining active Address returned by the list endpoint.

### Hospital Contact Sub-Resource

- `src/database/migrations/20260730102000_create_hospital_contact_functions.sql`
- `src/modules/hospitals/application/hospital-contact.use-cases.ts`
- `src/modules/hospitals/api/dto/hospital-contact-request.dto.ts`
- `docs/architecture/hospital/hospital-contact-api-test.ps1`

Contact writes are independently versioned. New Contacts are non-primary; the
root-selected primary Contact cannot be deleted. Live validation passed on
2026-07-30: create version `1`, update version `2`, and soft delete with no
remaining active Contact returned by the list endpoint.

### Hospital Department Sub-Resource

- `src/database/migrations/20260730103000_create_hospital_department_functions.sql`
- `src/modules/hospitals/application/hospital-department.use-cases.ts`
- `src/modules/hospitals/api/dto/hospital-department-request.dto.ts`
- `docs/architecture/hospital/hospital-department-api-test.ps1`

Department writes are independently versioned and use the approved active
Department Code/Name uniqueness rules. Live validation passed on 2026-07-30:
create version `1`, update version `2`, and soft delete with no remaining
active Department returned by the list endpoint.

### Primary Address and Contact Reassignment

- `src/database/migrations/20260730104000_create_hospital_primary_reassignment_functions.sql`
- `src/modules/hospitals/application/set-hospital-primary-child.use-case.ts`
- `src/modules/hospitals/api/dto/set-hospital-primary-child-request.dto.ts`
- `docs/architecture/hospital/hospital-primary-reassignment-api-test.ps1`

Primary reassignment is a Hospital root operation. It checks and increments the
root version, retains child audit/version history, verifies child ownership,
and prevents the selected primary child from being deleted. Live reversible
validation passed on 2026-07-30: both original primary children were restored,
the root version incremented exactly four times, and both temporary children
were soft-deleted.

## Pause for Approval

Hospital bounded-context implementation is complete for its approved Phase 5
scope. Next step: perform final code review, commit the reviewed work, then
begin the next approved Phase 5 Tenant Management capability.
The legacy Hospital CRUD service must not be extended for new Phase 5 workflows.
