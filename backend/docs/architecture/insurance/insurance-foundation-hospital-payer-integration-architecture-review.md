# Insurance Foundation — Hospital–Payer Integration Architecture Review

| Attribute | Value |
|---|---|
| Module | Insurance Foundation |
| Phase | Phase 7 — Insurance Foundation |
| Version | 1.0 |
| Status | Approved — 2026-08-01 |
| Predecessors | Business Understanding, Domain Analysis, Aggregate Design, and Logical ERD approved 2026-08-01 |
| Date | 2026-08-01 |

## Objective

Verify that Hospital–Payer Integration fits ClaimNX’s approved Modular Monolith, DDD, Clean Architecture, tenant isolation, security, audit, and backward-compatible evolution standards.

## Review Scope

This review covers only the new Hospital–Payer Integration capability. It does not reopen the approved Hospital aggregate, Insurance Partner aggregate, Organization Partner Enablement aggregate, claim model, or external automation architecture.

## Architecture Decision Summary

**Decision:** The Hospital–Payer Integration capability is approved in principle as an independent Insurance Foundation aggregate, subject to the implementation controls in this review.

It will be added additively. No existing Hospital, Insurance Partner, Organization Partner Enablement, Claim, or Workflow table will be repurposed to hold operational portal/email settings.

## DDD and Clean Architecture Review

### Boundary integrity

| Decision | Result |
|---|---|
| Hospital identity and lifecycle remain Hospital-owned. | Approved |
| Insurer/TPA master identity remains Insurance Partner-owned. | Approved |
| Organization authorization remains Organization Partner Enablement-owned. | Approved |
| Hospital-specific operational connectivity belongs to a new Insurance Foundation aggregate. | Approved |
| Claims and pre-authorization routing remain future Claim Processing concerns. | Approved |
| Email/RPA/API execution remains future Integration/Automation work. | Approved |

### Aggregate consistency

- `HospitalInsurancePartnerIntegration` is an independent aggregate root with its own UUID, audit fields, soft-delete state, and version.
- It references Hospital and Insurance Partner by identity; it does not embed mutable copies of their data.
- It treats active Organization Partner Enablement as a command prerequisite, rather than merging it into the aggregate.
- Cross-aggregate checks occur in the application/transaction boundary and later in reviewed SQL command functions.
- No normal operation performs physical deletion.

### Dependency direction

```text
API / DTO / Guards
        ↓
Application use cases
        ↓
Domain aggregate and policies
        ↓
Repository ports
        ↓
PostgreSQL command functions / read queries
```

The domain layer must not depend on NestJS, Supabase client code, controllers, DTOs, or secret-provider SDKs. Infrastructure may implement repository ports and a future secret-reference adapter, but secret values must never enter the domain aggregate.

## Tenant Isolation Review

### Decision

Because Hospital–Payer Integration is an independent tenant-scoped aggregate—not a Hospital child entity—the physical model must persist `organization_id` in addition to `hospital_id`.

This does not transfer Hospital ownership. It provides explicit tenant scope for secure URL routing, query filters, database command checks, and index performance.

### Required enforcement

1. The database must ensure that `(organization_id, hospital_id)` identifies a Hospital belonging to that Organization.
2. Every read and mutable command must require `organization_id` and filter it server-side.
3. The application service must confirm the JWT actor has active Organization Membership in the requested Organization.
4. The application service and database command must verify an active Organization Partner Enablement for the same `(organization_id, insurance_partner_id)` pair when creating, activating, or reactivating an integration.
5. Routes must be Organization-scoped; a supplied Hospital ID alone must never authorize access.
6. Cross-tenant access must return a non-disclosing authorization/not-found result according to the established API convention.

## Security Review

| Risk | Required control |
|---|---|
| Portal/API/email credentials exposed in business data | Persist only a non-secret credential reference. No password/token columns or DTO fields. |
| Secret leakage through logging | Redact credential references and never log request bodies containing security configuration. |
| Unauthorized Hospital configuration | JWT, permission, active Organization Membership, Hospital tenant ownership, and active Partner Enablement checks. |
| Invalid external destination | Validate Email format; require HTTPS portal URL; normalize non-secret identifiers. |
| Reuse of retired configurations | Filter `deleted_at IS NULL`, active lifecycle, and soft-delete state in every command and selection query. |
| Concurrent administrator changes | Require expected version and return a conflict for stale commands. |

**Important:** selecting a secret-management product, accessing the secret, transmitting email, or automating a portal is not authorized by this review. Those require a future Integration/Automation architecture decision.

## Physical Data Design Controls

The future physical design must include:

- application-generated UUID primary key;
- explicit `organization_id`, `hospital_id`, and `insurance_partner_id` references;
- a Hospital-scoped integration code;
- controlled submission channel and lifecycle fields;
- conditional non-secret destination attributes;
- `created_by`, `created_at`, `updated_by`, `updated_at`, `deleted_by`, `deleted_at`, and `version`;
- consistent soft-delete checks;
- a unique active integration rule for `(hospital_id, insurance_partner_id)`;
- a unique active Hospital-scoped integration code;
- indexes for Organization/Hospital list and Partner lookup.

The physical design must use foreign keys with restrictive normal-delete semantics. It must not cascade physical deletion from Hospital, Partner, Organization, or User into integration history.

## Compatibility Review

### Existing data and modules

- Existing `insurance_entities` data and the legacy `claims.payer_id` foreign key remain untouched.
- Existing `organization_insurance_partner_enablement` behavior remains valid and is extended only as a prerequisite.
- Existing Hospital aggregate tables and APIs remain untouched.
- Existing direct CRUD Insurance routes remain outside this approved capability and must not be used as a shortcut for integration configuration.

### Frontend compatibility

The supplied frontend reference may later display Hospital-specific payer information, but it must never receive or manage plaintext portal or mailbox passwords. A future UI gets only permitted non-secret configuration fields and a `credentialConfigured` indicator.

## Scalability and Operational Review

- Hospital-specific integrations are expected to be modest in cardinality relative to claim traffic; indexed Organization/Hospital reads are sufficient for Phase 7.
- Do not add queues, schedulers, browser sessions, RPA logs, or message payloads to this aggregate.
- Future submission/execution telemetry must be separate from configuration to avoid unbounded operational history growth in the aggregate root.
- Audit logs and claim history remain append-only systems of record under their respective owners.

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Partner/TPA routing ambiguity | Phase 7 stores the selectable operational destination only; claim routing remains a future explicit rule. |
| Duplicate Hospital–Partner routes | Active uniqueness rule initially limits one active route per pair. |
| Credential exposure | Secret-reference-only model and no secret DTO properties. |
| Tenant leakage | Explicit organization scope plus Hospital ownership validation in database, application, and API layers. |
| Premature RPA implementation | Explicitly exclude execution and secret retrieval from this capability. |
| Future need for multiple purposes | Add a controlled routing-purpose field only through a reviewed additive migration. |

## Review Decision

The design is architecture-compliant and may proceed to Workflow and Implementation Plan after approval.

It must not proceed directly to SQL, code, or frontend work before that planning stage is approved.

## Validation

- DDD ownership boundaries are preserved. ✅
- Tenant isolation is explicit for this independent aggregate. ✅
- Security prevents plaintext credential storage and exposure. ✅
- Existing Phase 7 tables and Claim foreign keys remain backward compatible. ✅
- Future automation and claims remain outside this implementation scope. ✅
- No physical migration or application code has been created. ✅

## Approval Record

Approved on 2026-08-01. The next deliverable is the Hospital–Payer Integration Workflow and Implementation Plan.
