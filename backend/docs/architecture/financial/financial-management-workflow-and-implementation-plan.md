# ClaimNX Phase 9 - Financial Management Workflow and Implementation Plan

| Attribute | Value |
|---|---|
| Module | Financial Management |
| Phase | 9 - Financial Management |
| Status | Draft - Awaiting Approval |
| Prerequisites | Phase 8 complete; Phase 9 Business, Domain, Aggregate, ERD, and Architecture Review approved |
| Implementation style | Raw PostgreSQL migrations, DDD, Clean Architecture, versioned REST API |

---

## 1. Objective

Define the controlled implementation sequence for Phase 9 Financial Management. Work must pass each approval/validation gate before advancing. No engineer, script, or AI assistant may skip from a logical design directly to SQL or NestJS implementation.

## 2. Delivery scope

Phase 9 foundation delivers:

- Remittance Batch ingestion foundation and Remittance Line Items.
- Claim Settlement, classified deductions, recovery/write-off lifecycle, and immutable financial postings.
- Bank Statement Line and Bank Match foundation.
- ICA and PRE_POST financial strategies.
- Guarded Partner Processing and KYP strategy structures.
- Tenant-safe raw-SQL command persistence and versioned REST APIs.
- Unit, integration, tenant isolation, concurrency, and financial-balance tests.

Deferred scope:

- Full ERA/835 parser, email/RPA ingestion workers, bank feed connector, payment gateway, or secret manager integration.
- Full chart of accounts, statutory/GST accounting, patient billing ledger, invoices, and collections.
- Partner Processing fees/revenue-share rules and KYP predictive policy calculations.

## 3. Mandatory implementation sequence

```text
1. Legacy database preflight (read only)
2. Preflight review and remediation decision
3. Physical Database Design
4. SQL Architecture Review
5. Reference-data catalogue design
6. PostgreSQL migration scripts
7. Post-migration schema validation
8. Financial Domain Layer
9. Repository Layer
10. Command persistence functions and transaction validation
11. Application Layer
12. REST API / DTO / permission layer
13. Automated and integration testing
14. Phase completion review
```

## 4. Step-by-step plan

### Step 9.1 - Legacy database preflight (read only)

**Objective:** Discover existing financial/legacy tables and dependencies without changing the database.

**Why:** ClaimNX already contains historical tables such as `recovery`, `reconciliations`, and Claim-linked financial fields. Phase 9 must not overwrite or disconnect them.

**File path:** `docs/architecture/financial/financial-management-legacy-database-preflight.sql`

**Action:** Inspect:

- Existing finance/recovery/reconciliation/payment/bank/remittance-like tables.
- Columns, records, audit quality, soft-delete state, constraints, indexes, and foreign keys.
- References to `claims`, `insurance_entities`, `hospitals`, `users`, and any legacy settlement/recovery data.
- Existing Claim product/financial fields and incompatible lifecycle vocabulary.

**Validation:** Every query is `SELECT` / catalog inspection only. Results are reviewed before any migration exists.

**Pause for approval:** `Approve Financial Management Legacy Database Preflight Review`.

### Step 9.2 - Preflight remediation decision

**Objective:** Decide whether legacy records require audit remediation, safe evolution, compatibility views, or are retained as historical read-only data.

**Why:** No financial migration can assume existing records are tenant/audit/compliance ready.

**Action:** Document each legacy table decision: retain untouched, additive evolve, migrate/backfill, or defer.

**Validation:** No table is dropped, renamed, or data rewritten without an approved migration plan.

### Step 9.3 - Physical Database Design

**Objective:** Specify table columns, audit fields, tenant keys, constraints, uniqueness, soft-delete behavior, posting immutability, and index strategy.

**Why:** Financial data needs stricter integrity guarantees than an ordinary CRUD model.

**Deliverables:**

- `financial_remittance_batch`
- `financial_remittance_line_item`
- `financial_remittance_evidence`
- `financial_claim_settlement`
- `financial_settlement_deduction`
- `financial_recovery`
- `financial_posting`
- `financial_bank_statement_line`
- `financial_bank_match`

**Validation:** All business records follow ClaimNX UUID, audit, soft-delete, tenant isolation, and optimistic-concurrency standards. `financial_posting` has append-only enforcement.

**Pause for approval:** `Approve Financial Management Physical Database Design`.

### Step 9.4 - SQL Architecture Review

**Objective:** Review FK ownership, compound tenant keys, unique constraints, posting-balance enforcement, recovery/write-off integrity, and performance indexes.

**Why:** This is the final design gate before executable DDL.

**Validation:** The review explicitly confirms that posted finance data is immutable and no legacy relationship is broken.

**Pause for approval:** `Approve Financial Management SQL Architecture Review`.

### Step 9.5 - Reference-data catalogue design

**Objective:** Define platform-controlled financial categories and values before any command is persisted.

**Candidate categories:**

