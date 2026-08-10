# ClaimNX Claim Processing Physical Database Design

| Attribute | Value |
|---|---|
| Module | Claim Processing |
| Phase | Phase 8 - Claim Processing |
| Version | 1.0 |
| Status | Draft - awaiting approval |
| Prerequisite | Claim Processing Workflow and Implementation Plan approved; legacy database preflight completed |
| Date | 2026-08-01 |

## 1. Objective

Define the production-ready PostgreSQL physical evolution for the shared Claim foundation. The design supports all ClaimNX products (`ICA`, `PRE_POST`, `PARTNER_PROCESSING`, and `KYP`) while operational lifecycle commands are initially enabled only for ICA and PRE_POST.

This is an **in-place evolution** of the existing `public.claims` and `public.claim_stages` tables. No existing Claim table is dropped, renamed, or recreated.

## 2. Why

The existing Claim schema has downstream references from documents, legal cases, patient documents, queries, reconciliations, recovery, and claim stages. A replacement table or destructive migration would break referential integrity and historical data.

The Phase 8 schema therefore adds the approved aggregate, tenant, lifecycle, audit, and concurrency controls without rewriting retired legacy records or taking ownership of Phase 9 Financial data.

## 3. Completed Legacy Database Preflight

### 3.1 Existing table assessment

| Table | Finding | Phase 8 decision |
|---|---|---|
| `public.claims` | Existing legacy Claim root; one historical record; referenced by multiple dependent tables. | Evolve in place. |
| `public.claim_stages` | Existing legacy stage history; no records. | Evolve in place into append-only Claim Status History compatibility structure. |

### 3.2 Legacy record decision

The one existing Claim is `CASE-10001`, status `Under Review`, with valid Hospital and Insurance Partner references. It is already soft deleted (`is_deleted = true`, `deleted_at` populated) and has no `last_updated_by` value.

It is treated as a **retired historical legacy Claim**. The Phase 8 migration must preserve it, must not reactivate it, and must not require it to satisfy active-record rules. Its missing audit actor is recorded as legacy remediation metadata, not silently fabricated as a business action.

### 3.3 Compatibility constraints

- `claims.case_ref_id` has a legacy global unique constraint. It remains a legacy compatibility identifier.
- `claim_stages.claim_id` currently has `ON DELETE CASCADE`; Phase 8 performs no physical Claim deletion, so this rule is not invoked by normal operations.
- Existing `claims` dependencies remain unchanged. Financial dependencies (`reconciliations`, `recovery`) stay under Phase 9 ownership.

## 4. Physical Design Principles

- PostgreSQL remains the source of truth; migration SQL is version controlled.
- Application services generate UUID values for new business entities.
- Every new or evolved active business record has `created_by`, `created_at`, `updated_by`, `updated_at`, `deleted_by`, `deleted_at`, and `version`.
- Normal deletion is a soft delete only. No Phase 8 business function issues `DELETE` against a Claim aggregate table.
- All new active Claim reads and mutations filter by `organization_id` and `hospital_id` where the operation is Hospital scoped.
- Claim status history is append-only. A Claim lifecycle mutation and its history entry occur in one transaction.
- Claim product is immutable after Draft creation.
- Child tables have no independent API ownership; they are persisted by Claim aggregate commands.
- Secrets are never stored in Claim tables. Payer routing refers only to the approved Hospital-Payer Integration identifier.

## 5. Controlled Reference Data

`CLAIM_PRODUCT` must be a centralized Reference Data category, not a PostgreSQL enum. This follows ClaimNX's reference-data ownership rule and permits controlled future values without a database type replacement. It contains exactly the Phase 8-approved active values:

| Category | Initial values |
|---|---|
| `CLAIM_PRODUCT` | `ICA`, `PRE_POST`, `PARTNER_PROCESSING`, `KYP` |
| `CLAIM_TYPE` | Approved initial ICA/Pre/Post values; detailed codes are seeded only in a reviewed migration. |
| `CLAIM_LIFECYCLE_STATUS` | `DRAFT`, `READY_FOR_REVIEW`, `READY_FOR_SUBMISSION`, `SUBMISSION_REQUESTED`, `SUBMITTED`, `QUERY_RAISED`, `PAYER_RESPONSE_RECEIVED`, `APPROVED`, `REJECTED`, `CANCELLED`, `CLOSED` |
| `CLAIM_AUTHORIZATION_TYPE` | Initial controlled values only. |
| `CLAIM_AUTHORIZATION_STATUS` | Initial controlled values only. |
| `CLAIM_QUERY_TYPE` | Initial controlled values only. |
| `CLAIM_QUERY_STATUS` | Initial controlled values only. |
| `CLAIM_SUBMISSION_STATUS` | Initial controlled values only. |

