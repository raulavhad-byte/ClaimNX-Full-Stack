# ClaimNX Phase 9 - Financial Management SQL Architecture Review

| Attribute | Value |
|---|---|
| Module | Financial Management |
| Phase | 9 - Financial Management |
| Status | Draft - Awaiting Approval |
| Scope | SQL architecture only; no migration is executed by this document |
| Database | PostgreSQL / Supabase |

---

## 1. Objective

Review the database-enforceable architecture for Financial Management before raw PostgreSQL migration scripts are written. This review converts the approved physical design into explicit constraints, foreign keys, indexes, append-only protections, and transaction rules.

## 2. Migration sequencing

The migration set must be forward-only, additive, and applied in this order:

1. Seed Phase 9 reference categories and global values.
2. Create `financial_remittance_batch`.
3. Create remittance children: `financial_remittance_line_item` and `financial_remittance_evidence`.
4. Create `financial_claim_settlement` and `financial_settlement_deduction`.
5. Create `financial_recovery`.
6. Create `financial_posting`, its append-only trigger, and supporting indexes.
7. Create `financial_bank_statement_line` and `financial_bank_match`.
8. Create command-persistence functions only after the tables and constraints exist.
9. Apply a final read-only schema validation migration/query.

No migration modifies, deletes, renames, or backfills the existing `claims`, `claim_stages`, Hospital, Insurance, or Workflow tables.

## 3. Table, primary-key, and audit review

| Table | Primary key constraint | Mutability model | Mandatory audit model |
|---|---|---|---|
| `financial_remittance_batch` | `pk_financial_remittance_batch` | Mutable before posting/retirement | Full audit, soft delete, version |
| `financial_remittance_line_item` | `pk_financial_remittance_line_item` | Mutable only while parent is mutable | Full audit, soft delete, version |
| `financial_remittance_evidence` | `pk_financial_remittance_evidence` | Metadata mutable while parent is mutable | Full audit, soft delete, version |
| `financial_claim_settlement` | `pk_financial_claim_settlement` | Mutable only before posting | Full audit, soft delete, version |
| `financial_settlement_deduction` | `pk_financial_settlement_deduction` | Mutable only while settlement is mutable | Full audit, soft delete, version |
| `financial_recovery` | `pk_financial_recovery` | Mutable with optimistic concurrency | Full audit, soft delete, version |
| `financial_posting` | `pk_financial_posting` | Append-only | Full audit columns populated at insertion; update/delete/version mutation prohibited |
| `financial_bank_statement_line` | `pk_financial_bank_statement_line` | Mutable before final reconciliation | Full audit, soft delete, version |
| `financial_bank_match` | `pk_financial_bank_match` | Mutable before match finalization | Full audit, soft delete, version |

For every mutable table, migration defaults are `created_at DEFAULT NOW()`, `updated_at DEFAULT NOW()`, and `version DEFAULT 1`. All command functions require application-generated UUIDs and an expected version for updates, lifecycle changes, or soft deletes.

## 4. Tenant and ownership integrity

Each operational root and child persists `organization_id` and `hospital_id`. Repository queries and command functions must filter on both values.

Required database references:

| Constraint family | Rule |
|---|---|
| `fk_financial_*_organization` | `organization_id -> public.organizations(id)` with `ON DELETE RESTRICT` |
| `fk_financial_*_hospital` | `hospital_id -> public.hospitals(id)` with `ON DELETE RESTRICT` |
| `fk_financial_*_claim` | Claim-bound records reference `public.claims(id)` with `ON DELETE RESTRICT` |
| `fk_financial_*_insurance_partner` | Payer records reference `public.insurance_entities(id)` with `ON DELETE RESTRICT` |
| `fk_financial_*_user` | Audit actors reference `public.users(id)` with `ON DELETE RESTRICT` |
| `fk_financial_*_reference_value` | Controlled types/statuses reference `public.reference_values(id)` with `ON DELETE RESTRICT` |
| `fk_financial_remittance_line_item_batch` | Line item belongs to one Batch with `RESTRICT` |
| `fk_financial_remittance_evidence_batch` | Evidence belongs to one Batch with `RESTRICT` |
| `fk_financial_settlement_deduction_settlement` | Deduction belongs to one Settlement with `RESTRICT` |
| `fk_financial_bank_match_*` | Match references one Bank Line and exactly one of Batch or Settlement |

Foreign keys establish referential integrity only. The functions must additionally validate that the Claim, Hospital, payer enablement/integration route, and finance record belong to the same Organization and Hospital scope. A foreign key must never be treated as a tenant-authorization substitute.

## 5. Check constraints

