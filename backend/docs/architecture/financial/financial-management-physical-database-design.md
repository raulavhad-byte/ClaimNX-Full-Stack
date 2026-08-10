# ClaimNX Phase 9 - Financial Management Physical Database Design

| Attribute | Value |
|---|---|
| Module | Financial Management |
| Phase | 9 - Financial Management |
| Status | Draft - Awaiting Approval |
| Database | PostgreSQL / Supabase |
| Migration style | Additive raw SQL migrations only |
| Scope | ICA and PRE_POST operational finance; guarded product foundation for PARTNER_PROCESSING and KYP |

---

## 1. Objective

Define the production-ready physical PostgreSQL schema for Phase 9 Financial Management. The design records payer remittances, claim settlements, deductions, recoveries, immutable postings, and bank reconciliation without changing the ownership boundaries of Claim Processing, Insurance, Hospital, IAM, or Workflow.

## 2. Approved physical design decisions

- All new tables are additive and use the `financial_` prefix.
- Every business table has an application-generated UUID primary key, complete audit columns, `deleted_at`, `deleted_by`, and `version`.
- Every operational record persists `organization_id` and `hospital_id`; both must be filtered by every repository read and command.
- Financial amounts use `NUMERIC(19,4)`, never floating point. `currency_code` is `CHAR(3)` and stores the ISO-4217 currency code.
- `claim_product_reference_value_id` is persisted on finance records that need product isolation and is never modified after creation.
- `financial_posting` is append-only. Corrections use compensating postings; posted money history is never updated or deleted.
- No table stores payer portal passwords, tokens, email credentials, bank credentials, or raw external payloads. Evidence and external references are non-secret metadata only.
- A payer is mandatory for a remittance/settlement/recovery command, but it is not retroactively required on an existing Claim in this phase.

## 3. Common column conventions

Every table below contains these audit and concurrency columns unless explicitly stated otherwise:

| Column | Type | Required | Rule |
|---|---|---|---|
| `created_by` | UUID | Yes | References `public.users(id)` with `RESTRICT` |
| `created_at` | TIMESTAMPTZ | Yes | Defaults to `NOW()` |
| `updated_by` | UUID | Yes | References `public.users(id)` with `RESTRICT` |
| `updated_at` | TIMESTAMPTZ | Yes | Defaults to `NOW()` |
| `deleted_by` | UUID | No | Set only on soft delete |
| `deleted_at` | TIMESTAMPTZ | No | Normal deletion is prohibited |
| `version` | INTEGER | Yes | `DEFAULT 1`, `CHECK (version >= 1)` |

All active unique indexes use `WHERE deleted_at IS NULL`.

## 4. Table specifications

### 4.1 `financial_remittance_batch`

**Objective:** represent one payer remittance/advice received through a non-secret channel.

| Column | Type | Required | Purpose |
|---|---|---|---|
| `financial_remittance_batch_id` | UUID | Yes | Application-generated primary key |
| `organization_id` | UUID | Yes | Tenant owner, references `organizations(id)` |
| `hospital_id` | UUID | Yes | Operational Hospital scope |
| `insurance_partner_id` | UUID | Yes | References `insurance_entities(id)` |
| `claim_product_reference_value_id` | UUID | Yes | Immutable Claim Product reference data |
| `remittance_source_type_reference_value_id` | UUID | Yes | Email, portal, API, or manual import source |
| `remittance_status_reference_value_id` | UUID | Yes | Draft, received, validated, posted, or retired lifecycle |
| `remittance_reference` | VARCHAR(100) | Yes | Payer-provided non-secret remittance reference |
| `received_at` | TIMESTAMPTZ | Yes | Time ClaimNX received the advice |
| `currency_code` | CHAR(3) | Yes | ISO-4217 currency |
| `gross_amount` | NUMERIC(19,4) | Yes | Amount before deductions |
| `net_amount` | NUMERIC(19,4) | Yes | Amount received after deductions/adjustments |
| `external_reference` | VARCHAR(255) | No | Non-secret external delivery/reference ID |
| `notes` | TEXT | No | Controlled operational notes |