The migration validates required category/value availability before adding active-record constraints. The Claim root stores reference-value UUIDs, never display names or uncontrolled text values.

## 6. Claim Root: `public.claims`

### 6.1 Ownership and purpose

`claims` remains the Claim aggregate root. It owns Claim lifecycle, payer route selection, product discriminator, authorization facts, queries, submission intent, and append-only Claim status history.

### 6.2 Canonical Phase 8 columns

| Column | Type | Required for active Phase 8 claims | Purpose |
|---|---|---:|---|
| `id` | UUID | Yes | Existing primary key; new IDs application generated. |
| `organization_id` | UUID | Yes | Immutable tenant scope, references `organizations(id)`. |
| `hospital_id` | UUID | Yes | Immutable Hospital scope. |
| `claim_number` | VARCHAR(64) | Yes | Immutable ClaimNX business identifier, unique within Organization for active claims. |
| `claim_product_reference_value_id` | UUID | Yes | Immutable controlled Claim Product. ICA is Cashless/Pre-Authorization. |
| `claim_type_reference_value_id` | UUID | Yes | Controlled claim type. |
| `lifecycle_status_reference_value_id` | UUID | Yes | Current controlled business lifecycle status. |
| `hospital_insurance_partner_integration_id` | UUID | No in Draft; Yes before submission readiness | Selected approved Hospital–Payer route; immutable after submission request. |
| `patient_id` | UUID | No | Existing future Patient-context reference; Phase 8 does not own Patient data. |
| `payer_id` | UUID | No | Existing legacy Insurance Partner compatibility reference. New active routes use the integration reference. |
| `currency_code` | CHAR(3) | Yes before financial readiness | ISO 4217 currency code; no default. |
| `total_claimed_amount` | NUMERIC(18,2) | No in Draft | Non-negative requested amount. |
| `approved_amount` | NUMERIC(18,2) | No | Non-negative payer outcome amount. |
| `authorization_reference` | VARCHAR(120) | No | External non-secret payer authorization/reference. |
| `external_submission_reference` | VARCHAR(200) | No | Non-secret submitted/delivery reference. |
| `closure_reason` | TEXT | No | Required by applicable close/cancel command rules. |
| `created_by` | UUID | Yes | Creation audit actor, references `users(id)`. |
| `created_at` | TIMESTAMPTZ | Yes | Creation timestamp. |
| `updated_by` | UUID | Yes | Latest update audit actor. |
| `updated_at` | TIMESTAMPTZ | Yes | Latest update timestamp. |
| `deleted_by` | UUID | No | Soft-delete audit actor. |
| `deleted_at` | TIMESTAMPTZ | No | Soft-delete timestamp. |
| `version` | INTEGER | Yes | Optimistic concurrency, starts at `1`. |

### 6.3 Legacy compatibility columns retained

The migration retains `case_ref_id`, `insurance_company`, `tpa_provider`, `policy_number`, `status`, `amount`, `estimated_cost`, `settled_amount`, `diagnosis`, `admission_date`, `discharge_date`, `priority`, `form_data`, and `last_updated_by` only for compatibility with legacy records and dependent applications.

New Phase 8 command paths do not write legacy display/status fields as the canonical business source. A reviewed compatibility strategy may mirror selected values temporarily where an existing caller still requires them. `settled_amount` remains Financial Management owned and is not mutated by Phase 8 commands.

### 6.4 Root constraints

- `ck_claims_version`: `version >= 1`.
- `ck_claims_amounts_non_negative`: all populated Phase 8 monetary values are `>= 0`.
- `ck_claims_soft_delete_consistency`: `deleted_at IS NULL` iff the active soft-delete flag is false, while retaining legacy compatibility semantics during evolution.
- `ck_claims_active_audit`: all non-deleted Phase 8 records require creation/update audit values.
- `fk_claims_organization`, `fk_claims_hospital`, `fk_claims_product_reference_value`, `fk_claims_type_reference_value`, `fk_claims_lifecycle_status_reference_value`, and `fk_claims_hospital_payer_integration` use `ON DELETE RESTRICT`.
- Tenant integrity is enforced using the approved composite Hospital reference `(organization_id, hospital_id)` to the Hospital uniqueness key. The selected Hospital-Payer Integration must match the Claim Organization and Hospital using a composite foreign key or validated database command precondition.
- `claim_product_reference_value_id`, `organization_id`, `hospital_id`, and `claim_number` are immutable once created. Database functions and repository SQL must not update them.