| Constraint name pattern | Rule |
|---|---|
| `ck_financial_*_version` | `version >= 1` |
| `ck_financial_*_currency_code` | `currency_code ~ '^[A-Z]{3}$'` |
| `ck_financial_remittance_batch_amounts` | `gross_amount >= 0 AND net_amount >= 0 AND net_amount <= gross_amount` |
| `ck_financial_remittance_line_item_amounts` | Gross/deduction/net are non-negative and net does not exceed gross |
| `ck_financial_settlement_amounts` | All stored settlement amounts are non-negative |
| `ck_financial_settlement_deduction_amount` | `amount > 0` |
| `ck_financial_recovery_amounts` | `original_amount >= 0`, `recovered_amount >= 0`, `outstanding_amount >= 0`, `recovered_amount <= original_amount` |
| `ck_financial_posting_amount` | `amount > 0` |
| `ck_financial_posting_accounts` | `debit_account_code <> credit_account_code` |
| `ck_financial_bank_statement_line_amount` | Exactly one of debit/credit is positive |
| `ck_financial_bank_match_target` | Exactly one target: Batch XOR Settlement |
| `ck_financial_*_soft_delete` | `deleted_at IS NULL` and deletion marker/audit actor remain consistent |

The settlement and recovery equations span child rows and therefore are enforced inside transactional command functions, followed by service-layer validation. PostgreSQL row checks alone are not sufficient for aggregate arithmetic.

## 6. Unique constraints and active indexes

All business uniqueness is active-only using partial unique indexes where `deleted_at IS NULL`.

| Name | Table | Columns | Rule |
|---|---|---|---|
| `uq_financial_remittance_batch_org_partner_reference_active` | remittance batch | `organization_id, insurance_partner_id, remittance_reference` | One active payer remittance advice per tenant |
| `uq_financial_remittance_line_item_batch_line_reference_active` | line item | `financial_remittance_batch_id, line_reference` | One active payer line per batch |
| `uq_financial_remittance_evidence_batch_storage_active` | evidence | `financial_remittance_batch_id, storage_object_reference` | Prevent duplicate evidence metadata |
| `uq_financial_claim_settlement_org_reference_active` | settlement | `organization_id, settlement_reference` | ClaimNX settlement reference is tenant-unique |
| `uq_financial_recovery_org_reference_active` | recovery | `organization_id, recovery_reference` | Recovery reference is tenant-unique |
| `uq_financial_bank_statement_line_org_account_reference_active` | bank line | `organization_id, bank_account_reference, bank_transaction_reference` | Prevent duplicate bank entries |

Required non-unique active indexes:

- `idx_financial_remittance_batch_hospital_active` on `(organization_id, hospital_id, received_at DESC)`.
- `idx_financial_remittance_line_item_claim_active` on `(organization_id, hospital_id, claim_id)`.
- `idx_financial_claim_settlement_claim_active` on `(organization_id, hospital_id, claim_id, settled_at DESC)`.
- `idx_financial_recovery_claim_active` on `(organization_id, hospital_id, claim_id)`.
- `idx_financial_posting_claim_posted_at` on `(organization_id, hospital_id, claim_id, posted_at DESC)`.
- `idx_financial_bank_statement_line_hospital_date_active` on `(organization_id, hospital_id, transaction_at DESC)`.
- `idx_financial_bank_match_bank_line_active` on `(financial_bank_statement_line_id)`.

## 7. Append-only Financial Posting design

`financial_posting` is an immutable ledger. The migration creates a trigger named `trg_financial_posting_append_only` that calls `prevent_financial_posting_mutation()` before `UPDATE OR DELETE` and raises an exception.

Only an insert-capable command function may create a posting. It must:

1. Validate organization and hospital scope.
2. Validate the source settlement/recovery state.
3. Insert all rows belonging to a `posting_reference` in one transaction.
4. Validate that total debit equals total credit for the `posting_reference` and currency before returning success.
5. Never expose bank credentials, payer credentials, tokens, raw email bodies, or raw portal payloads.

Corrections are new compensating posting records with a new `posting_reference`; they do not change historical postings.

## 8. Lifecycle and reference-data review

Reference values are global (`organization_id IS NULL`) and active before any command function can use them. The migration must seed, at minimum:

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

ICA and PRE_POST commands are enabled. PARTNER_PROCESSING and KYP remain guarded: a Draft may be read, but financial operational posting and settlement lifecycle commands return a controlled product-strategy exception until a later approved phase enables them.

## 9. Legacy and security review

- Existing active Claims without a payer are not changed. Finance commands reject them until a valid payer is selected.
- The soft-deleted legacy Claim with a missing audit actor remains historical and is never altered by this Phase.
- `hospital_insurance_partner_integration.credential_secret_reference` remains an opaque external-secret reference. It is never copied into financial tables, logs, migrations, or API DTOs.
- No destructive alteration of legacy Finance candidates is allowed; any discovered candidate table requires a separately approved compatibility migration.

## 10. Validation gate

Before applying the migrations, validate that the migration plan contains:

- Correct `pk_`, `fk_`, `uq_`, `idx_`, and `ck_` names.
- Complete audit, soft-delete, and version fields for mutable tables.
- Tenant filtering and cross-tenant checks in every SQL command function.
- Amount/currency checks and all required partial unique indexes.
- Append-only posting protection.
- Additive, reversible-safe behavior with no legacy table drop.

## 11. Pause for approval

**Requested decision:** `Approve Financial Management SQL Architecture Review`

After approval, the next step is to create the Phase 9 reference-data catalogue and PostgreSQL migration scripts.
