# ClaimNX Claim Processing Business Understanding

| Attribute | Value |
|---|---|
| Module | Claim Processing |
| Phase | Phase 8 - Claim Processing |
| Version | 1.0 |
| Status | Draft - awaiting approval |
| Date | 2026-08-01 |

## 1. Objective

Define the business scope, ownership boundaries, actors, and first end-to-end lifecycle for ClaimNX claim processing before any domain model, ERD, SQL migration, API, or user interface is designed.

## 2. Why

ClaimNX is an RCM platform that helps a Hospital submit and manage pre-authorization and claim work with an Insurer or TPA. A claim is not only a form or a document upload. It is a tenant-scoped business case with clinical, financial, document, payer-routing, workflow, and audit consequences.

This document establishes the minimum shared language necessary to avoid treating claim processing as a simple CRUD module.

## 3. Business Outcome

For each Hospital, authorized users must be able to create and maintain a traceable claim case, select an approved payer-routing destination, prepare its submission package, and progress it through controlled operational states.

The platform must preserve who did what, when it happened, which payer route was selected at that time, and why a material state change occurred.

## 4. Phase 8 Scope

### In scope

- A Hospital-owned, Organization-tenant-scoped Claim aggregate.
- One shared Claim foundation with a controlled product discriminator for `ICA`, `PRE_POST`, `PARTNER_PROCESSING`, and `KYP`.
- Full initial operational workflow rules only for `ICA` and `PRE_POST`.
- Framework-only product isolation for `PARTNER_PROCESSING` and `KYP`; their future specialized transitions and calculations are not enabled merely because the shared foundation supports their identity.
- Claim registration for pre-authorization and reimbursement/cashless claim scenarios.
- Claim business identity, source references, patient reference, admission/treatment context, and monetary summary captured at the level approved by later domain analysis.
- Selection of one eligible Hospital-Payer Integration as the operational payer destination.
- Controlled claim lifecycle and Claim Workflow Instance linkage.
- Claim submission intent and outcome recording; actual email/RPA/API delivery remains out of scope.
- Claim-level document requirements and document references; document binary storage and OCR remain separate capabilities.
- Audit, soft deletion where appropriate, authorization, tenant isolation, and optimistic concurrency.
- REST APIs and backend tests after the complete approved design sequence.

### Explicitly out of scope

- Direct email delivery, RPA login, portal scraping, API connector execution, retries, and monitoring.
- OCR, AI extraction, AI adjudication, fraud scoring, and automated medical coding.
- Insurer/TPA response parsing or automated updates from mailbox/portal messages.
- Final financial settlement, remittance reconciliation, invoicing, and payment posting.
- Benefits verification, policy eligibility, package-rate calculation, and clinical coding engines.
- React portal implementation. This follows after backend completion and API verification.

## 5. Primary Actors

| Actor | Business responsibility |
|---|---|
| Hospital claim operator | Creates, completes, and submits claim work for an authorized Hospital. |
| Hospital claim supervisor | Reviews exceptions, reassigns work, and approves controlled operational actions. |
| Organization administrator | Maintains tenant memberships and authorizes use of payer partners. |
| Insurance Partner / TPA | External counterparty that receives a submission and later issues a response. |
| ClaimNX Workflow Platform | Owns tasks, assignments, queues, and workflow state transitions. |
| Future Integration capability | Delivers packages and ingests replies; it does not own Claim business rules. |

## 6. Core Business Language

| Term | Meaning |
|---|---|
| Claim | The Hospital's business case for a pre-authorization or healthcare reimbursement/cashless process. |
| Claim type | Controlled classification such as PREAUTHORIZATION, CASHLESS, or REIMBURSEMENT; final values require Reference Data approval. |
| Claim product | The product pathway: `ICA`, `PRE_POST`, `PARTNER_PROCESSING`, or `KYP`. `ICA` is the Cashless and Pre-Authorization operational pathway. Product scopes business transition rules and prevents product logic from bleeding into another pathway. |
| Payer route | The selected active Hospital-Insurance Partner Integration used as the destination context. |
| Submission package | The business set of required claim data and documents prepared for a payer route. |
| Submission attempt | A future integration-owned delivery record. Phase 8 may record the business intent but does not execute delivery. |
| Claim lifecycle | The controlled business state of the Claim, separate from workflow task status. |
| External reference | The insurer/TPA claim or authorization reference received after submission. |

## 7. Ownership Boundaries

| Concern | Owning bounded context |
|---|---|
| Hospital identity, departments, contacts | Hospital |
| User, role, permission | IAM |
| Organization membership and tenant scope | Organization / IAM |
| Insurer/TPA master identity and Hospital-Payer route | Insurance Foundation |
| Claim business case, payer selection snapshot, submission readiness | Claim Processing |
| Work queues, tasks, assignments, workflow histories | Workflow Platform |
| File storage and document metadata | Document capability (future refinement) |
| Sending, RPA, connector execution, reply ingestion | Integration / Automation (future) |
| Settlement, payment, recovery | Financial Management |

The Claim aggregate references these records but does not own or modify them.

## 8. Initial Claim Lifecycle (Subject to Domain Analysis)

