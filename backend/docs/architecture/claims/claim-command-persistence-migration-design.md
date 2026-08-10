# Claim Processing Command Persistence Migration Design

| Field | Value |
|---|---|
| Objective | Define atomic PostgreSQL command functions for the Phase 8 Claim aggregate. |
| Why | Claim lifecycle changes and append-only history must commit together, with tenant isolation and optimistic concurrency enforced by the database. |
| File Path | `src/database/migrations/` (future approved migration) |
| File Name | `20260801100500_create_claim_command_functions.sql` (reserved) |
| Action | Design review only. Do not execute SQL from this document. |
| Status | Draft for approval |

## 1. Scope

This migration will add command persistence only for the approved Phase 8 scope:

- Shared Claim root for `ICA`, `PRE_POST`, `PARTNER_PROCESSING`, and `KYP`.
- Operational lifecycle commands for `ICA` and `PRE_POST`.
- Draft creation/read-only support for `PARTNER_PROCESSING` and `KYP`.
- Claim Authorization, Claim Query, and Claim Submission Intent child persistence.
- Append-only Claim Status History insertion in the same transaction as each lifecycle transition.

It will not create claim documents, line items, benefits, settlements, recoveries, or external transmission workers.

## 2. Command Principles

1. UUIDs are supplied by the NestJS application layer; PostgreSQL does not generate Claim business UUIDs.
2. `claim_number` is allocated server-side by the existing `allocate_claim_number(organization_id)` function inside the Claim creation transaction.
3. Every mutable command requires `p_expected_version` and updates with `WHERE version = p_expected_version`.
4. A `NULL` function result means the target is missing, inactive, outside the requested tenant scope, or stale. The application layer maps this consistently to `404` or `409` only after an active scoped read.
5. Every active command filters by both `organization_id` and `hospital_id` whenever a Claim root is addressed.
6. No command accepts, stores, returns, or logs a password, token, portal credential, or payload. Claim submission references are non-secret evidence only.
7. `claim_stages` is append-only. Lifecycle commands insert an event but never update or delete history.

## 3. Required Function Set

### 3.1 `create_claim`

**Purpose:** Creates a Draft Claim root and inserts its first `claim_stages` history event atomically.

**Inputs:**

- Application-generated `p_claim_id`
- `p_organization_id`, `p_hospital_id`, `p_patient_id`
- Product, type, Draft status reference-value IDs
- Optional approved Hospital–Payer Integration ID
- Currency and non-negative claimed amount
- Optional authorization reference
- `p_actor_user_id`
- Application-generated first history ID

**Database guards:**

- Actor is active in `public.users`.
- Hospital belongs to `p_organization_id` and is active.
- Product/type/status reference values are globally active and belong to the expected Reference Data categories.
- Initial lifecycle status must resolve to `DRAFT`.
- If supplied, Hospital–Payer Integration is active, belongs to the same organization and hospital, and is not deleted.
- Claim number is allocated by `allocate_claim_number`.
- Version starts at `1`; creation and update audit fields are populated with the actor.

**Return:** Newly created Claim UUID, or an exception for invalid command input/dependency.

### 3.2 `transition_claim_lifecycle`

**Purpose:** Atomically moves an active Claim from one approved lifecycle state to another and inserts one immutable history row.

**Inputs:**

- `p_claim_id`, `p_organization_id`, `p_hospital_id`
- `p_expected_version`
- Target lifecycle status reference-value ID
- Application-generated Claim Status History ID
- Optional non-secret transition reason
- `p_actor_user_id`

**Database guards:**

- Claim is active and belongs to the requested organization and hospital.
- Target is an active `CLAIM_LIFECYCLE_STATUS` reference value.
- The database validates scope and concurrency only. The NestJS Claim Product Strategy remains the authority for product-specific allowed transition paths.
- The new version is `old version + 1`.
- The history row records both source and target status reference IDs and the actor in the same transaction.

**Return:** Updated Claim UUID, or `NULL` for an inactive/out-of-scope/stale target.

### 3.3 `create_claim_authorization`

**Purpose:** Adds an Authorization child to an active, tenant-scoped Claim.

**Guards:** Claim ownership, active actor, active reference data, non-negative approved amount, validity dates, and duplicate active authorization-number protection.

**Return:** Authorization UUID.

### 3.4 `create_claim_query`

**Purpose:** Adds a payer query child to an active, tenant-scoped Claim.

**Guards:** Claim ownership, active actor, active query type/status references, nonblank query text, and valid optional due/response dates.

**Return:** Query UUID.

### 3.5 `create_claim_submission_intent`

**Purpose:** Stores a non-secret request to send a Claim through an approved Hospital–Payer Integration route.

**Guards:** Claim and integration share organization/hospital scope; route is active; channel/status references are active; one open submission intent per Claim; no secret parameter exists.

**Return:** Submission Intent UUID.

## 4. Lifecycle Responsibility Split

| Responsibility | Owner |
|---|---|
| Product-specific transition path (ICA/PRE_POST vs future products) | Claim domain strategy in NestJS |
| Tenant, Hospital, active-row, audit, and version enforcement | PostgreSQL command function |
| Work queue/task creation and assignment | Workflow Platform |
| External email/RPA/API dispatch | Future integration worker |
| Final Claim business lifecycle decision | Claim aggregate |

For `PARTNER_PROCESSING` and `KYP`, the application layer will not call the transition function in Phase 8. It permits only Draft creation/read; the guarded strategy throws before persistence.

## 5. Transaction Boundaries

| Command | Atomic database work |
|---|---|
| Create Claim | Validate dependencies → allocate number → insert Claim → insert DRAFT history |
| Transition Claim | Verify version/scope → update Claim status/version → insert history |
| Create Authorization | Verify Claim scope → insert child |
| Create Query | Verify Claim scope → insert child |
| Create Submission Intent | Verify Claim and route scope → insert child |

No Workflow task, email, RPA action, or external API call will be performed inside a database transaction.

## 6. Migration Validation and Test Plan

The future executable migration must include an idempotent prerequisite gate and a post-migration validation script that verifies:

- all five function names exist;
- no function parameter permits secret credentials;
- history is inserted with every successful root lifecycle transition;
- stale versions return no updated root;
- cross-organization or cross-hospital calls return no updated root;
- Claim number allocation is organization-scoped and non-reusable;
- a rollback integration test creates temporary data and leaves zero committed rows.

## 7. Approval Gate

Do not create or execute the command persistence migration until this design is approved.

**Requested decision:** Approve Claim Processing Command Persistence Migration Design.
