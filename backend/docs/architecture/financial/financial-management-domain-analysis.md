# ClaimNX Phase 9 — Financial Management Domain Analysis

| Attribute | Value |
|---|---|
| Module | Financial Management |
| Phase | 9 — Financial Management |
| Status | Draft — Awaiting Approval |
| Prerequisite | Phase 8 Claim Processing complete |
| Architecture | DDD, Clean Architecture, Modular Monolith |
| Database | PostgreSQL / Supabase; raw SQL is the source of truth |

---

## 1. Objective

Define the Financial Management bounded context in business terms before designing tables or code. This context records how a payer payment advice becomes an auditable financial outcome for an eligible Claim.

It owns remittance ingestion, settlement, deductions, recovery decisions, bank reconciliation, and immutable financial postings. It does **not** own Claim operational lifecycle, payer credentials, medical billing, or external bank credentials.

## 2. Why this context exists

Claim Processing answers: *what happened operationally to a Claim?*

Financial Management answers: *what amount was advised, settled, received, adjusted, recovered, or written off—and what evidence supports that outcome?*

Keeping these responsibilities separate prevents an operational Claim status from being incorrectly treated as proof of payment.

## 3. Ubiquitous language

| Term | Domain meaning |
|---|---|
| Remittance Batch | Payer/TPA payment advice header, such as ERA/835, CSV, manual advice, or portal-derived advice. |
| Remittance Line Item | One claimed payment decision in a Remittance Batch, normally matching one Claim. |
| Settlement | Financial interpretation of a Remittance Line Item for a Claim. It records payer-approved, paid, and outstanding amounts. |
| Deduction | A classified amount deducted from a settlement, such as TDS, co-pay, tariff capping, non-payable item, or payer adjustment. |
| Recovery | A controlled action for an unresolved short payment or disallowance: appeal, patient recovery, or write-off. |
| Bank Statement Line | A non-secret representation of an incoming bank credit, identified by a bank reference or UTR. |
| Bank Match | A reconciliation decision linking a Bank Statement Line to a Remittance Batch or financial posting. |
| Financial Posting | An immutable debit/credit accounting event. Corrections are compensating postings, never overwritten settled amounts. |
| Payer Amount | Amount payable or paid by an Insurer/TPA. |
| Patient Responsibility | Co-pay, deductible, or non-covered amount to be collected from the patient; it is not payer revenue. |
| Hospital Write-off | An approved hospital decision to absorb an unrecoverable balance, with a reason and actor. |

## 4. Context ownership and boundaries

### Financial Management owns

- Remittance Batch and Remittance Line Item lifecycle.
- Claim Settlement and Settlement Deduction calculation.
- Recovery and Write-off decisions.
- Bank Statement Line and Bank Match lifecycle.
- Immutable Financial Postings and reconciliation evidence.

### Financial Management references, but never owns

| External owner | Referenced data |
|---|---|
| Claim Processing | Claim, immutable Claim product, Claim number, organization, hospital. |
| Insurance Foundation | Platform Insurance Partner and Hospital–Payer Integration. |
| Hospital context | Hospital tenant boundary. |
| IAM / Organization | Actor identity, membership, permissions, organization boundary. |
| Reference Data | All controlled statuses, deduction types, recovery types, channels, and source types. |
| Workflow Platform | Work Items raised for recovery/reconciliation; workflow never changes a financial decision directly. |

### Explicit non-goals for Phase 9 foundation

- Storing bank account numbers, payment gateway credentials, portal passwords, OAuth tokens, or ERA raw credentials.
- Billing line-item calculation, tariff adjudication engine, GST invoicing, or a full general ledger chart of accounts.
- Changing Claim business lifecycle status directly from a financial command.
- Automatically posting accounting entries without an approved financial command and audit actor.

## 5. Aggregate candidates and responsibilities

### 5.1 Remittance Batch aggregate root

Owns one payer payment advice in one Hospital tenant.

Children:

- Remittance Line Items
- Batch-level reconciliation evidence

Responsibilities:

- Validate one Organization, Hospital, payer, currency, payment reference, and source.
- Protect the declared batch totals and lifecycle with optimistic concurrency.
- Ensure its active line items and settlement totals can be reconciled to the batch.
- Prevent retirement when active settlements or bank matches require the batch.

### 5.2 Claim Settlement aggregate root

Owns the final financial decision for one Claim Remittance Line Item. It is independent enough to support corrections and recovery without mutating the Remittance Batch header.

Children:

- Settlement Deductions
- Recovery Actions
- Financial Postings

Responsibilities:

- Require the same Organization and Hospital as its Claim and Remittance Batch.
- Preserve Claim product isolation.
- Compute and validate financial totals.
- Once posted, never overwrite monetary history; create an offset/adjustment instead.

### 5.3 Bank Reconciliation aggregate root

