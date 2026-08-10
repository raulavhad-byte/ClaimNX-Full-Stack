# ClaimNX Phase 10 — AI & Automation Physical Database Design

| Attribute | Value |
|---|---|
| Module | AI & Automation |
| Phase | 10 — AI & Automation |
| Status | Approved |
| Database | PostgreSQL / Supabase |
| Migration style | Additive raw SQL; source of truth in version-controlled migrations |
| Depends on | Approved Phase 10 design documents and Phases 1–9 foundations |

---

## 1. Objective

Define the production-ready PostgreSQL physical design for the Phase 10 AI & Automation bounded context, including tables, columns, primary/foreign keys, constraints, indexes, audit/versioning, tenant isolation, append-only history, protected-data rules, and migration order.

## 2. Why This Design Exists

The schema must allow ClaimNX to request automation safely, retain advisory AI outputs with evidence, route external payer submissions without storing secrets, preserve human review, and produce immutable audit facts.

It must achieve this without direct ownership of Claim, Financial, Insurance, Workflow, document-storage, IAM, or secret-management records.

## 3. Physical Table Inventory

| Table | Aggregate / purpose | Mutability |
|---|---|---|
| `automation_work_request` | Automation Work Request root; idempotent request and lifecycle. | Mutable with optimistic concurrency. |
| `automation_job_attempt` | Execution attempt child of a Work Request. | Append-only. |
| `automation_review_case` | Automation Review Case root. | Mutable with optimistic concurrency. |
| `automation_extraction_candidate` | Candidate child of a Review Case. | Append-only. |
| `automation_inference_result` | Advisory inference/score/insight child of a Review Case. | Append-only. |
| `automation_review_decision` | Human review/override child of a Review Case. | Append-only. |
| `automation_owner_command_request` | Durable request to an owner bounded context. | Mutable delivery lifecycle with optimistic concurrency. |
| `payer_dispatch_task` | Payer Dispatch Task root. | Mutable with optimistic concurrency. |
| `payer_dispatch_attempt` | External dispatch attempt child. | Append-only. |
| `payer_dispatch_verification` | Verification child required for completed dispatch. | Append-only. |
| `automation_audit_entry` | Immutable prompt/model/execution/dispatch/review audit. | Append-only. |

## 4. Naming Standards

- Tables use singular `snake_case` names stated above.
- Primary keys use `<table>_id`; e.g. `automation_work_request_id`.
- Foreign keys retain the referenced aggregate name; e.g. `organization_id`, `hospital_id`, `claim_id`.
- Constraints use `pk_<table>`, `fk_<table>_<parent>`, `uq_<table>_<columns>`, `ck_<table>_<rule>`.
- Indexes use `idx_<table>_<columns>`.
- All business entity IDs are UUIDs generated in the application layer. The database does not generate business UUIDs for new Phase 10 writes.

## 5. Shared Column Standards

### 5.1 Mutable Aggregate Roots

`automation_work_request`, `automation_review_case`, `automation_owner_command_request`, and `payer_dispatch_task` contain:

| Column | Type | Required | Rule |
|---|---|---|---|
| Primary key | UUID | Yes | Application-generated. |
| `organization_id` | UUID | Yes | Immutable tenant scope. |
| `created_by` / `created_at` | UUID / TIMESTAMPTZ | Yes | Creation audit. |
| `updated_by` / `updated_at` | UUID / TIMESTAMPTZ | Yes | Update audit. |
| `deleted_by` / `deleted_at` | UUID / TIMESTAMPTZ | No | Soft-delete audit only. |
| `version` | INTEGER | Yes | Starts at `1`; increment on every successful update. |

### 5.2 Append-Only Records

Attempts, candidates, results, decisions, verification, and audit tables contain `created_by` and `created_at` or `recorded_by` and `recorded_at` as appropriate. They do not contain routine `updated_*`, `deleted_*`, or mutable `version` fields because their history must remain immutable.

## 6. Table Specifications

### 6.1 `automation_work_request`

**Objective:** Persist one idempotent request for a single automation purpose.

