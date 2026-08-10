# ClaimNX Claim Processing Bounded Context and Aggregate Design

| Attribute | Value |
|---|---|
| Module | Claim Processing |
| Phase | Phase 8 - Claim Processing |
| Version | 1.0 |
| Status | Draft - awaiting approval |
| Prerequisite | Claim Processing Domain Analysis approved |
| Date | 2026-08-01 |

## 1. Objective

Define the Claim Processing bounded context, its published collaboration contracts, and the final aggregate ownership model to be used by the logical ERD and later implementation stages.

## 2. Claim Processing Context Boundary

Claim Processing owns the Hospital's operational claim case from controlled creation through its business lifecycle. It owns the truth of:

- which Organization and Hospital own a Claim;
- which Claim product governs the case;
- the selected Hospital-Payer Integration route at the time it is selected;
- Claim readiness and lifecycle transitions;
- Claim-specific payer authorization, query, and submission-intent records;
- immutable Claim business history.

It does not own external delivery, payer master data, user membership, work assignment, patient master data, stored files, or financial settlement.

## 3. Context Map

```text
IAM / Organization
  supplies active actor identity, permissions, and tenant membership
                         |
                         v
Hospital --------> Claim Processing <-------- Insurance Foundation
Hospital identity       |                       payer identity, enablement,
and tenant scope        |                       Hospital-Payer Integration
                         |
                         v
                   Workflow Platform
                   workflow instance / work items

Patient / Clinical (future) ----> Claim Processing <---- Document capability (future)
                                         |
                                         v
                              Financial Management (future)
```

All arrows represent reference/contract dependencies. They do not authorize one context to write another context's records.

## 4. Collaboration Contracts

| Provider context | Claim Processing requires | Validation timing |
|---|---|---|
| IAM / Organization | Active user, permission, active Organization membership | Every read/command at application and API boundary; mutation functions also validate actor scope. |
| Hospital | Active Hospital belonging to Claim Organization | Claim creation and payer-route selection. |
| Insurance Foundation | Active Insurer/TPA Partner, active Organization enablement, active Hospital-Payer Integration belonging to same Hospital/Organization | Payer route selection and readiness/submission transitions. |
| Workflow Platform | Approved workflow definition/instance and permitted work transition | At defined Claim lifecycle coordination points. |
| Patient / Clinical | Stable patient/encounter reference | Deferred until its bounded context is approved. |
| Document capability | Stable immutable document reference and required-document rule result | Deferred until document ownership is approved. |
| Financial Management | Claim identity and finalized business outcome | Phase 9; Claim does not calculate settlement. |

## 5. Final Aggregate Structure

### 5.1 Claim Aggregate

```text
Claim (Aggregate Root)
├── ClaimAuthorization [0..n]
├── ClaimQuery [0..n]
├── ClaimSubmissionIntent [0..n]
└── ClaimStatusHistory [1..n, append-only]
```

The root is the only entry point for creating, changing, retiring, or recording a child entity. A child never moves between Claims.

### 5.2 Claim Root Responsibilities

| Responsibility | Root rule |
|---|---|
| Creation | Establish immutable Organization, Hospital, Product, actor, audit/version, and initial lifecycle. |
| Payer route | Select only an active authorized Hospital-Payer Integration within the same tenant/Hospital. |
| Product isolation | Resolve one Claim Product Strategy and reject actions not allowed for that product. |
| Readiness | Confirm the route and product-required business facts are complete before submission intent. |
| Lifecycle | Validate and execute Claim state changes; append immutable history in the same boundary. |
| Workflow link | Store only the approved Workflow instance reference; never manage task/assignment data. |
| Concurrency | Require expected version for all mutable commands and increment exactly once per successful root mutation. |
| Retirement | Soft-retire only when no active process rule prohibits it; never rewrite history. |

### 5.3 Child Entity Responsibilities

| Entity | Allowed changes | Prohibited behaviour |
|---|---|---|
| ClaimAuthorization | Add approved authorization milestones or permitted corrections through Claim root. | Cannot change Claim payer route, tenant, or product. |
| ClaimQuery | Raise, respond to, and close a payer query through Claim root. | Cannot directly set Claim lifecycle or modify documents. |
| ClaimSubmissionIntent | Create a request and later record a verified outcome through approved services. | Cannot perform external delivery or expose credentials. |
| ClaimStatusHistory | Append once for each root transition. | Never update/delete in normal operations. |

