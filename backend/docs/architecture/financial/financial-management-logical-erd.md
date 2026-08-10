# ClaimNX Phase 9 — Financial Management Logical ERD

| Attribute | Value |
|---|---|
| Module | Financial Management |
| Phase | 9 — Financial Management |
| Status | Draft — Awaiting Approval |
| Prerequisite | Financial Management Aggregate Design approved |
| Scope | Logical model only; no physical SQL |

---

## 1. Objective

Define the logical Financial Management model, entity cardinalities, tenant ownership, and cross-context references. This document does not prescribe PostgreSQL data types, indexes, triggers, constraints, migration sequence, or code.

## 2. Logical entity model

```text
Organization 1 ──── * Hospital
Hospital     1 ──── * financial_remittance_batch
Insurance Partner 1 ─ * financial_remittance_batch

financial_remittance_batch 1 ──── * financial_remittance_line_item
financial_remittance_batch 1 ──── * financial_remittance_evidence

Claim 1 ──── * financial_claim_settlement
financial_remittance_line_item 1 ──── 0..1 financial_claim_settlement (active final settlement)

financial_claim_settlement 1 ──── * financial_settlement_deduction
financial_claim_settlement 1 ──── * financial_recovery
financial_claim_settlement 1 ──── * financial_posting

financial_bank_statement_line 1 ──── * financial_bank_match
financial_remittance_batch 1 ──── * financial_bank_match
financial_claim_settlement 0..1 ──── * financial_bank_match
```

## 3. Entity definitions

### 3.1 `financial_remittance_batch`

**Aggregate root:** Remittance Batch

| Logical attribute | Meaning |
|---|---|
| remittance_batch_id | Aggregate identity. |
| organization_id | Immutable tenant owner. |
| hospital_id | Immutable Hospital financial scope. |
| insurance_partner_id | Referenced platform Insurer/TPA. |
| hospital_insurance_partner_integration_id | Optional non-secret Hospital–Payer routing/source reference. |
| remittance_reference | Payer’s batch/advice identifier; may be UTR only when it represents the advice reference. |
| source_type_reference_value_id | Controlled source, e.g. ERA_835, CSV, MANUAL, EMAIL, PORTAL. |
| operational_status_reference_value_id | Controlled Batch lifecycle state. |
| payment_date | Payer-advised payment date. |
| currency_code | Batch currency. |
| gross_amount | Advised gross payment. |
| tds_amount | Batch-level TDS amount, if supplied. |
| other_deduction_amount | Batch-level deductions not represented by lines. |
| net_amount | Advised net payment. |
| external_file_reference | Non-secret document/object reference; no credential or raw secret payload. |
| audit/version fields | ClaimNX standard audit, soft-delete, and concurrency data. |

### 3.2 `financial_remittance_line_item`

**Owned by:** `financial_remittance_batch`

| Logical attribute | Meaning |
|---|---|
| remittance_line_item_id | Child identity. |
| organization_id, hospital_id | Persisted tenant context; must equal parent Batch. |
| remittance_batch_id | Parent Batch reference. |
| payer_claim_reference | Payer/TPA’s claim reference, if supplied. |
| claim_number | ClaimNX business number supplied/matched during ingestion. |
| claim_id | Optional Claim reference until matching is completed. |
| line_status_reference_value_id | Controlled matching/line state. |
| currency_code | Must equal Batch currency. |
| gross_claimed_amount | Amount stated by source as claimed, if supplied. |
| approved_amount | Amount stated by payer as approved, if supplied. |
| paid_amount | Amount stated by payer as paid. |
| deduction_amount | Total payer-advised deduction at line level. |
| patient_responsibility_amount | Explicit co-pay/deductible/non-covered amount. |
| source_payload_reference | Sanitized non-secret source/evidence pointer. |
| audit/version fields | ClaimNX standard audit, soft-delete, and concurrency data. |

### 3.3 `financial_remittance_evidence`

**Owned by:** `financial_remittance_batch`

| Logical attribute | Meaning |
|---|---|
| remittance_evidence_id | Child identity. |
| remittance_batch_id | Parent Batch reference. |
| evidence_type_reference_value_id | Controlled type, e.g. imported file, email message ID, portal reference. |
| external_reference | Non-secret immutable external pointer. |
| received_at | Time evidence was received. |
| integrity_hash | Optional digest of received content where approved. |
| audit/version fields | ClaimNX standard audit and retention data. |