| Column | Type | Required | Purpose / rule |
|---|---|---|---|
| `automation_work_request_id` | UUID | Yes | Primary key. |
| `organization_id` | UUID | Yes | Tenant scope; references `organizations`. |
| `hospital_id` | UUID | No | Required for Claim-related purposes; references `hospitals` using tenant-safe relationship. |
| `claim_id` | UUID | No | Required for Claim-related purposes; references `claims` using tenant-safe relationship. |
| `claim_product_reference_value_id` | UUID | No | Required for Claim-related purposes; reference data `CLAIM_PRODUCT`. |
| `automation_purpose_reference_value_id` | UUID | Yes | Controlled purpose: extraction, readiness scoring, financial insight, dispatch enqueue. |
| `source_record_type` | VARCHAR(100) | Yes | Safe owner-record type, not a payload. |
| `source_record_id` | UUID | No | Safe source record reference where source uses UUID. |
| `source_reference` | VARCHAR(255) | No | Safe non-secret external/source correlation reference. |
| `correlation_id` | UUID | Yes | Traceability across requests/events. |
| `idempotency_key` | VARCHAR(200) | Yes | Prevents duplicate active request acceptance. |
| `status_reference_value_id` | UUID | Yes | Controlled Work Request lifecycle status. |
| `requested_at` | TIMESTAMPTZ | Yes | Request acceptance time. |
| shared mutable audit columns | See §5.1 | Yes | Audit, soft delete, version. |

Business rule: `hospital_id`, `claim_id`, and `claim_product_reference_value_id` must either all be present for Claim-related work or all be absent for non-Claim work, subject to approved purpose-specific constraints.

### 6.2 `automation_job_attempt`

**Objective:** Record each immutable execution attempt for an Automation Work Request.

| Column | Type | Required | Purpose / rule |
|---|---|---|---|
| `automation_job_attempt_id` | UUID | Yes | Primary key. |
| `automation_work_request_id` | UUID | Yes | Parent Work Request. |
| `attempt_number` | INTEGER | Yes | Starts at `1`; unique per Work Request. |
| `status_reference_value_id` | UUID | Yes | Queued, in progress, completed, failed, etc. |
| `provider_name` | VARCHAR(100) | No | Non-secret provider identifier. |
| `model_identifier` | VARCHAR(200) | No | Model version/name, not credentials. |
| `policy_version` | VARCHAR(100) | No | Prompt/policy/redaction version. |
| `external_correlation_reference` | VARCHAR(255) | No | Safe external trace reference. |
| `failure_classification_reference_value_id` | UUID | No | Safe controlled failure category. |
| `failure_summary` | VARCHAR(1000) | No | Redacted safe diagnostic only. |
| `queued_at` / `started_at` / `completed_at` | TIMESTAMPTZ | Yes / No / No | Timing. |
| `created_by` / `created_at` | UUID / TIMESTAMPTZ | Yes | Append-only creation audit. |

### 6.3 `automation_review_case`

**Objective:** Provide the mutable review boundary for outputs produced from one source/business context.

| Column | Type | Required | Purpose / rule |
|---|---|---|---|
| `automation_review_case_id` | UUID | Yes | Primary key. |
| `organization_id` | UUID | Yes | Tenant scope. |
| `hospital_id` | UUID | No | Required when Claim-related. |
| `claim_id` | UUID | No | Claim reference when applicable. |
| `claim_product_reference_value_id` | UUID | No | Product context when applicable. |
| `automation_work_request_id` | UUID | Yes | Originating Work Request. |
| `review_case_type_reference_value_id` | UUID | Yes | Extraction, readiness, financial insight, dispatch exception, etc. |
| `status_reference_value_id` | UUID | Yes | Open, in review, resolved, retired. |
| `correlation_id` | UUID | Yes | Traceability. |
| shared mutable audit columns | See §5.1 | Yes | Audit, soft delete, version. |

### 6.4 `automation_extraction_candidate`

**Objective:** Preserve one proposed extracted field/value with evidence and confidence.

