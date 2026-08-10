# ClaimNX Phase 10 — AI & Automation SQL Architecture Review

| Attribute | Value |
|---|---|
| Module | AI & Automation |
| Phase | 10 — AI & Automation |
| Status | Approved |
| Database | PostgreSQL / Supabase |
| Scope | Read-only review of the approved physical design before migration authoring |

---

## 1. Objective

Confirm that the approved Phase 10 physical design can be implemented as additive PostgreSQL migrations without violating ClaimNX ownership boundaries, tenant isolation, audit rules, secret-handling policy, or existing Phase 1–9 database contracts.

No table, constraint, index, function, trigger, or data is created or changed by this review.

## 2. Review Scope

The future migration will introduce only the approved Phase 10 tables:

- `automation_work_request`
- `automation_job_attempt`
- `automation_review_case`
- `automation_extraction_candidate`
- `automation_inference_result`
- `automation_review_decision`
- `automation_owner_command_request`
- `payer_dispatch_task`
- `payer_dispatch_attempt`
- `payer_dispatch_verification`
- `automation_audit_entry`

Existing owner tables are referenced, never repurposed:

| Owner | Referenced records |
|---|---|
| Organization / IAM | Organizations, users, organization members |
| Hospital | Hospitals |
| Claim Processing | Claims and Claim product/lifecycle reference values |
| Insurance Foundation | Insurance partners and Hospital–Payer integrations |
| Workflow Platform | Work Items, where a linkage is an approved future requirement |
| Reference Data | Automation, review, dispatch, and confidence/status classifications |

## 3. Additive Migration Decision

**Approved direction:** all Phase 10 schema changes are additive.

- Do not rename, drop, or redefine Phase 1–9 tables.
- Do not add automation-owned columns to `claims`, `financial_*`, `workflow_*`, or Insurance owner tables.
- Do not introduce database defaults that generate business UUIDs; the NestJS application layer generates UUIDs.
- Do not create database triggers that directly mutate Claim, Financial, Insurance, or Workflow records.
- Do not store credentials, access tokens, passwords, browser cookies, sessions, or raw external payloads.

## 4. Tenant Isolation Review

Claim-related Phase 10 records persist both `organization_id` and `hospital_id` where the operation is Hospital scoped.

The future SQL design must use the existing Hospital tenant identity `(organization_id, id)` through a composite foreign-key pattern where the target schema supports it. This makes it impossible to persist a Hospital belonging to another Organization for the same automation record.

Every repository query must filter by the caller's Organization. Where a Hospital is part of the request, it must filter by both Organization and Hospital. The database foreign keys protect valid relationships; the API and service layers enforce actor authorization.

## 5. Foreign-Key Review

| Future source | Reference | Rule |
|---|---|---|
| Mutable automation roots | Organization, Hospital, IAM actor | `RESTRICT`; normal deletion is soft only |
| Claim-related roots | Claim | `RESTRICT`; Claim remains the owner |
| Dispatch task | Insurance Partner / Hospital–Payer integration | `RESTRICT`; validated as active by command logic |
| Job attempts / candidates / results | Parent automation request or review case | `RESTRICT`; append-only facts are retained |
| Review decisions | Review case / reviewer | `RESTRICT`; decision history is immutable |
| Dispatch attempts / verification | Dispatch task | `RESTRICT`; delivery evidence is retained |

No `ON DELETE CASCADE` is acceptable for audit, model-output, review, or dispatch-evidence tables. Soft-deleting a parent must not erase evidence.

## 6. Reference-Data Review

The Reference Data catalogue must be designed before the main Phase 10 migration. It will contain global, active, non-deleted values for at least:

- `AUTOMATION_WORK_PURPOSE`
- `AUTOMATION_WORK_STATUS`
- `AUTOMATION_REVIEW_TYPE`
- `AUTOMATION_REVIEW_STATUS`
- `AUTOMATION_JOB_STATUS`
- `AUTOMATION_DISPATCH_STATUS`
- `AUTOMATION_DISPATCH_CHANNEL`
- `AUTOMATION_VERIFICATION_STATUS`
- `AUTOMATION_OWNER_COMMAND_STATUS`
- `AUTOMATION_INFERENCE_TYPE`

Reference values represent classifications only. They do not grant permissions and must not encode provider credentials or secrets.

## 7. Audit, Version, and History Review

Mutable roots require all ClaimNX mandatory columns:

```text
created_by, created_at,
updated_by, updated_at,
deleted_by, deleted_at,
version
```

`version` starts at `1`; updates must use atomic optimistic concurrency predicates.

The following are append-only and must be protected against normal `UPDATE` and `DELETE`: attempts, candidates, inference results, review decisions, dispatch attempts, dispatch verifications, and automation audit entries. Their creation audit fields are mandatory. A focused PostgreSQL trigger may reject mutation of these Phase 10 history tables only.

## 8. Idempotency and Uniqueness Review

The future migration must provide partial unique indexes for active, non-deleted records where a business invariant requires one. The important rules are:

- A caller may not create duplicate active work requests for the same source aggregate, purpose, and idempotency key.
- A dispatch task may not be duplicated for the same submission intent and idempotency key.
- A model-attempt sequence is unique within its work request.
- A dispatch-attempt sequence is unique within its dispatch task.
- Review decision sequence is unique within its review case.

All active uniqueness predicates use `deleted_at IS NULL`; if a legacy `is_deleted` flag exists on a referenced owner table, existing owner-table rules remain authoritative.

## 9. Index Review

Indexes are justified only by approved access paths:

- Organization/Hospital/active-status queues for work requests and dispatch tasks.
- Claim-scoped active records for claim operations.
- Parent-and-sequence lookup for attempts, candidate versions, decisions, and audit entries.
- Correlation and idempotency lookups for safe retry handling.
- Review-case/status queues for authorized human-review operations.

All indexes will have `idx_` or `uq_` names and will be created in a reviewed migration. No speculative provider, full-text, or payload-content index is approved.

## 10. Payload and Privacy Review

JSONB fields may contain only structured, redacted business facts required for candidate evidence, confidence, sanitized provenance, or safe command context. They must never contain:

- raw clinical documents or images;
- full email/portal responses;
- password, token, cookie, session, or secret-manager value;
- unbounded provider logs; or
- protected personal data that is not required for the approved review case.

Database comments and repository projections must state this limitation. Encrypted document storage remains the owner of original documents.

## 11. Migration Order

1. Add and validate required Reference Data categories and global values.
2. Create mutable automation root tables with audit/version/tenant columns.
3. Create append-only evidence, inference, review, dispatch, and audit tables.
4. Add foreign keys, checks, partial unique indexes, and operational indexes.
5. Add Phase-10-local append-only trigger functions and triggers.
6. Add read-only post-migration validation SQL.
7. Commit migration and validation files together with the same reviewed architecture documents.

## 12. SQL Review Checklist

Before SQL is approved, verify all of the following:

- Existing organization, Hospital, user, claim, partner, and integration key types/names.
- Compatibility of composite tenant foreign keys with existing unique keys.
- No unsupported direct dependency on a secret manager table.
- Every mutable root has full audit, soft-delete, and version support.
- Every append-only table has correct lifecycle protection.
- Every reference-data category/value is globally scoped, active, and non-deleted.
- All uniqueness predicates include the correct active/non-deleted condition.
- Every migration can run repeatedly only where the migration framework needs idempotent guards; version-controlled deployment remains the source of truth.

## 13. Approval Gate

**Decision:** Approved. Proceed to the Phase 10 Reference-Data Catalogue before authoring migrations.