### 3.4 `financial_claim_settlement`

**Aggregate root:** Claim Settlement

| Logical attribute | Meaning |
|---|---|
| claim_settlement_id | Aggregate identity. |
| organization_id, hospital_id | Immutable tenant scope. |
| claim_id | Required Phase 8 Claim reference. |
| remittance_line_item_id | Required source Line Item reference. |
| remittance_batch_id | Denormalized parent Batch reference for safe tenant/query scope. |
| claim_product_reference_value_id | Immutable product context copied/referenced from Claim. |
| settlement_status_reference_value_id | Controlled Draft/Reviewed/Posted/Void lifecycle. |
| currency_code | Settlement currency. |
| claimed_amount | Snapshot of applicable claim amount used in settlement. |
| approved_amount | Payer-approved amount used in settlement. |
| gross_paid_amount | Payer-advised gross paid amount. |
| tds_amount | TDS portion of financial outcome. |
| payer_deduction_amount | Sum of payer-side deductions. |
| patient_responsibility_amount | Explicit patient responsibility, not a payer deduction. |
| net_payer_settlement_amount | Calculated payer amount after TDS/deductions/adjustments. |
| reconciliation_status_reference_value_id | Controlled reconciliation state. |
| posted_at, posted_by | Required when posted. |
| adjustment_of_claim_settlement_id | Optional linked corrective settlement; not a rewrite of posted history. |
| audit/version fields | ClaimNX standard audit, soft-delete, and concurrency data. |

### 3.5 `financial_settlement_deduction`

**Owned by:** `financial_claim_settlement`

| Logical attribute | Meaning |
|---|---|
| settlement_deduction_id | Child identity. |
| claim_settlement_id | Parent Settlement reference. |
| organization_id, hospital_id | Persisted tenant context; must equal parent Settlement. |
| deduction_type_reference_value_id | Controlled type: TDS, tariff cap, co-pay, non-payable, payer adjustment, etc. |
| responsibility_reference_value_id | Controlled payer/patient/hospital responsibility classification. |
| amount | Non-negative deduction amount. |
| reason | Human-readable reason where supplied. |
| payer_reference | Optional non-secret payer adjustment code/reference. |
| audit/version fields | ClaimNX standard audit and concurrency data. |

### 3.6 `financial_recovery`

**Owned by:** `financial_claim_settlement`

| Logical attribute | Meaning |
|---|---|
| financial_recovery_id | Child identity. |
| claim_settlement_id | Parent Settlement reference. |
| organization_id, hospital_id | Persisted tenant context; must equal parent Settlement. |
| recovery_type_reference_value_id | Controlled type: appeal, patient recovery, write-off. |
| recovery_status_reference_value_id | Controlled lifecycle. |
| outstanding_amount | Amount originally subject to recovery. |
| recovered_amount | Amount realized, if any. |
| write_off_amount | Amount approved as write-off, if any. |
| reason | Required rationale for recovery/write-off decisions. |
| workflow_instance_id | Optional Workflow reference; Workflow does not own financial state. |
| resolved_at, resolved_by | Required when resolved/written off. |
| audit/version fields | ClaimNX standard audit, soft-delete, and concurrency data. |

### 3.7 `financial_posting`

**Owned by:** `financial_claim_settlement`; append-only.

| Logical attribute | Meaning |
|---|---|
| financial_posting_id | Immutable posting identity. |
| claim_settlement_id | Parent Settlement reference. |
| organization_id, hospital_id | Immutable tenant scope. |
| posting_group_id | Identity shared by the balanced debit/credit posting set. |
| posting_type_reference_value_id | Controlled financial event classification. |
| side | Debit or credit. |
| amount | Non-negative posting amount. |
| currency_code | Posting currency; equals Settlement currency. |
| occurred_at | Financial event timestamp. |
| reversal_of_financial_posting_id | Optional original posting when this is a compensating correction. |
| source_reference | Non-secret batch/UTR/advice traceability reference. |
| created_by, created_at | Required immutable audit fields. |

`financial_posting` does not use ordinary update/delete business operations. A later physical design will decide whether generic audit/version fields are present for consistency while still blocking mutation.

