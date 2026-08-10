# ClaimNX Phase 9 - Financial Management Reference-Data Catalogue

| Attribute | Value |
|---|---|
| Module | Financial Management |
| Phase | 9 - Financial Management |
| Status | Draft - Awaiting Approval |
| Owner | Reference Data bounded context |
| Scope | Global controlled values only (`organization_id IS NULL`) |

---

## 1. Objective

Define the controlled global reference categories and values required by Phase 9 Financial Management. Financial aggregates store only reference-value UUIDs; they do not store uncontrolled lifecycle, source, type, or responsibility text.

## 2. Governance rules

- Each category and value is global, active, non-deleted, and owned by Reference Data.
- The category code and value code are immutable business identifiers.
- Display names can change through a reviewed reference-data process; application logic uses codes/UUIDs, never display names.
- Adding, retiring, or changing a value is a reviewed migration. Financial commands must reject an unknown, inactive, or deleted reference value.
- Organization-specific overrides are out of scope for Phase 9.

## 3. Required categories and values

### 3.1 `FINANCIAL_REMITTANCE_SOURCE_TYPE`

| Code | Display name | Meaning |
|---|---|---|
| `EMAIL` | Email | Remittance advice received through an approved monitored mailbox |
| `PAYER_PORTAL` | Payer Portal | Advice obtained from an approved payer/TPA portal workflow |
| `API` | API | Advice received through an approved payer integration API |
| `MANUAL_IMPORT` | Manual Import | Authorized operational entry/import with source evidence |

### 3.2 `FINANCIAL_REMITTANCE_STATUS`

| Code | Display name | Meaning |
|---|---|---|
| `DRAFT` | Draft | Advice is being prepared or recorded |
| `RECEIVED` | Received | Advice/evidence has been received, but not fully validated |
| `VALIDATED` | Validated | Lines and amounts passed operational validation |
| `POSTED` | Posted | Finance postings have been created; money history is immutable |
| `RETIRED` | Retired | Soft-retired unused/invalid advice; not a deletion |

### 3.3 `FINANCIAL_REMITTANCE_LINE_STATUS`

| Code | Display name | Meaning |
|---|---|---|
| `UNMATCHED` | Unmatched | Payer line is not yet linked to a Claim |
| `MATCHED` | Matched | Payer line has an approved Claim match |
| `EXCEPTION` | Exception | Line needs operator review before settlement/posting |
| `POSTED` | Posted | Line contributed to an immutable finance posting |

### 3.4 `FINANCIAL_SETTLEMENT_STATUS`

| Code | Display name | Meaning |
|---|---|---|
| `DRAFT` | Draft | Settlement has been created but not confirmed |
| `CONFIRMED` | Confirmed | Settlement arithmetic and source information are approved |
| `POSTED` | Posted | Immutable financial postings have been created |
| `CANCELLED` | Cancelled | Open settlement cancelled before posting |
| `RETIRED` | Retired | Soft-retired settlement not used for a payment lifecycle |

### 3.5 `FINANCIAL_DEDUCTION_TYPE`

| Code | Display name | Meaning |
|---|---|---|
| `TDS` | TDS | Tax deducted at source by the payer |
| `CONTRACTUAL` | Contractual Deduction | Contractual tariff/package adjustment |
| `NON_PAYABLE` | Non-Payable | Payer-declared non-payable item |
| `CO_PAYMENT` | Co-payment | Patient co-payment amount recorded separately from payer money |
| `POLICY_EXCLUSION` | Policy Exclusion | Amount excluded by policy coverage |
| `OTHER` | Other Deduction | Reviewed deduction outside the defined classifications |

### 3.6 `FINANCIAL_RESPONSIBILITY_TYPE`

| Code | Display name | Meaning |
|---|---|---|
| `PAYER` | Payer | Amount expected from the Insurance Partner/TPA |
| `PATIENT` | Patient | Amount owed by the patient, not deducted from payer settlement |
| `HOSPITAL_WRITE_OFF` | Hospital Write-off | Amount intentionally written off under approved authority |