```text
DRAFT
  -> READY_FOR_REVIEW
  -> READY_FOR_SUBMISSION
  -> SUBMISSION_REQUESTED
  -> SUBMITTED
  -> PAYER_RESPONSE_RECEIVED
  -> APPROVED | QUERY_RAISED | REJECTED | CANCELLED | CLOSED
```

Important distinctions:

- `SUBMISSION_REQUESTED` means the Claim business case is ready for a future delivery capability; it does not prove external delivery.
- `SUBMITTED` requires a future verified delivery outcome or an approved manual recording process.
- `PAYER_RESPONSE_RECEIVED` records that a response was received; interpretation and automated action are future scope.
- A Claim's lifecycle is independent from Workflow task state, although a workflow can govern which lifecycle actions are allowed.

## 8.1 Approved Product Strategy

ClaimNX will create a **single shared Claim foundation** immediately. All four products use the same aggregate identity, Organization/Hospital scope, payer-route selection, monetary summary, lifecycle/audit controls, and product discriminator.

| Product | Phase 8 foundation | Phase 8 operational logic |
|---|---|---|
| `ICA` - Inpatient Cashless Authorization | Included | Included: approved ICA and shared pre-authorization transitions/guards. |
| `PRE_POST` - Pre/Post Hospitalization | Included | Included: approved shared Pre/Post transitions/guards. |
| `PARTNER_PROCESSING` | Included | Deferred: only safe creation/read framework is allowed until its payer/TPA desk rules are separately approved. |
| `KYP` - Know Your Policy | Included | Deferred: coverage, deductible, co-pay, sub-limit, and waiting-period logic require separate Policy/Benefit business rules. |

The future domain/application design must use a product-specific transition strategy. ICA and Pre/Post may intentionally share approved rules. Partner Processing and KYP must use isolated handlers and may not reuse ICA/Pre/Post operational logic by default.

## 9. Mandatory Business Rules

1. Every Claim belongs to exactly one Organization and one Hospital. Tenant scope is enforced by database, service, and API layers.
2. Only an active Organization member with an approved permission may read or mutate a Claim in that Organization.
3. A Claim must select an active Hospital-Payer Integration before it can become ready for submission.
4. The selected payer route must belong to the same Organization and Hospital as the Claim and must remain historically traceable even if later retired.
5. An inactive, retired, or unauthorized payer route cannot be selected for new submission work.
6. Claim lifecycle transitions must be explicit, audited, and validated against the current state.
7. A workflow task assignment does not change Claim ownership or tenant scope.
8. Claim updates use optimistic concurrency; stale updates must return a conflict and must not overwrite newer data.
9. Normal operational deletion is soft deletion only. Historical clinical, payer, and financial references must not be erased.
10. Passwords, access tokens, mailbox secrets, and payer portal credentials are never a Claim attribute, request field, log value, or frontend value.
11. Claim identifiers must be UUIDs generated in the application layer; business-facing claim numbers require a later approved numbering rule.
12. Every read, command, transition, history item, and Workflow invocation must carry the Claim product context. Product is never inferred from a screen, route, or frontend filter.
13. `PARTNER_PROCESSING` and `KYP` claims must not progress beyond only later-approved safe states until their dedicated product handlers and business rules are approved and tested.

## 10. First End-to-End Business Flow

```text
Hospital user creates Claim in DRAFT
        ->
Selects active Hospital-Payer Integration
        ->
Adds approved patient/treatment, financial, and document references
        ->
Claim is reviewed and becomes READY_FOR_SUBMISSION
        ->
Workflow creates or advances authorized work
        ->
Future Integration capability receives a submission request
        ->
Verified delivery records Claim as SUBMITTED
        ->
Future response ingestion records response availability
        ->
Authorized user interprets outcome through later approved rules
```

## 11. Dependencies and Assumptions

- Hospital, Organization Member Management, Workflow Platform, Insurance Foundation, and Hospital-Payer Integration are completed prerequisites.
- The current Hospital-Payer Integration records only routing configuration and a non-secret credential reference. They do not send data.
- Patient and document data models require an explicit Phase 8 boundary decision before Claims can reference them.
- The exact regulatory requirements, payer-specific pre-authorization forms, and claim numbering policy need business confirmation during domain analysis.

## 12. Deferred Decisions Requiring Domain Analysis

- Whether a Claim may represent multiple patients, encounters, or bills.
- The approved storage representation for Claim product: a PostgreSQL constrained value versus Reference Data. The logical set is `ICA`, `PRE_POST`, `PARTNER_PROCESSING`, and `KYP`; this document does not yet approve physical SQL.
- Canonical Claim types and lifecycle statuses in Reference Data.
- What makes a submission package complete for each claim type and payer.
- Whether route information is fully snapshotted on a Claim or referenced with immutable historical attributes.
- Patient and clinical encounter aggregate ownership and identifiers.
- Document metadata ownership, required-document rules, and attachment immutability.
- Manual versus automated authorization for `SUBMITTED`, payer response, approval, rejection, and closure transitions.

## 13. Validation

This is a business-only deliverable. No schema, migration, code, REST API, or frontend implementation is authorized by this document.

## 14. Approval Gate

**Next deliverable:** Claim Processing Domain Analysis, including the shared Claim root and the product-isolated workflow strategy.

**Pause for approval:** Review the actors, scope, lifecycle, ownership boundaries, and mandatory rules above. On approval, proceed only to Domain Analysis.