### 6.5 Root indexes

| Name | Definition/purpose |
|---|---|
| `uq_claims_organization_claim_number_active` | Unique `(organization_id, claim_number)` where active and non-deleted. |
| `idx_claims_organization_hospital_active` | Lists active claims for a tenant Hospital. |
| `idx_claims_organization_product_status_active` | Product/lifecycle operational worklist filtering. |
| `idx_claims_hospital_payer_integration_active` | Route-level operational filtering. |
| `idx_claims_patient_active` | Retained/updated only when an approved Patient-context query needs it. |

The existing unique legacy `claims_case_ref_id_key` is retained. Its removal or scope change is out of scope unless a separate compatibility review proves no dependent process needs it.

## 7. Claim Authorization: `public.claim_authorizations`

| Column | Type | Required | Purpose |
|---|---|---:|---|
| `claim_authorization_id` | UUID | Yes | Application-generated primary key. |
| `organization_id` | UUID | Yes | Persisted tenant scope. |
| `claim_id` | UUID | Yes | Parent Claim. |
| `authorization_type_reference_value_id` | UUID | Yes | Controlled authorization type. |
| `authorization_status_reference_value_id` | UUID | Yes | Controlled authorization status. |
| `authorization_number` | VARCHAR(120) | No | Non-secret payer authorization identifier. |
| `approved_amount` | NUMERIC(18,2) | No | Non-negative authorization amount. |
| `valid_from`, `valid_until` | TIMESTAMPTZ | No | Optional authorization validity. |
| audit/soft-delete/version columns | Standard | Yes/No | ClaimNX standard. |

Rules: belongs to exactly one Claim; tenant scope must match Claim; active authorization numbers are unique per Claim when populated; deletion is soft only.

## 8. Claim Query: `public.claim_queries`

| Column | Type | Required | Purpose |
|---|---|---:|---|
| `claim_query_id` | UUID | Yes | Application-generated primary key. |
| `organization_id` | UUID | Yes | Persisted tenant scope. |
| `claim_id` | UUID | Yes | Parent Claim. |
| `query_type_reference_value_id` | UUID | Yes | Controlled query classification. |
| `query_status_reference_value_id` | UUID | Yes | Controlled query lifecycle. |
| `payer_query_reference` | VARCHAR(160) | No | Non-secret external query reference. |
| `query_text` | TEXT | Yes | Payer request details. |
| `response_text` | TEXT | No | Authorized response details. |
| `raised_at`, `responded_at`, `due_at` | TIMESTAMPTZ | Conditional | Query timing. |
| audit/soft-delete/version columns | Standard | Yes/No | ClaimNX standard. |

Rules: a Query is a Claim child; one active open query must be resolved before product rules allow submission resumption; tenant scope must match Claim.

## 9. Claim Submission Intent: `public.claim_submission_intents`

| Column | Type | Required | Purpose |
|---|---|---:|---|
| `claim_submission_intent_id` | UUID | Yes | Application-generated primary key. |
| `organization_id` | UUID | Yes | Persisted tenant scope. |
| `claim_id` | UUID | Yes | Parent Claim. |
| `hospital_insurance_partner_integration_id` | UUID | Yes | Immutable selected route snapshot. |
| `channel_reference_value_id` | UUID | Yes | `EMAIL`, `RPA_PORTAL`, or `API` controlled route channel. |
| `submission_status_reference_value_id` | UUID | Yes | Controlled intent/delivery status. |
| `requested_at`, `verified_submitted_at` | TIMESTAMPTZ | Conditional | Request versus verified delivery evidence. |
| `external_submission_reference` | VARCHAR(200) | No | Non-secret external reference. |
| `failure_reason` | TEXT | No | Non-secret operational failure reason. |
| audit/soft-delete/version columns | Standard | Yes/No | ClaimNX standard. |

Rules: intent is not proof of transmission; no credentials, portal password, token, request body, or response body may be stored; an active Claim has at most one open intent unless a later approved retry model is introduced.

## 10. Claim Status History: evolution of `public.claim_stages`