## 6. Product Strategy Contract

The logical interface below is a design contract only. It is not implementation approval.

```text
ClaimProductStrategy
  - supports(product)
  - validateCreation(command)
  - validateReadiness(claim)
  - validateTransition(claim, targetLifecycle, context)
  - requiredSubmissionFacts(claim)
```

| Strategy | Phase 8 responsibility |
|---|---|
| ICA / PrePost strategy | Validates approved shared pre-authorization, enhancement, readiness, and transition rules. The exact rule set is finalized before SQL. |
| Partner Processing strategy | Explicitly denies operational transitions beyond safe approved states until a future Partner Desk design is approved. |
| KYP strategy | Explicitly denies policy/benefit decisions until Policy/Benefit source-of-truth and KYP rules are approved. |

No generic "status update" command may bypass the selected strategy.

## 7. Cross-Aggregate Consistency Rules

1. Claim creation must validate the Hospital's Organization membership but must not lock or update Hospital records.
2. Payer-route selection validates the active Insurance Foundation route. The selected route identity is retained historically even if the route later becomes inactive.
3. Workflow instance creation is coordinated by the application layer. Claim Processing cannot insert Workflow tasks, queues, assignments, or histories.
4. A workflow task action may request a Claim transition; the Claim aggregate still validates the product-specific business transition.
5. A Claim submission intent can request future delivery, but the Integration capability is the only context that can establish verified external-delivery evidence.
6. Patient, document, and financial references are stable external IDs only; Claim Processing cannot cascade deletion into those contexts.

## 8. Consistency and Transaction Boundary

The initial physical design must make these changes atomic inside the Claim Processing database boundary:

- a Claim root mutation and its ClaimStatusHistory entry;
- creation or change of a Claim child entity and the root's required version/audit update;
- validation that all referenced records belong to the tenant, where those references exist in the same database.

Workflow coordination and external delivery are not assumed to be one database transaction. Their eventual consistency contract must be designed in the Workflow/Integration implementation plan.

## 9. Aggregate Commands (Logical)

| Command | Aggregate action | Product strategy involvement |
|---|---|---|
| Create Claim | Creates root in approved initial state. | Validates product creation eligibility. |
| Select Payer Route | Associates an eligible Hospital-Payer Integration. | Required before product readiness where applicable. |
| Update Claim Summary | Changes permitted root facts. | Validates product-specific mutable fields. |
| Record Authorization | Adds/updates a ClaimAuthorization child. | ICA/PrePost rules first. |
| Raise / Respond to Query | Changes ClaimQuery child. | Product rule determines whether lifecycle changes. |
| Request Submission | Adds submission intent after readiness. | Validates submission facts. |
| Record Verified Submission | Records verified delivery outcome. | Strategy validates lifecycle transition. |
| Transition Claim | Executes approved lifecycle transition and history append. | Mandatory. |
| Retire Claim | Soft-retires allowed unused/invalid draft case. | Must reject terminal/historical destruction. |

## 10. Explicit Non-Ownership Decisions

- `claim_line_items` are not approved yet. Billing/coding ownership and amount semantics require a dedicated decision.
- `claim_document` is not approved yet. Documents remain owned by the future Document capability.
- `claim_settlement`, `recovery`, and bank remittance are not Claim children; they belong to Phase 9 Financial Management.
- Insurer/TPA credentials, email mailbox secrets, and portal passwords are never Claim attributes.
- Payer responses from email/RPA/API are not directly ingested by the Claim root; a future Integration/Automation process will submit an approved command.

## 11. Validation

This design preserves DDD aggregate boundaries, separates Workflow and Insurance ownership, and keeps the future product variants structurally isolated. It does not introduce tables, migration scripts, code, APIs, or frontend work.

## 12. Approval Gate

**Next deliverable:** Claim Processing Logical ERD.

**Pause for approval:** Confirm this context map, aggregate structure, product strategy contract, and transaction boundary before logical entities and relationships are designed.