| Column | Type | Required | Purpose / rule |
|---|---|---|---|
| `automation_extraction_candidate_id` | UUID | Yes | Primary key. |
| `automation_review_case_id` | UUID | Yes | Parent Review Case. |
| `automation_job_attempt_id` | UUID | Yes | Producing attempt. |
| `field_code` | VARCHAR(100) | Yes | Controlled logical target field. |
| `candidate_value` | JSONB | Yes | Structured candidate; protected/minimum-necessary handling applies. |
| `source_provenance` | JSONB | Yes | Sanitized source location/reference; no binary/raw document. |
| `confidence_score` | NUMERIC(5,4) | Yes | Range `0` through `1`. |
| `candidate_sequence` | INTEGER | Yes | Permits alternate candidates for a field. |
| `created_by` / `created_at` | UUID / TIMESTAMPTZ | Yes | Append-only audit. |

### 6.5 `automation_inference_result`

**Objective:** Persist an advisory score, classification, insight, recommendation, or draft with safe explainability metadata.

| Column | Type | Required | Purpose / rule |
|---|---|---|---|
| `automation_inference_result_id` | UUID | Yes | Primary key. |
| `automation_review_case_id` | UUID | Yes | Parent Review Case. |
| `automation_job_attempt_id` | UUID | Yes | Producing attempt. |
| `inference_type_reference_value_id` | UUID | Yes | Readiness score, denial insight, appeal draft, etc. |
| `result_payload` | JSONB | Yes | Structured advisory result, protected/minimum-necessary. |
| `readiness_score` | SMALLINT | No | Required only for readiness inference; range `0`–`100`. |
| `confidence_score` | NUMERIC(5,4) | No | Range `0`–`1` if model confidence applies. |
| `explanation_summary` | TEXT | No | Sanitized human-readable explanation. |
| `created_by` / `created_at` | UUID / TIMESTAMPTZ | Yes | Append-only audit. |

### 6.6 `automation_review_decision`

**Objective:** Record an immutable human decision concerning a candidate or inference result.

| Column | Type | Required | Purpose / rule |
|---|---|---|---|
| `automation_review_decision_id` | UUID | Yes | Primary key. |
| `automation_review_case_id` | UUID | Yes | Parent Review Case. |
| `target_entity_type` | VARCHAR(100) | Yes | Candidate or inference result. |
| `target_entity_id` | UUID | Yes | Reviewed output ID. |
| `decision_reference_value_id` | UUID | Yes | Accept, reject, correct, defer, override. |
| `final_value` | JSONB | No | Required for correction/override when value changes. |
| `decision_reason` | TEXT | No | Required for correction/override. |
| `reviewed_by` / `reviewed_at` | UUID / TIMESTAMPTZ | Yes | Active human actor/audit time. |
| `created_at` | TIMESTAMPTZ | Yes | Append-only record time. |

### 6.7 `automation_owner_command_request`

**Objective:** Reliably request an approved action from the owning bounded context without directly mutating it.

| Column | Type | Required | Purpose / rule |
|---|---|---|---|
| `automation_owner_command_request_id` | UUID | Yes | Primary key. |
| `organization_id` / `hospital_id` / `claim_id` | UUID | Yes / No / No | Scope/reference as applicable. |
| `source_aggregate_type` / `source_aggregate_id` | VARCHAR(100) / UUID | Yes | Originating automation aggregate. |
| `target_context` | VARCHAR(100) | Yes | Receiving owner context. |
| `command_type` | VARCHAR(150) | Yes | Approved request type. |
| `command_payload` | JSONB | Yes | Minimum-necessary, non-secret request payload. |
| `correlation_id` / `idempotency_key` | UUID / VARCHAR(200) | Yes | Delivery/idempotency. |
| `status_reference_value_id` | UUID | Yes | Pending, delivered, accepted, rejected, failed. |
| `processed_at` | TIMESTAMPTZ | No | Delivery result time. |
| shared mutable audit columns | See §5.1 | Yes | Audit, soft delete, version. |