### 3.7 `FINANCIAL_RECOVERY_TYPE`

| Code | Display name | Meaning |
|---|---|---|
| `OVERPAYMENT` | Overpayment | Amount paid in excess of the approved amount |
| `DUPLICATE_PAYMENT` | Duplicate Payment | Duplicate settlement/payment received |
| `PAYMENT_REVERSAL` | Payment Reversal | Reversal or clawback requested by a payer/bank |
| `OTHER` | Other Recovery | Reviewed recovery not covered by a standard type |

### 3.8 `FINANCIAL_RECOVERY_STATUS`

| Code | Display name | Meaning |
|---|---|---|
| `OPEN` | Open | Recovery is identified and outstanding |
| `IN_PROGRESS` | In Progress | Recovery collection/adjustment is underway |
| `RECOVERED` | Recovered | Full recovery amount has been obtained or offset |
| `WRITTEN_OFF` | Written Off | Recovery was approved for write-off |
| `CANCELLED` | Cancelled | Recovery was invalidated before completion |

### 3.9 `FINANCIAL_RECONCILIATION_STATUS`

| Code | Display name | Meaning |
|---|---|---|
| `OPEN` | Open | Reconciliation is awaiting review |
| `IN_PROGRESS` | In Progress | Matching/review is underway |
| `RECONCILED` | Reconciled | Reconciliation is complete and approved |
| `EXCEPTION` | Exception | Reconciliation requires investigation |
| `CLOSED` | Closed | Reconciliation is closed without further work |

### 3.10 `FINANCIAL_BANK_MATCH_STATUS`

| Code | Display name | Meaning |
|---|---|---|
| `UNMATCHED` | Unmatched | Bank line has no approved financial allocation |
| `PARTIALLY_MATCHED` | Partially Matched | Only part of the bank amount is allocated |
| `MATCHED` | Matched | Full bank amount is allocated |
| `REVERSED` | Reversed | A previously recorded match has been reversed by a compensating action |
| `EXCEPTION` | Exception | Bank line/match needs review |

### 3.11 `FINANCIAL_POSTING_TYPE`

| Code | Display name | Meaning |
|---|---|---|
| `SETTLEMENT` | Settlement Posting | Posting for confirmed payer settlement |
| `SETTLEMENT_DEDUCTION` | Settlement Deduction Posting | Posting for classified payer deduction or TDS |
| `RECOVERY` | Recovery Posting | Posting for recovered amount or recovery adjustment |
| `WRITE_OFF` | Write-off Posting | Posting for an authorized Hospital write-off |
| `CORRECTION` | Correction Posting | Immutable compensating correction; never edits history |

## 4. Cross-category rules

- `POSTED` remittance and settlement states require successful immutable posting records.
- `RECOVERED` requires `outstanding_amount = 0`; `WRITTEN_OFF` requires approved write-off authority in a later financial command rule.
- A `CO_PAYMENT` deduction must be represented as patient responsibility, not subtracted from the payer settlement equation unless the payer advice expressly reports it as a payer-side deduction.
- `REVERSED` bank-match records retain history; they are not physically deleted.
- `PARTNER_PROCESSING` and `KYP` Claim products remain guarded even where common financial reference values exist.

## 5. Validation and migration intent

The future seed migration will create categories first, then values, and will be idempotent for active global values. It will not alter or delete existing Reference Data values.

Validation after seeding must confirm:

- Exactly 11 active global categories exist for this catalogue.
- Every listed code has one active, non-deleted global value.
- No value is stored as plain lifecycle/type text in a new Phase 9 Financial table.
- The Finance migration functions reject inactive/deleted/non-global reference values.

## 6. Pause for approval

**Requested decision:** `Approve Financial Management Reference-Data Catalogue`

After approval, we will create the PostgreSQL migration scripts in the approved order and validate them before implementation proceeds to the Domain Layer.