Rules: both amounts must be non-negative; `net_amount <= gross_amount`; remittance reference is unique per Organization and Insurance Partner while active.

### 4.2 `financial_remittance_line_item`

**Objective:** retain the payer-provided line-level financial outcome without modifying Claim lifecycle.

| Column | Type | Required | Purpose |
|---|---|---|---|
| `financial_remittance_line_item_id` | UUID | Yes | Application-generated primary key |
| `financial_remittance_batch_id` | UUID | Yes | Parent Batch |
| `organization_id` | UUID | Yes | Tenant scope |
| `hospital_id` | UUID | Yes | Hospital scope |
| `claim_id` | UUID | No | Matched Claim; null only while unmatched/reviewed |
| `line_status_reference_value_id` | UUID | Yes | Matched, unmatched, exception, or posted status |
| `payer_claim_reference` | VARCHAR(100) | No | Payer claim/pre-auth reference |
| `line_reference` | VARCHAR(100) | Yes | Payer line identifier within the batch |
| `gross_amount` | NUMERIC(19,4) | Yes | Payer line gross amount |
| `deduction_amount` | NUMERIC(19,4) | Yes | Total payer deduction amount |
| `net_amount` | NUMERIC(19,4) | Yes | Gross less deduction/adjustment |
| `currency_code` | CHAR(3) | Yes | ISO-4217 currency |
| `received_payload_summary` | JSONB | No | Structured, non-secret normalized summary only |

Rules: amounts are non-negative; `net_amount <= gross_amount`; unique active `(financial_remittance_batch_id, line_reference)`.

### 4.3 `financial_remittance_evidence`

**Objective:** store metadata for a source document already held in approved storage.

Columns: `financial_remittance_evidence_id` UUID PK, `financial_remittance_batch_id`, `organization_id`, `hospital_id`, `storage_object_reference VARCHAR(512)`, `file_name VARCHAR(255)`, `mime_type VARCHAR(100)`, `file_size_bytes BIGINT`, `document_hash VARCHAR(128)`, and common audit columns.

Rules: no binary data or credentials; active unique `(financial_remittance_batch_id, storage_object_reference)`; `file_size_bytes >= 0`.

### 4.4 `financial_claim_settlement`

**Objective:** record the approved monetary settlement of one Claim.

| Column | Type | Required | Purpose |
|---|---|---|---|
| `financial_claim_settlement_id` | UUID | Yes | Application-generated primary key |
| `organization_id` | UUID | Yes | Tenant scope |
| `hospital_id` | UUID | Yes | Hospital scope |
| `claim_id` | UUID | Yes | Settled Claim |
| `insurance_partner_id` | UUID | Yes | Payer/TPA responsible for settlement |
| `financial_remittance_line_item_id` | UUID | No | Supporting remittance line, where available |
| `claim_product_reference_value_id` | UUID | Yes | Immutable product discriminator |
| `settlement_status_reference_value_id` | UUID | Yes | Draft, confirmed, posted, cancelled, or retired |
| `settlement_reference` | VARCHAR(100) | Yes | ClaimNX settlement identifier |
| `payer_settlement_reference` | VARCHAR(100) | No | Payer settlement reference |
| `settled_at` | TIMESTAMPTZ | Yes | Effective settlement timestamp |
| `currency_code` | CHAR(3) | Yes | ISO-4217 currency |
| `gross_payer_paid_amount` | NUMERIC(19,4) | Yes | Payer gross paid amount |
| `tds_amount` | NUMERIC(19,4) | Yes | Tax deducted at source |
| `payer_deduction_amount` | NUMERIC(19,4) | Yes | Contractual/non-payable deductions |
| `other_payer_adjustment_amount` | NUMERIC(19,4) | Yes | Other payer-side adjustments |
| `net_payer_settlement_amount` | NUMERIC(19,4) | Yes | Net payer money received |
| `patient_responsibility_amount` | NUMERIC(19,4) | Yes | Patient liability, not payer deduction |
| `hospital_write_off_amount` | NUMERIC(19,4) | Yes | Hospital write-off, separately governed |
| `notes` | TEXT | No | Non-secret operational note |