Owns one Bank Statement Line and its matching decision.

Responsibilities:

- Match an incoming amount to a Remittance Batch or a group of approved financial postings.
- Record unmatched/partial/fully matched state.
- Preserve the original bank reference and imported evidence metadata without storing bank credentials.

## 6. Financial invariants

1. Every Financial record has immutable `organization_id` and `hospital_id`; all reads and commands enforce both.
2. A Remittance Batch, Claim, Settlement, and Bank Statement Line must belong to the same Hospital tenant before they can be related.
3. A Claim Settlement may reference only one active Remittance Line Item. A correction uses a distinct adjustment Settlement/Postings, not a mutable overwrite.
4. Amounts are non-negative `NUMERIC(15,2)` values. Currency is mandatory and immutable after posting.
5. The standard settlement equation is:

   ```text
   net payer settlement = gross payer paid − TDS − payer deductions − other payer adjustments
   ```

   `patient responsibility` and `hospital write-off` are separately classified outcomes; they cannot silently reduce payer settlement.
6. A Settlement's deductions cannot exceed its governing amount without an explicit `overpayment/adjustment` business rule approved later.
7. Financial Posting rows are append-only. Reversal/correction is a compensating posting linked to the original posting.
8. A bank match cannot exceed the available amount on either side unless a controlled partial-match/variance state is explicitly used.
9. All mutable aggregate commands require `expectedVersion`; stale commands return a concurrency conflict.
10. Soft delete is permitted only for unposted Draft records. Posted settlement, reconciliation, and ledger history is retained.

## 7. Product isolation strategy

`claim_product` remains immutable on the referenced Claim. Financial Management selects a strategy using that product; it never infers the product from a status or source.

| Product | Phase 9 behavior |
|---|---|
| ICA | Active: cashless/pre-authorization settlement, payer deduction, patient responsibility, and recovery validation. |
| PRE_POST | Active: reimbursement settlement and patient/payer recovery validation. |
| PARTNER_PROCESSING | Foundation only: records may be drafted/read; operational settlement posting is guarded until commercial fee and revenue-share rules are approved. |
| KYP | Foundation only: records may be drafted/read; predictive policy-yield and settlement comparison rules are guarded until policy-benefit rules are approved. |

Guarded products must fail safely with an explicit domain error, never fall through to ICA/PRE_POST behavior.

## 8. Lifecycle direction

Initial lifecycle proposals are deliberately controlled by Reference Data:

| Aggregate | Initial lifecycle |
|---|---|
| Remittance Batch | `DRAFT → INGESTED → RECONCILIATION_PENDING → RECONCILED` or `REJECTED/CANCELLED` |
| Remittance Line Item | `UNMATCHED → MATCHED → SETTLED` or `EXCEPTION` |
| Claim Settlement | `DRAFT → REVIEWED → POSTED` or `VOIDED` before posting |
| Recovery | `OPEN → IN_APPEAL / PATIENT_RECOVERY / WRITE_OFF_PENDING → RESOLVED / WRITTEN_OFF` |
| Bank Match | `UNMATCHED → PARTIALLY_MATCHED → MATCHED` or `VARIANCE_REVIEW` |

`POSTED`, `RECONCILED`, and historical ledger actions are not normal delete targets.

## 9. Integration events and decoupling

- A verified payer remittance may create or update a Financial Management settlement workflow, but it does not automatically mark a Claim `APPROVED`, `CLOSED`, or `PAID`.
- Claim Processing may expose approved/submitted Claims for matching, but Financial Management is final authority for financial settlement state.
- Recovery commands may request Workflow Work Items. A Workflow completion must call a Financial Management command; it cannot update a settlement table itself.
- Later email/RPA ingestion records sanitized evidence and external references only. Secrets remain in the external secret manager.

## 10. Domain errors to standardize

- `FinancialTenantScopeViolation`
- `RemittanceBatchTotalMismatch`
- `SettlementAmountInvalid`
- `SettlementAlreadyPosted`
- `FinancialPostingImmutable`
- `BankMatchAmountExceeded`
- `FinancialVersionConflict`
- `UnimplementedFinancialProductStrategy`

## 11. Domain Analysis validation checklist

- [x] Claim lifecycle ownership remains in Phase 8 Claim Processing.
- [x] Financial aggregates and ownership boundaries are explicit.
- [x] ICA and PRE_POST are active; future products are isolated.
- [x] Financial postings are immutable and correction is compensating.
- [x] Tenant, currency, audit, and optimistic-concurrency requirements are defined.
- [x] No financial or payer credentials are stored in business tables.
- [x] No SQL schema or implementation is proposed before aggregate/ERD approval.

## 12. Next step

After approval, define the **Financial Management Bounded Context and Aggregate Design**. That document will finalize aggregate cardinalities, command ownership, and transaction boundaries before the Logical ERD.
