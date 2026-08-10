# ClaimNX Phase 9 — Financial Management Bounded Context and Aggregate Design

| Attribute | Value |
|---|---|
| Module | Financial Management |
| Phase | 9 — Financial Management |
| Status | Draft — Awaiting Approval |
| Prerequisite | Financial Management Domain Analysis approved |
| Architecture | DDD, Clean Architecture, Modular Monolith |

---

## 1. Objective

Finalize ownership, aggregate roots, child entities, command boundaries, and cross-context contracts for Financial Management. This design authorizes a later Logical ERD; it does not authorize SQL or implementation.

## 2. Bounded context boundary

Financial Management owns the auditable monetary realization of a Claim after a payer/TPA advice or bank credit is received.

It begins when a non-secret remittance source, payment advice, or bank statement evidence is recorded. It ends when the monetary outcome is reconciled, recovered, written off, or retained as an unresolved variance.

It does not own:

- Claim clinical, operational, or submission lifecycle.
- Hospital/Payer portal routing or credentials.
- Patient billing ledger and collections.
- General-ledger chart of accounts, GST invoicing, or payroll.
- Workflow task state.

## 3. Context map

| Upstream / downstream context | Relationship | Contract |
|---|---|---|
| Claim Processing | Upstream | Read active Claim identity, immutable product, organization/hospital tenant scope, number, and approved/submitted context. Financial Management never mutates Claim lifecycle directly. |
| Insurance Foundation | Upstream | Read active Insurance Partner and Hospital–Payer Integration identity. No payer routing credentials are copied. |
| Hospital | Upstream | Hospital is the required operational/financial tenant scope. |
| Organization & IAM | Upstream | Validate active actor, tenant membership, and permissions. |
| Reference Data | Upstream | Resolve controlled source, status, deduction, recovery, variance, and posting classifications. |
| Workflow Platform | Downstream collaborator | Financial commands may request a Work Item. Work Item completion invokes a Financial command; workflow tables never own financial state. |
| Reporting & BI | Downstream | Receives read-only, sanitized financial views/events later. |

## 4. Aggregate overview

```text
Financial Management bounded context

RemittanceBatch (Aggregate Root)
├── RemittanceLineItem [1..n]
└── RemittanceEvidence [0..n]              -- non-secret source metadata only

ClaimSettlement (Aggregate Root)
├── SettlementDeduction [0..n]
├── RecoveryAction [0..n]
└── FinancialPosting [1..n, append-only]

BankReconciliation (Aggregate Root)
├── BankStatementLine [1]
└── BankMatchAllocation [0..n]
```

An identifier reference between aggregates is allowed. An aggregate must not directly load or mutate another aggregate's internal children in the same command.

## 5. RemittanceBatch aggregate

### Root

`RemittanceBatch`

### Candidate children

- `RemittanceLineItem`
- `RemittanceEvidence`

### Ownership rules

- A Batch belongs to exactly one `organization_id`, `hospital_id`, and Insurance Partner.
- A Line Item cannot exist independently and cannot be reassigned to another Batch.
- Batch currency is fixed when the first Line Item is created and cannot change after ingestion.
- Source evidence captures non-secret identifiers, file reference, source channel, and import metadata; it never stores raw portal credentials, access tokens, or bank credentials.

### Aggregate invariants

- `organization_id` and `hospital_id` are immutable.
- A Batch payment reference/UTR is unique only within a tenant and source context; final uniqueness details wait for the Logical ERD.
- Line Item gross amounts must be non-negative and use the Batch currency.
- A reconciled Batch cannot be normally edited or soft-deleted.
- A Batch cannot be retired if active Bank Match Allocations or posted Settlements require it.

### Commands

- Create Draft Batch
- Add/Update/Retire Draft Line Item
- Mark Batch Ingested
- Mark Batch Reconciliation Pending
- Mark Batch Reconciled
- Reject/Cancel an unposted Batch

## 6. ClaimSettlement aggregate

### Root

`ClaimSettlement`

### Candidate children

- `SettlementDeduction`
- `RecoveryAction`
- `FinancialPosting` (append-only)

### Ownership rules

- A Settlement belongs to exactly one Claim, one Hospital tenant, and one Remittance Line Item.
- A Deduction, Recovery, or Posting cannot exist without its Settlement.
- A Settlement references Claim, Remittance Line Item, Insurance Partner, and optional Hospital–Payer Integration by ID; those records remain owned by their original contexts.
- One active final Settlement is allowed per Line Item. Corrections are represented by linked adjustment Settlements/Postings, not an update to a posted monetary record.

### Aggregate invariants

