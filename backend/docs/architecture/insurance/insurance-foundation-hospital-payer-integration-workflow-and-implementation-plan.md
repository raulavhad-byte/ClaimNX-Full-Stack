# Insurance Foundation — Hospital–Payer Integration Workflow and Implementation Plan

| Attribute | Value |
|---|---|
| Module | Insurance Foundation |
| Phase | Phase 7 — Insurance Foundation |
| Version | 1.0 |
| Status | Approved — 2026-08-01 |
| Predecessors | Business Understanding, Domain Analysis, Aggregate Design, Logical ERD, and Architecture Review approved 2026-08-01 |
| Date | 2026-08-01 |

## Objective

Define the approved operational lifecycle and exact delivery sequence for Hospital–Payer Integration, from physical database design through tested REST APIs.

## Business Workflow

```text
Authorized Organization administrator
        ↓
Selects an active Hospital within their Organization
        ↓
Selects an active Insurer or TPA enabled for that Organization
        ↓
Chooses Email or RPA Portal submission channel
        ↓
Provides only non-secret destination details
        ↓
Provides credential secret reference where required
        ↓
ClaimNX validates tenant, partner enablement, channel completeness, and version
        ↓
Integration is saved as Draft or Active according to approved command rules
        ↓
Future Claim Processing can select only an active integration
```

No step above sends email, uploads documents, starts RPA, reads a mailbox, or updates a claim.

## Lifecycle Workflow

```text
Draft → Active → Inactive → Active
  │                 │
  └──────→ Retired ←┘
```

- **Draft:** configuration may be completed but is not selectable for future submission.
- **Active:** all channel and cross-aggregate prerequisites are valid.
- **Inactive:** preserved but unavailable for new selection; reactivation rechecks prerequisites.
- **Retired:** soft-deleted historical record; normal mutation and selection are prohibited.

## Command Workflow

### Create

1. Authenticate and authorize the IAM actor.
2. Confirm active Organization Membership.
3. Confirm the Hospital belongs to the requested Organization and is active.
4. Confirm the Partner is active and classified as Insurer or TPA.
5. Confirm active Organization Partner Enablement for the same Organization and Partner.
6. Validate non-secret channel configuration.
7. Generate UUID in the application layer and persist through a reviewed command function.

### Update, activate, deactivate, and retire

- Every command requires Organization scope and expected version.
- Update validates changed channel details and increments version once.
- Activation/re-activation revalidates Hospital, Partner, Enablement, and channel completeness.
- Deactivation and retirement preserve history and do not change other aggregates.
- A stale command returns a conflict; no command performs physical deletion.

## Proposed API Resource Shape

```text
/v1/organizations/{organizationId}/hospitals/{hospitalId}/insurance-partner-integrations
```

Candidate operations for later API-design approval:

| Operation | Intent |
|---|---|
| POST `/` | Create an integration. |
| GET `/` | List integrations for the scoped Organization and Hospital. |
| GET `/{integrationId}` | Read one secret-safe integration. |
| PATCH `/{integrationId}` | Update non-lifecycle configuration with expected version. |
| PATCH `/{integrationId}/activate` | Activate or reactivate. |
| PATCH `/{integrationId}/deactivate` | Deactivate. |
| DELETE `/{integrationId}` | Soft retire with expected version. |

No endpoint will accept or return a password, access token, or other secret material.

## Delivery Sequence

| Step | Deliverable | Exit criteria |
|---:|---|---|
| 1 | Physical Database Design | Table, constraints, indexes, audit, soft-delete, and tenant design approved. |
| 2 | SQL Architecture Review | Existing Insurance, Hospital, Organization, and Claim compatibility approved. |
| 3 | PostgreSQL Migration | Additive migration and validation queries succeed. |
| 4 | Domain Layer | Aggregate/value-object unit tests pass. |
| 5 | Repository Layer | Repository mapper and function/query tests pass. |
| 6 | Application Layer | Access, prerequisite, command, and conflict tests pass. |
| 7 | API Layer | DTO, controller, guard, permission, and secret-safe response tests pass. |
| 8 | Integration Testing | Happy path, tenant isolation, validation, duplicate, stale-version, and secret-exposure tests pass. |
| 9 | Frontend Contract Handoff | Secret-safe contract is published for future Phase 12. |

## Migration Strategy

The migration must be additive and backward compatible:

1. Seed only controlled integration channel/lifecycle values after inspecting Reference Data conventions.
2. Create the integration storage with explicit Organization, Hospital, and Partner scope.
3. Add restrictive foreign keys, active partial uniqueness, indexes, audit fields, soft-delete, and version checks.
4. Add database command functions for create, update, activate/deactivate, and retirement.
5. Add comments identifying the credential reference as non-secret.
6. Add read-only verification queries.
7. Do not modify Claims, Hospital aggregate tables, or existing Insurance Partner data unless a separately reviewed compatibility need emerges.

## Test Plan

### Positive coverage

- Create an Email integration with a valid payer email destination.
- Create an RPA Portal integration with HTTPS URL, portal username, and credential secret reference.
- Update and verify version increments.
- Deactivate and reactivate after validation.
- Retire and verify exclusion from active reads.

### Negative coverage

- Cross-tenant read or mutation is rejected.
- Hospital is outside the Organization.
- Partner is not Insurer/TPA or is inactive.
- Partner Enablement is absent/inactive.
- Channel data is incomplete or malformed.
- A request attempts to send a password/token field.
- A duplicate active Hospital–Partner profile is rejected.
- A stale command returns conflict.
- A retired integration cannot be updated/reactivated.
- Responses and logs do not expose secret material or the credential reference.

## Explicit Non-Goals

- Email delivery, attachments, inbox polling, RPA/browser automation, API connectors, and response ingestion.
- Secret-provider implementation.
- Claim routing, claim status updates, adjudication, or Workflow updates.
- Frontend implementation.

## Validation

- Delivery order follows the ClaimNX architecture-first standard. ✅
- Each mutable operation includes tenant, membership, enablement, audit, and version checks. ✅
- Secret material remains outside database/API/frontend scope. ✅
- Existing Phase 7 data remains protected through additive migration only. ✅

## Approval Record

Approved on 2026-08-01. The next deliverable is the Hospital–Payer Integration Physical Database Design.