### 6.8 `payer_dispatch_task`

**Objective:** Control one non-secret payer routing/submission task.

| Column | Type | Required | Purpose / rule |
|---|---|---|---|
| `payer_dispatch_task_id` | UUID | Yes | Primary key. |
| `organization_id` / `hospital_id` / `claim_id` | UUID | Yes | Immutable Claim scope. |
| `claim_product_reference_value_id` | UUID | Yes | Immutable product context. |
| `claim_submission_intent_id` | UUID | Yes | Claim Processing reference. |
| `insurance_partner_id` | UUID | Yes | Insurance Foundation reference. |
| `hospital_insurance_partner_integration_id` | UUID | Yes | Approved route reference. |
| `channel_reference_value_id` | UUID | Yes | Email, API, RPA portal. |
| `credential_secret_reference` | VARCHAR(500) | No | Opaque reference only; never a secret value. |
| `status_reference_value_id` | UUID | Yes | `DISPATCH_*` lifecycle. |
| `correlation_id` / `idempotency_key` | UUID / VARCHAR(200) | Yes | Traceability/idempotency. |
| shared mutable audit columns | See §5.1 | Yes | Audit, soft delete, version. |

### 6.9 `payer_dispatch_attempt`

**Objective:** Preserve each immutable dispatch execution attempt.

| Column | Type | Required | Purpose / rule |
|---|---|---|---|
| `payer_dispatch_attempt_id` | UUID | Yes | Primary key. |
| `payer_dispatch_task_id` | UUID | Yes | Parent Dispatch Task. |
| `attempt_number` | INTEGER | Yes | Unique per task. |
| `status_reference_value_id` | UUID | Yes | In-progress, completed, failed. |
| `external_correlation_reference` | VARCHAR(255) | No | Non-secret trace reference. |
| `failure_classification_reference_value_id` | UUID | No | Safe failure category. |
| `failure_summary` | VARCHAR(1000) | No | Redacted diagnostic. |
| `started_at` / `completed_at` | TIMESTAMPTZ | Yes / No | Attempt timing. |
| `created_by` / `created_at` | UUID / TIMESTAMPTZ | Yes | Append-only audit. |

### 6.10 `payer_dispatch_verification`

**Objective:** Preserve verification evidence before a completed dispatch requests Claim action.

| Column | Type | Required | Purpose / rule |
|---|---|---|---|
| `payer_dispatch_verification_id` | UUID | Yes | Primary key. |
| `payer_dispatch_task_id` / `payer_dispatch_attempt_id` | UUID | Yes | Parent task and attempt. |
| `verification_status_reference_value_id` | UUID | Yes | Verified, rejected, pending review. |
| `verification_source` | VARCHAR(100) | Yes | Human, email receipt, API acknowledgement, portal evidence, etc. |
| `verification_reference` | VARCHAR(255) | No | Safe evidence reference only. |
| `verified_by` / `verified_at` | UUID / TIMESTAMPTZ | Yes | Actor/system accountability. |
| `created_at` | TIMESTAMPTZ | Yes | Append-only audit. |

### 6.11 `automation_audit_entry`

**Objective:** Store immutable non-secret audit evidence.

| Column | Type | Required | Purpose / rule |
|---|---|---|---|
| `automation_audit_entry_id` | UUID | Yes | Primary key. |
| `organization_id` / `hospital_id` / `claim_id` | UUID | Yes / No / No | Applicable tenant scope. |
| `aggregate_type` / `aggregate_id` | VARCHAR(100) / UUID | Yes | Audited automation aggregate. |
| `event_type_reference_value_id` | UUID | Yes | Controlled audit event category. |
| `correlation_id` | UUID | Yes | End-to-end traceability. |
| `model_identifier` / `policy_version` | VARCHAR(200) / VARCHAR(100) | No | Model/prompt/policy audit metadata. |
| `sanitized_input_provenance` | JSONB | No | Safe provenance, not raw source content. |
| `outcome_metadata` | JSONB | No | Redacted/safe result metadata. |
| `actor_user_id` | UUID | No | Human/system actor reference. |
| `occurred_at` | TIMESTAMPTZ | Yes | Immutable event time. |
| `created_at` | TIMESTAMPTZ | Yes | Persisted time. |

