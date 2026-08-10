# ClaimNX Claim Processing SQL Architecture Review

| Attribute | Value |
|---|---|
| Module | Claim Processing |
| Phase | Phase 8 - Claim Processing |
| Version | 1.0 |
| Status | Draft - awaiting approval |
| Prerequisite | Claim Processing Physical Database Design approved |
| Date | 2026-08-01 |

## 1. Objective

Review the planned PostgreSQL migration architecture for Claim Processing before any Phase 8 SQL migration is created or applied. This review confirms that the physical design can be implemented without structural breakage to legacy Claim data, downstream foreign keys, tenant isolation, or the boundaries of Hospital, Insurance, Workflow, and Financial Management.

## 2. Reviewed Decision

The approved implementation direction is an additive, in-place evolution:

```text
public.claims        -> retained and expanded as the Claim aggregate root
public.claim_stages  -> retained and evolved as append-only Claim Status History compatibility storage
new child tables     -> claim_authorizations, claim_queries, claim_submission_intents
new technical table  -> organization-scoped Claim Number allocator
```

No Phase 8 migration may drop, rename, truncate, recreate, or physically delete from `claims` or `claim_stages`.

## 3. Legacy Compatibility Review

### 3.1 Existing dependencies

`public.claims` is referenced by legacy documents, legal cases, patient documents, queries, reconciliations, recovery, and claim stages. The planned migration does not modify those dependent foreign keys.

`claims.case_ref_id` remains globally unique as a legacy identifier. Phase 8 does not overload it as the new ClaimNX Claim Number.

### 3.2 Retired legacy data

The legacy Claim `CASE-10001` is already soft deleted and has no stage history. It has a valid Hospital and payer reference but no legacy audit actor.

The migration must preserve it without trying to represent it as a valid active Phase 8 Claim. New active-record constraints must be written so that this historical record does not block the rollout.

### 3.3 Physical-delete rules

Legacy foreign keys include `ON DELETE CASCADE` from several tables to `claims`, including `claim_stages`. This is not changed in Phase 8 because the ClaimNX application never performs normal physical Claim deletes. Application command functions implement soft deletion only.

## 4. Tenant Isolation Review

Every new active Claim table persists `organization_id` and validates it against its parent Claim.

| Relationship | Required validation |
|---|---|
| Claim -> Hospital | Composite Organization/Hospital integrity. A Claim cannot point to a Hospital outside its Organization. |
| Claim -> Hospital-Payer Integration | Integration Organization and Hospital must equal the Claim tenant and Hospital. |
| Claim child -> Claim | Child Organization must equal the Claim Organization. |
| Claim audit actor -> User | Actor is an active IAM User; application layer additionally validates active Organization membership when the command is tenant scoped. |
| Repository query | Claim reads/mutations always filter `organization_id`; Hospital-scoped commands additionally filter `hospital_id`. |

The database prevents invalid persisted cross-tenant relationships; service and API layers prevent unauthorized access before data access.

## 5. Reference Data Review

Claim Product and lifecycle classifications use existing centralized Reference Data rather than free text or a PostgreSQL enum.

Before structural constraints are enabled, a dedicated seed migration must:

1. create approved Claim categories only if absent;
2. insert approved global values only if absent;
3. preserve any future Organization-specific values separately;
4. assert every required active global value exists exactly once;
5. fail atomically if the controlled vocabulary is incomplete.

Database foreign keys guarantee a referenced value exists. Application and command functions must additionally validate that the value belongs to the expected category, is active, is global where required, and is not soft deleted.

## 6. Claim Product and Lifecycle Enforcement

### 6.1 Product immutability

`claim_product_reference_value_id` is assigned during Claim Draft creation and is never updated. The Claim command functions accept no product replacement parameter.

### 6.2 Lifecycle integrity

The root stores exactly one current lifecycle status reference. A transition command must:

1. load the active Claim under Organization/Hospital scope;
2. verify expected version;
3. invoke application/domain strategy validation;
4. update the root status and increment the version;
5. insert one append-only history record in the same transaction;
6. return the changed Claim identifier/version.

ICA and PRE_POST are enabled for approved operational transitions. PARTNER_PROCESSING and KYP allow Draft creation/read only and reject operational transitions through guarded strategies; this is application/domain behavior, not a database loophole.

### 6.3 Append-only history

The evolved `claim_stages` table must have a reviewed trigger or privilege-safe guard that rejects application `UPDATE` and `DELETE`. Migration backfill, if ever required, must be separately approved and recorded.

## 7. Audit, Soft Delete, and Concurrency Review