- `FINANCIAL_REMITTANCE_SOURCE_TYPE`
- `FINANCIAL_REMITTANCE_STATUS`
- `FINANCIAL_REMITTANCE_LINE_STATUS`
- `FINANCIAL_SETTLEMENT_STATUS`
- `FINANCIAL_DEDUCTION_TYPE`
- `FINANCIAL_RESPONSIBILITY_TYPE`
- `FINANCIAL_RECOVERY_TYPE`
- `FINANCIAL_RECOVERY_STATUS`
- `FINANCIAL_RECONCILIATION_STATUS`
- `FINANCIAL_BANK_MATCH_STATUS`
- `FINANCIAL_POSTING_TYPE`

**Validation:** All values are platform-owned (`organization_id IS NULL`), active, non-deleted, and validated by migration assertions.

### Step 9.6 - PostgreSQL migrations

**Objective:** Create additive, ordered, transactional raw SQL migrations.

**Why:** Migrations are ClaimNX’s database source of truth.

**Expected migration sequence:**

```text
seed_financial_reference_data
create_financial_remittance_tables
create_financial_settlement_tables
create_financial_recovery_and_posting_tables
create_financial_bank_reconciliation_tables
enforce_financial_integrity_and_indexes
validate_financial_schema
```

**Validation:** Migrations use explicit constraint names, avoid destructive changes, and finish with database assertions. Re-run safety is demonstrated where applicable.

**Pause for approval:** `Approve Financial Management PostgreSQL Migration Scripts`.

### Step 9.7 - Financial Domain Layer

**Objective:** Implement pure TypeScript aggregates, value objects, calculations, strategies, and domain errors.

**Expected elements:**

- `RemittanceBatch` aggregate.
- `ClaimSettlement` aggregate.
- `BankReconciliation` aggregate.
- `FinancialPosting` immutable value/entity model.
- `FinancialProductStrategyFactory`.
- ICA and PRE_POST strategies; guarded Partner Processing/KYP strategies.
- Monetary, currency, tenant, version, and balance validation.

**Validation:** Unit tests prove invalid totals, unbalanced postings, invalid product transitions, tenant mismatch, and stale versions are rejected.

**Pause for approval:** `Approve Financial Management Domain Layer`.

### Step 9.8 - Repository and command persistence layer

**Objective:** Implement raw-SQL/Supabase repository mappings and transactional PostgreSQL command functions.

**Why:** Settlement posting must be atomic across root update, deductions, postings, and audit history.

**Expected command functions:**

- Create/update remittance batch and line items.
- Create/review/post claim settlement.
- Create recovery and approve write-off.
- Create financial adjustment/compensating posting.
- Create/confirm bank match allocation.

**Validation:** Every command scopes Organization + Hospital, checks `expectedVersion`, and returns `NULL` on stale/inaccessible target where the application layer maps to `409`.

**Pause for approval:** `Approve Financial Management Command Persistence Migration Design`.

### Step 9.9 - Application Layer

**Objective:** Orchestrate IAM access, membership, Hospital scope, reference data, Claim/partner eligibility, product strategy, UUID generation, and error translation.

**Validation:** Application tests verify 400/403/404/409 behavior, tenant isolation, and no secret field in command/result objects.

**Pause for approval:** `Approve Financial Management Application Layer`.

### Step 9.10 - REST API and DTO Layer

**Objective:** Provide versioned, permission-protected API endpoints.

**Route pattern:**

```text
/v1/organizations/{organizationId}/hospitals/{hospitalId}/financial/...
```

**Expected endpoint groups:**

- Remittance Batches and Line Items
- Claim Settlements and Deductions
- Recoveries and Write-off approvals
- Bank Statement Lines and Match Allocations
- Read-only financial summaries

**Validation:** DTO allow-lists prevent secret fields, all mutable routes require version, and permission catalogue/guards are active.

**Pause for approval:** `Approve Financial Management REST API Layer`.

### Step 9.11 - Testing and completion review

**Objective:** Prove functional, security, tenant, concurrency, and immutable-ledger behavior.

**Required checks:**

- Domain calculation and strategy tests.
- Repository mapper and command-function tests.
- API integration tests for ICA and PRE_POST.
- Stale version `409` tests.
- Cross-tenant `403` tests.
- Posting balance and correction/compensating-posting tests.
- Append-only posting and history tests.
- `npm test -- --runInBand financial` and `npm run build`.

**Pause for approval:** `Approve Financial Management Testing`, then `Approve Financial Management Completion`.

## 5. Engineering rules during all steps

- Never store a secret or plaintext credential in the Financial database or API response.
- Never use floating point for money.
- Never mutate posted amount history; correct through compensating records.
- Never bypass Organization + Hospital filtering.
- Never let a Workflow task directly alter finance state.
- Never enable Partner Processing/KYP financial posting without explicit approved product requirements.
- Never delete or refactor legacy finance tables during Phase 9 without a reviewed, additive migration.

## 6. Next step

After approval, run the **Financial Management Legacy Database Preflight** in Supabase SQL Editor and share the read-only results for review.