## 7. Foreign-Key Strategy

- All tenant references use `ON DELETE RESTRICT` because business records are soft-deleted.
- Automation-owned parent/child FKs use `ON DELETE RESTRICT`; normal business operations do not physically delete an aggregate.
- Historic/audit references use `ON DELETE RESTRICT` or no physical-delete pathway, preserving evidence.
- Claim/Hospital tenant consistency is enforced with composite foreign keys where existing Phase 5–9 unique tenant keys permit it; otherwise the same validation is mandatory in database command functions and application layer.
- Audit actor/reviewer references point to `public.users(id)` with `ON DELETE RESTRICT` for auditable human activity.
- References to source artefacts or external storage must be safe identifiers, not FKs that force document deletion semantics into this context.

## 8. Check Constraints

The migrations must create named constraints for:

- `ck_automation_extraction_candidate_confidence_score`: confidence `>= 0 AND <= 1`.
- `ck_automation_inference_result_confidence_score`: nullable confidence is in range when present.
- `ck_automation_inference_result_readiness_score`: nullable score is `0` through `100` when present.
- Positive `attempt_number` and positive aggregate `version`.
- Required paired Claim scope fields for Claim-related Work Requests and Review Cases.
- Non-empty trimmed `source_record_type`, `idempotency_key`, aggregate/command type, and channel/source descriptions.
- No credential-like content is allowed in `credential_secret_reference`; only its opaque identifier format will be permitted. Detailed syntax is decided during SQL review.

Controlled lifecycle values are reference-data foreign keys, not hard-coded table enums.

## 9. Unique Constraints and Idempotency

| Name | Table | Rule |
|---|---|---|
| `uq_automation_work_request_active_idempotency` | `automation_work_request` | Active Organization + purpose + source identity + idempotency key is unique. |
| `uq_automation_job_attempt_request_number` | `automation_job_attempt` | Work Request + attempt number is unique. |
| `uq_automation_review_case_request_type_active` | `automation_review_case` | One active review case per Work Request and review type. |
| `uq_automation_extraction_candidate_case_field_sequence` | `automation_extraction_candidate` | Review Case + field + candidate sequence is unique. |
| `uq_automation_review_decision_target_sequence` | `automation_review_decision` | Target entity + review decision sequence is unique. |
| `uq_automation_owner_command_request_active_idempotency` | `automation_owner_command_request` | Target context + command type + correlation/idempotency is unique while active. |
| `uq_payer_dispatch_task_active_idempotency` | `payer_dispatch_task` | Organization + submission intent + integration route + idempotency key is unique while active. |
| `uq_payer_dispatch_attempt_task_number` | `payer_dispatch_attempt` | Dispatch Task + attempt number is unique. |
| `uq_payer_dispatch_verification_attempt_source` | `payer_dispatch_verification` | Attempt + verification source/reference is unique when an external reference exists. |
| `uq_automation_audit_entry_correlation_sequence` | `automation_audit_entry` | Correlation + aggregate + append sequence/event identity is unique. |

All “active” uniqueness definitions apply only where no soft deletion has occurred. Append-only records do not use soft-delete filtering.

## 10. Index Strategy