| Standard | SQL implementation requirement |
|---|---|
| Audit | New active records require `created_by`, `created_at`, `updated_by`, `updated_at`; deletion sets `deleted_by`, `deleted_at`. |
| Soft delete | Commands set deletion metadata; no normal `DELETE`. New active predicates use `deleted_at IS NULL` and legacy `COALESCE(is_deleted, FALSE) = FALSE` where the legacy field exists. |
| Concurrency | Mutable aggregate/child commands require `expected_version`, update with `WHERE version = expected_version`, and increment version atomically. |
| Conflict handling | A function returning no updated UUID means stale version, inactive/retired target, or tenant mismatch. Application layer determines the safe 404/409 response after scoped read behavior. |
| Historical data | Retired legacy rows are excluded from active audit assertions; no fabricated audit actor is written. |

## 8. Constraints and Index Review

### 8.1 Constraints to add only after preconditions pass

- Claim root: foreign keys to Organization, Hospital, reference values, active Hospital-Payer Integration, and audit Users.
- Claim root: version and non-negative amount checks.
- Claim child tables: parent Claim and Reference Data foreign keys plus standard audit/version checks.
- `claim_stages`: canonical tenant/product/status/actor foreign keys for new rows.
- Claim number: partial active unique key on `(organization_id, claim_number)`.
- Claim child table uniqueness: partial active uniqueness only where a real business invariant requires it.

### 8.2 Indexes

Indexes are created only for approved query paths:

- active tenant/Hospital Claim listing;
- active tenant/Product/lifecycle worklists;
- active Hospital-Payer Integration route lookup;
- parent Claim child retrieval;
- append-only Claim history retrieval by Claim and occurrence timestamp.

Existing legacy indexes on Hospital, Patient, payer, status, and stage Claim ID remain unless a future measured, separately reviewed migration removes an unused one.

## 9. Claim Number Allocation Review

The number allocation function is invoked only by the Draft creation transaction. It must lock/update a row scoped to one Organization and return a non-reusable value.

- Number allocation cannot be driven by the frontend.
- Number allocation cannot use Patient information.
- Soft deletion does not permit a number to be reused.
- The function and Claim insert occur in the same transaction so a rolled-back Claim does not expose an incorrectly committed Claim aggregate.

## 10. Workflow and Insurance Integration Review

- A Claim stores only an approved Hospital-Payer Integration UUID and non-secret routing/outcome references.
- Phase 8 does not send email, operate RPA, call payer APIs, read email, or store credentials.
- Claim lifecycle is authoritative; Workflow tasks do not change a Claim merely by completing a task.
- Workflow coordination needs an approved mapping. No migration or function hard-codes Workflow Definition UUIDs.
- Financial fields such as settlement and recovery are not mutated by Claim Processing SQL functions.

## 11. Planned Migration Units

| Order | Migration intent | Safety gate |
|---:|---|---|
| 1 | Seed/validate Claim Reference Data. | Exact categories/values available and active. |
| 2 | Add Claim root canonical columns, initially backward-compatible. | Existing retired row remains valid. |
| 3 | Create Claim child tables and Claim Number allocator. | Existing tables/dependencies untouched. |
| 4 | Evolve Claim Status History additively and protect append-only behavior. | No history update/delete path. |
| 5 | Add constraints, partial indexes, and composite tenant integrity. | Data validation succeeds first. |
| 6 | Create command persistence functions. | All writes tenant scoped and version checked. |
| 7 | Add post-migration validation SQL. | All structural, data, and guard checks return expected results. |

Each migration is forward-only, transactionally atomic where PostgreSQL permits, idempotent only where an existing condition is explicitly intended, and committed to Git before application code depends on it.

## 12. Migration Safety Requirements

- Use `IF NOT EXISTS` only for safely repeatable additive DDL; never use it to conceal incompatible schema drift.
- Verify actual legacy constraint/index names from the completed preflight before dropping or replacing any constraint. Phase 8 does not currently need to drop an existing Claim foreign key.
- Add nullable columns first, validate/backfill only eligible records, then add constraints based on active data rules.
- Do not add a blanket `NOT NULL` constraint that would make the retired legacy Claim invalid.
- Avoid `ON DELETE CASCADE` for new Claim aggregate foreign keys; use `ON DELETE RESTRICT` and application soft deletion.
- Never execute migration SQL through frontend clients.
- Run post-migration validation before deploying NestJS persistence code.

## 13. Review Outcome

The proposed SQL architecture is approved for **migration-script drafting only after this document is approved**. It preserves the legacy schema, aligns with ClaimNX DDD ownership boundaries, implements tenant isolation and concurrency at the persistence boundary, and avoids premature Financial or Automation scope.

## 14. File Path and Action

| Item | Value |
|---|---|
| File path | `docs/architecture/claims/claim-processing-sql-architecture-review.md` |
| File name | `claim-processing-sql-architecture-review.md` |
| Action | Review and approve SQL safety before any Phase 8 migration script is drafted. |

## 15. Approval Gate

**Next deliverable after approval:** Claim Processing PostgreSQL Migration Scripts and post-migration validation plan.

**Pause for approval:** Confirm the in-place migration model, reference-data guard, tenant integrity, append-only history, Claim Number strategy, migration order, and legacy record treatment.