Rules: every amount is non-negative. The command layer must enforce:

```text
net_payer_settlement_amount = gross_payer_paid_amount
                              - tds_amount
                              - payer_deduction_amount
                              - other_payer_adjustment_amount
```

Patient responsibility and hospital write-off are intentionally excluded from this payer settlement equation. Unique active `(organization_id, settlement_reference)`.

### 4.5 `financial_settlement_deduction`

**Objective:** classify each settlement deduction without obscuring the parent settlement total.

Columns: `financial_settlement_deduction_id` UUID PK, `financial_claim_settlement_id`, `organization_id`, `hospital_id`, `deduction_type_reference_value_id`, `deduction_reference VARCHAR(100) NULL`, `description TEXT NULL`, `amount NUMERIC(19,4)`, `currency_code CHAR(3)`, and common audit columns.

Rules: `amount > 0`; no active duplicate `(financial_claim_settlement_id, deduction_type_reference_value_id, deduction_reference)` when a reference is supplied. The command transaction validates classified deduction totals against the settlement amount.

### 4.6 `financial_recovery`

**Objective:** govern a recoverable amount independently from payer settlement and Claim business lifecycle.

Columns: `financial_recovery_id` UUID PK, `organization_id`, `hospital_id`, `claim_id`, `financial_claim_settlement_id NULL`, `insurance_partner_id`, `claim_product_reference_value_id`, `recovery_type_reference_value_id`, `recovery_status_reference_value_id`, `recovery_reference VARCHAR(100)`, `opened_at TIMESTAMPTZ`, `due_at TIMESTAMPTZ NULL`, `currency_code CHAR(3)`, `original_amount NUMERIC(19,4)`, `recovered_amount NUMERIC(19,4) DEFAULT 0`, `outstanding_amount NUMERIC(19,4)`, `notes TEXT NULL`, and common audit columns.

Rules: amounts are non-negative; `recovered_amount <= original_amount`; `outstanding_amount = original_amount - recovered_amount`; unique active `(organization_id, recovery_reference)`.

### 4.7 `financial_posting`

**Objective:** preserve immutable financial ledger postings for settlement, recovery, and future controlled corrections.

Columns: `financial_posting_id` UUID PK, `organization_id`, `hospital_id`, `claim_id NULL`, `financial_claim_settlement_id NULL`, `financial_recovery_id NULL`, `claim_product_reference_value_id`, `posting_type_reference_value_id`, `posting_reference UUID`, `posting_sequence INTEGER`, `posted_at TIMESTAMPTZ`, `currency_code CHAR(3)`, `debit_account_code VARCHAR(50)`, `credit_account_code VARCHAR(50)`, `amount NUMERIC(19,4)`, `description TEXT NULL`, and the mandatory `created_by`, `created_at`, `updated_by`, `updated_at`, `deleted_by`, `deleted_at`, `version` columns.

Rules: `amount > 0`; debit and credit accounts must differ; `updated_by`/`updated_at` equal the creation actor/timestamp at insert and `version` remains `1`; update/delete operations are prohibited by trigger. `posting_reference` groups balanced postings, and the command/application layer validates group balance before the transaction commits.

### 4.8 `financial_bank_statement_line`

**Objective:** capture a non-secret bank statement transaction for later matching.

Columns: `financial_bank_statement_line_id` UUID PK, `organization_id`, `hospital_id`, `bank_transaction_reference VARCHAR(100)`, `bank_account_reference VARCHAR(100)`, `transaction_at TIMESTAMPTZ`, `value_date DATE NULL`, `currency_code CHAR(3)`, `credit_amount NUMERIC(19,4) DEFAULT 0`, `debit_amount NUMERIC(19,4) DEFAULT 0`, `narration TEXT NULL`, `bank_match_status_reference_value_id`, and common audit columns.