| Index | Table | Columns / filter | Purpose |
|---|---|---|---|
| `idx_automation_work_request_org_status_active` | Work Request | `organization_id, status_reference_value_id, requested_at DESC` active | Tenant operational queue. |
| `idx_automation_work_request_claim_active` | Work Request | `organization_id, hospital_id, claim_id` active | Claim automation history. |
| `idx_automation_work_request_correlation` | Work Request | `correlation_id` | Trace/retry diagnostics. |
| `idx_automation_job_attempt_request` | Job Attempt | `automation_work_request_id, attempt_number DESC` | Attempt history. |
| `idx_automation_review_case_org_status_active` | Review Case | `organization_id, status_reference_value_id, created_at DESC` active | Review queue. |
| `idx_automation_review_case_claim_active` | Review Case | `organization_id, hospital_id, claim_id` active | Claim reviews. |
| `idx_automation_candidate_case_field` | Extraction Candidate | `automation_review_case_id, field_code` | Candidate lookup. |
| `idx_automation_inference_case_type` | Inference Result | `automation_review_case_id, inference_type_reference_value_id` | Advisory output lookup. |
| `idx_automation_review_decision_case_created` | Review Decision | `automation_review_case_id, created_at DESC` | Review history. |
| `idx_automation_command_request_org_status_active` | Command Request | `organization_id, target_context, status_reference_value_id, created_at` active | Durable-delivery scan. |
| `idx_payer_dispatch_task_org_status_active` | Dispatch Task | `organization_id, hospital_id, status_reference_value_id, created_at` active | Dispatch operational queue. |
| `idx_payer_dispatch_task_claim_active` | Dispatch Task | `organization_id, hospital_id, claim_id` active | Claim dispatch history. |
| `idx_payer_dispatch_attempt_task` | Dispatch Attempt | `payer_dispatch_task_id, attempt_number DESC` | Attempt history. |
| `idx_automation_audit_entry_org_occurred` | Audit Entry | `organization_id, occurred_at DESC` | Tenant audit retrieval. |
| `idx_automation_audit_entry_aggregate` | Audit Entry | `aggregate_type, aggregate_id, occurred_at DESC` | Aggregate audit trail. |
| `idx_automation_audit_entry_correlation` | Audit Entry | `correlation_id, occurred_at DESC` | End-to-end trace. |

Additional indexes require an approved production query or observed performance justification.

## 11. Append-Only Enforcement

PostgreSQL trigger functions must block normal `UPDATE` and `DELETE` operations for:

- `automation_job_attempt`
- `automation_extraction_candidate`
- `automation_inference_result`
- `automation_review_decision`
- `payer_dispatch_attempt`
- `payer_dispatch_verification`
- `automation_audit_entry`

Any correction is represented as a new append-only record and, where required, a corresponding mutable parent aggregate version update.

## 12. Protected Data and Secret Prohibition

- `candidate_value`, `result_payload`, provenance, and outcome metadata retain only minimum necessary content and must be designed for approved protection/redaction controls.
- The final physical design may use JSONB for structured advisory data but must validate its content is not a credential/secrets payload.
- `credential_secret_reference` is an opaque pointer. It is never used to store an encrypted or plaintext secret.
- Raw documents, email bodies, raw portal pages, unredacted provider request/response payloads, and browser session data are prohibited from these tables.
- API and repository projections must exclude protected/raw fields unless a separately approved authorized review use case requires them.

## 13. Migration Sequence

1. Add required Phase 10 Reference Data categories and values.
2. Create `automation_work_request` and `automation_job_attempt`.
3. Create Review Case, Candidates, Inference Results, Review Decisions, and Command Requests.
4. Create Dispatch Task, Attempts, and Verification tables.
5. Create Audit Entry table.
6. Add primary keys, foreign keys, check constraints, unique constraints, and indexes.
7. Add append-only trigger functions/triggers.
8. Add post-migration validation SQL for tables, constraints, indexes, references, tenant keys, and append-only controls.

Each migration is additive and backward compatible. No Phase 1–9 table is dropped, renamed, or structurally repurposed.

## 14. Validation Before SQL Migration

The SQL Architecture Review must confirm:

- Existing foreign-key and tenant-key names/types support the proposed references.
- Required reference categories and values are not already owned by a conflicting module.
- Every mutable table contains the mandatory audit, soft-delete, and version columns.
- Every append-only table has appropriate audit columns and trigger protections.
- Partial uniqueness and indexes match expected operational queries.
- No design path permits plaintext secret persistence or direct owner-context update.

## 15. Approval Gate

**Decision:** Approved. Proceed to the SQL Architecture Review before creating any Phase 10 migration.