### 3.8 `financial_bank_statement_line`

**Aggregate root:** Bank Reconciliation

| Logical attribute | Meaning |
|---|---|
| bank_statement_line_id | Aggregate identity. |
| organization_id, hospital_id | Immutable tenant scope. |
| bank_account_reference | Opaque approved external account reference; never an account number. |
| bank_transaction_reference | Bank/UTR/credit reference. |
| transaction_date | Bank transaction date. |
| currency_code | Statement currency. |
| credit_amount | Inbound credited amount. |
| bank_charge_amount | Explicit bank charge, if known. |
| source_reference | Sanitized file/import source reference. |
| reconciliation_status_reference_value_id | Controlled match state. |
| audit/version fields | ClaimNX standard audit, soft-delete, and concurrency data. |

### 3.9 `financial_bank_match`

**Owned by:** `financial_bank_statement_line`

| Logical attribute | Meaning |
|---|---|
| bank_match_id | Child identity. |
| bank_statement_line_id | Parent statement line reference. |
| organization_id, hospital_id | Persisted tenant context; must equal parent line. |
| remittance_batch_id | Optional matching Batch reference. |
| claim_settlement_id | Optional matching Settlement reference. |
| posting_group_id | Optional matching posting-set reference. |
| matched_amount | Amount allocated by this decision. |
| match_status_reference_value_id | Controlled proposed/confirmed/rejected/variance state. |
| variance_amount | Explicit difference, if any. |
| rationale | Required for manual or variance decisions. |
| confirmed_at, confirmed_by | Required for confirmed match. |
| audit/version fields | ClaimNX standard audit and concurrency data. |

## 4. Cross-context logical references

| Financial entity | Referenced entity | Rule |
|---|---|---|
| Remittance Batch | `insurance_entities` | One active Insurance Partner. |
| Remittance Batch | `hospital_insurance_partner_integration` | Optional source/routing identity; same tenant/hospital where used. |
| Remittance Line Item / Settlement | `claims` | Claim is in the same organization/hospital. |
| Recovery | `workflow_instances` | Optional request tracking only; no workflow ownership transfer. |
| All financial business entities | `users` | Audit actor references. |
| All status/type fields | `reference_values` | Controlled platform/tenant reference data. |

## 5. Cardinality and uniqueness intentions

- One Batch contains one or more Line Items before it can become `INGESTED`.
- One Line Item has zero or one active final Settlement.
- One Claim can have multiple Settlements over time because remittance corrections/adjustments can occur; only a business-approved active-final state may apply for a specific Line Item.
- One Settlement can have many Deductions, Recoveries, and immutable Postings.
- One Bank Statement Line can have many Match Allocations, only under controlled partial-match/variance rules.
- Active business identifiers are unique within the correct Organization/Hospital scope, never globally unless an external identifier is genuinely globally unique by business policy.

## 6. Tenant and product integrity requirements

1. Every Financial entity persists `organization_id` and `hospital_id`.
2. Parent-child tenant fields must be equal.
3. Every cross-context reference must resolve to the same tenant before command persistence.
4. Settlement product is derived from the Claim; clients must not choose an alternate product.
5. ICA and PRE_POST activate financial strategy behavior; PARTNER_PROCESSING and KYP remain guarded beyond Draft/read support.

## 7. Deferred decisions for physical design

- Exact PostgreSQL column types and maximum lengths.
- Constraint, foreign-key, index, and trigger names.
- Whether posting balance is enforced by a deferred SQL constraint/trigger or command function transaction validation.
- Exact reference-value categories and allowed values.
- UTR uniqueness scope and treatment of payer reuse/duplicate advice.
- General-ledger account taxonomy and revenue recognition rules.
- Bank import file storage implementation and evidence retention period.

## 8. ERD approval checklist

- [x] Aggregate roots and child ownership are reflected in entities.
- [x] Claim and Financial Management ownership remain separated.
- [x] Immutable posting/correction model is explicit.
- [x] Tenant context is persisted throughout the model.
- [x] Future product isolation is maintained.
- [x] No physical schema or migration has been started.

## 9. Next step

After approval, perform the **Financial Management Architecture Review**. It will validate DDD boundaries, Clean Architecture layers, tenant enforcement, security, auditability, and compatibility before the Workflow and Implementation Plan.