`claim_stages` is retained because it already has a dependent `claim_id` relationship and legacy compatibility value. It is evolved into the Phase 8 append-only Claim Status History representation.

| Canonical/additive column | Type | Purpose |
|---|---|---|
| `organization_id` | UUID | Tenant context derived from Claim. |
| `claim_product_reference_value_id` | UUID | Immutable product snapshot. |
| `from_lifecycle_status_reference_value_id` | UUID | Prior controlled lifecycle value; nullable only for initial creation. |
| `to_lifecycle_status_reference_value_id` | UUID | New controlled lifecycle value. |
| `transition_reason` | TEXT | Required where transition matrix requires rationale. |
| `actor_user_id` | UUID | Canonical acting user; legacy `user_id` retained temporarily. |
| `occurred_at` | TIMESTAMPTZ | Immutable transition occurrence time. |
| `event_data` | JSONB | Non-secret structured transition context; legacy `stage_data` retained/mapped. |

Rules:

- Status history is append-only. `UPDATE` and `DELETE` are prohibited for application roles through a reviewed trigger/function policy.
- All new history records have tenant scope, product snapshot, actor, timestamp, and controlled target lifecycle value.
- The legacy `status`, `comment`, `amount`, `user_id`, and `stage_data` columns remain readable for legacy rows only; new commands populate canonical columns and may mirror fields only during the compatibility period.
- No active history row may be physically deleted; status-history rows do not use normal aggregate soft deletion.

## 11. Claim Number Allocation

Claim Numbers are allocated by an approved database function in the same transaction as Claim creation. The format is neutral and contains no patient information:

```text
CLM-<organization-safe-sequence>
```

The sequence allocation is concurrency safe, organization scoped, never reused, and does not rely on a frontend-provided number. A separate `claim_number_sequences` technical table may store last allocated value by Organization; it is not an independently exposed business aggregate.

## 12. Migration Strategy

### 12.1 Migration order

1. Seed and validate Claim reference-data categories and approved values.
2. Add non-breaking canonical columns to `claims` and `claim_stages` as nullable.
3. Create new child tables: `claim_authorizations`, `claim_queries`, and `claim_submission_intents`.
4. Create the Claim Number allocator technical table/function.
5. Backfill Organization from valid Hospital ownership for legacy Claims where possible.
6. Mark the already retired legacy Claim as historical compatibility data; do not invent a lifecycle product/status history or audit actor.
7. Add foreign keys, check constraints, and partial indexes only after data validations pass.
8. Create append-only Claim History protection.
9. Create reviewed command functions for draft creation, lifecycle transition, child commands, and soft deletion.
10. Add post-migration read-only validation SQL.

### 12.2 Legacy safety rules

- The `CASE-10001` retired record remains unchanged except for non-destructive metadata required for foreign-key compatibility.
- Active-record constraints apply only to Phase 8 canonical writes and must not fail because of the retired legacy record.
- `case_ref_id` uniqueness, existing foreign keys, existing dependency tables, and Financial phase ownership are preserved.
- No migration may set `created_by`, `updated_by`, or `deleted_by` on a historical Claim merely to satisfy a new active-write rule.

## 13. Validation Checklist

Before applying a Phase 8 migration, validate:

- all required reference categories and values exist and are active;
- every active legacy Claim has a resolvable Organization through its Hospital;
- no active legacy Claim violates planned amount, tenant, or audit constraints;
- the retired legacy Claim remains retired and is excluded from active migrations;
- no existing foreign key or index has been dropped unintentionally;
- all new tenant-scoped unique indexes use `deleted_at IS NULL` and the legacy soft-delete flag where required;
- `claim_stages` append-only protection permits inserts and rejects updates/deletes;
- Claim Number allocation is concurrency safe;
- no Claim table contains credential, password, token, or secret value.

## 14. File Path and Action

| Item | Value |
|---|---|
| File path | `docs/architecture/claims/claim-processing-physical-database-design.md` |
| File name | `claim-processing-physical-database-design.md` |
| Action | Review and approve the physical schema before SQL Architecture Review and migration scripts. |

## 15. Approval Gate

**Next deliverable after approval:** Claim Processing SQL Architecture Review.

**Pause for approval:** Confirm the in-place `claims`/`claim_stages` evolution, canonical child tables, Reference Data model, Claim Number allocation, legacy record preservation, constraints, and migration order before any Phase 8 PostgreSQL migration is written.