- Claim, Batch/Line Item, and Settlement must share `organization_id` and `hospital_id`.
- Product is copied/read as immutable Claim product context and selects the Financial Strategy.
- All amounts use one explicit currency; cross-currency settlement is out of scope.
- Every posting is balanced at the posting-set level: total debit equals total credit. Detailed account taxonomy is deferred, but balance integrity is not.
- Posted Settlement totals are immutable. A correction creates a compensating posting with an explicit `reversal_of_financial_posting_id` or adjustment relationship.
- Recovery or write-off is not a silent value change; it is an explicit child state with actor, reason, and financial effect.

### Commands

- Create Draft Settlement from an eligible Line Item/Claim pair
- Add/Update/Remove Draft Deduction
- Review Settlement
- Post Settlement and Financial Posting set
- Open Recovery Action
- Record Recovery outcome
- Request/Approve Write-off
- Create Adjustment/Compensating Posting

### Transaction boundary

Posting a Settlement must atomically:

1. validate tenant, product strategy, Claim/Line Item eligibility, and version;
2. calculate settlement and deduction totals;
3. create immutable Financial Posting rows;
4. mark Settlement `POSTED`; and
5. advance its aggregate version.

No Workflow command or Claim command is executed inside this transaction.

## 7. BankReconciliation aggregate

### Root

`BankReconciliation`

### Candidate children

- `BankStatementLine`
- `BankMatchAllocation`

### Ownership rules

- A Bank Statement Line belongs to exactly one Hospital tenant and source import.
- A Match Allocation belongs to exactly one Statement Line and references one Batch or Financial Posting set.
- One Statement Line may have multiple allocations only when a controlled partial-match state is used.

### Aggregate invariants

- UTR/reference and import source are non-secret evidence, not credentials.
- Allocated amount cannot exceed the available statement-line credit.
- Allocated amount cannot exceed the unresolved target remittance/posting amount.
- A fully matched line is immutable except for a compensating reconciliation adjustment.
- Bank reconciliation does not alter a Claim lifecycle or rewrite a posted settlement.

### Commands

- Import/Create Bank Statement Line
- Propose Match Allocation
- Confirm/Reject Match
- Record Variance
- Resolve Variance through adjustment or recovery path

## 8. Aggregate relationship rules

| From | To | Relationship rule |
|---|---|---|
| RemittanceLineItem | ClaimSettlement | A Line Item may have zero or one active final Settlement; adjustment records are separately linked. |
| ClaimSettlement | Claim | Settlement requires one Claim in the same organization and hospital. |
| ClaimSettlement | RemittanceLineItem | Settlement requires one Line Item in the same organization and hospital. |
| ClaimSettlement | FinancialPosting | A posted Settlement creates one or more immutable postings. |
| RecoveryAction | Workflow Work Item | Optional external ID only; no shared ownership. |
| BankMatchAllocation | RemittanceBatch / Financial Posting | Links evidence and allocation; does not mutate target accounting history. |

## 9. Product strategy boundary

```text
FinancialProductStrategyFactory
├── IcaFinancialStrategy             (active)
├── PrePostFinancialStrategy         (active)
├── PartnerProcessingFinancialStrategy (guarded)
└── KypFinancialStrategy             (guarded)
```

- `ICA` validates cashless payer settlement, patient share, payer deductions, and applicable recovery pathways.
- `PRE_POST` validates reimbursement settlement and patient/payer recovery pathways.
- `PARTNER_PROCESSING` and `KYP` permit structural Draft/read support only. Posting, recovery, and reconciliation operations fail with `UnimplementedFinancialProductStrategy` until their commercial/policy requirements are approved.

## 10. Concurrency, audit, and deletion

- All mutable roots have `version`, begin at `1`, and require `expectedVersion` for commands.
- Every business table carries ClaimNX audit fields: `created_by`, `created_at`, `updated_by`, `updated_at`, `deleted_by`, `deleted_at`, `version`.
- Draft roots may be soft-deleted only when they have no posted descendants or reconciled evidence.
- `FinancialPosting` and final financial history are append-only. Physical delete is prohibited under normal operations.

## 11. API command ownership direction

Future versioned API routes will be scoped as:

```text
/v1/organizations/{organizationId}/hospitals/{hospitalId}/financial/...
```

Each endpoint must pass actor, organization, hospital, aggregate ID, and `expectedVersion` where mutable. The service layer—not the frontend—selects the correct tenant scope and strategy.

## 12. Validation checklist

- [x] Claim lifecycle and financial lifecycle are separate.
- [x] Each child entity has one explicit aggregate owner.
- [x] Monetary corrections are compensating/append-only.
- [x] ICA/PRE_POST and guarded future products remain isolated.
- [x] Tenant, audit, version, and deletion boundaries are explicit.
- [x] Workflow and reference-data ownership boundaries are preserved.
- [x] No ERD, SQL, or implementation has started.

## 13. Next step

After approval, create the **Financial Management Logical ERD** with cardinalities, logical attributes, tenant keys, and foreign-key ownership—still without physical SQL.