Rules: exactly one of credit/debit is positive; active unique `(organization_id, bank_account_reference, bank_transaction_reference)`.

### 4.9 `financial_bank_match`

**Objective:** allocate a bank statement line to a Remittance Batch or Claim Settlement.

Columns: `financial_bank_match_id` UUID PK, `organization_id`, `hospital_id`, `financial_bank_statement_line_id`, `financial_remittance_batch_id NULL`, `financial_claim_settlement_id NULL`, `bank_match_status_reference_value_id`, `matched_amount NUMERIC(19,4)`, `matched_at TIMESTAMPTZ`, `notes TEXT NULL`, and common audit columns.

Rules: `matched_amount > 0`; exactly one target (`financial_remittance_batch_id` or `financial_claim_settlement_id`) is required; application transaction prevents total active matches from exceeding the bank line amount.

## 5. Foreign keys and tenant integrity

All parent/child relationships use `ON DELETE RESTRICT`; normal deletion is always a soft deletion command.

Required foreign keys include:

- Each tenant-scoped table: `organization_id -> organizations(id)` and `hospital_id -> hospitals(id)`.
- Each Claim-linked financial table: `claim_id -> claims(id)`.
- Payer-linked tables: `insurance_partner_id -> insurance_entities(id)`.
- Remittance children: `financial_remittance_batch_id -> financial_remittance_batch(financial_remittance_batch_id)`.
- Settlement children: `financial_claim_settlement_id -> financial_claim_settlement(financial_claim_settlement_id)`.
- Bank match parents: bank line, remittance batch, and settlement foreign keys.
- Every reference-value column: `reference_values(id)` with `RESTRICT`.
- Every mutable-table audit actor: `users(id)` with `RESTRICT`.

The final migration will add approved composite tenant constraints or command-function checks so a Claim, Hospital, and financial record cannot be linked across Organizations.

## 6. Index and constraint strategy

Required indexes include:

- Active tenant/Hospital retrieval indexes on every root aggregate.
- Active `claim_id` indexes for settlements, recoveries, and postings.
- Active `financial_remittance_batch_id` indexes for line items/evidence.
- Active `financial_claim_settlement_id` index for deductions.
- Active bank-line indexes on Organization, Hospital, transaction date, and match status.
- Partial active unique indexes for operational references described above.
- Append-only trigger on `financial_posting`.
- Check constraints for amount, currency format, lifecycle/version, mutually-exclusive amount/target fields, and settlement/recovery arithmetic where row-local enforcement is possible.

No index is created only for a speculative future query. Exact constraint and index names will follow the ClaimNX `pk_`, `fk_`, `uq_`, `idx_`, and `ck_` standards during SQL Architecture Review.

## 7. Legacy compatibility and migration strategy

- The legacy preflight must be retained with this design review. If it identifies a Finance candidate table with records or inbound foreign keys, that table requires a reviewed in-place evolution decision before migration.
- The existing `claims` and `claim_stages` tables are retained. Phase 9 adds surrounding finance records; it does not redesign them.
- A soft-deleted legacy Claim may keep incomplete historical audit data. It is not updated by Phase 9.
- A Claim without `payer_id` may exist before payer selection, but Financial commands reject it until a valid payer is present.
- All schema changes will be additive, forward-only raw SQL migrations in `src/database/migrations/`.

## 8. Validation required before SQL implementation

- Business and aggregate boundaries remain intact.
- No finance table contains credentials, tokens, or unrestricted external payloads.
- Every mutable business table has the mandated audit/soft-delete/version columns.
- All money uses `NUMERIC(19,4)` and explicit currency.
- Every financial command has Organization and Hospital scope validation.
- Settlement equation, deduction classification, immutable posting, and bank-match allocation rules are enforceable.

## 9. Pause for approval

**Requested decision:** `Approve Financial Management Physical Database Design`

After approval, the next deliverable is the Financial Management SQL Architecture Review. No migration will be run before that review is approved.
