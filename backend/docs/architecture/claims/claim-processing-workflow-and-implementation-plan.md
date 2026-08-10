# ClaimNX Claim Processing Workflow and Implementation Plan

| Attribute | Value |
|---|---|
| Module | Claim Processing |
| Phase | Phase 8 - Claim Processing |
| Version | 1.0 |
| Status | Draft - awaiting approval |
| Prerequisite | Claim Processing Architecture Review approved |
| Date | 2026-08-01 |

## 1. Objective

Define the first approved operational workflow and build sequence for the shared Claim foundation. This plan enables ICA and Pre/Post operational logic while retaining guarded foundations for Partner Processing and KYP.

## 2. Product Activation Plan

| Product | Shared foundation | Creation | Operational transitions | Product calculation rules |
|---|---:|---:|---:|---:|
| ICA | Yes | Yes | Yes | Initial pre-authorization/readiness rules only. Limits, room-rent, and enhancement details require an approved sub-rule set. |
| PRE_POST | Yes | Yes | Yes | Initial readiness rules only. Policy-window rules require an approved Policy/Benefit source. |
| PARTNER_PROCESSING | Yes | Draft only | No | Deferred. |
| KYP | Yes | Draft only | No | Deferred. |

`PARTNER_PROCESSING` and `KYP` may be created only if a future business need requires their identity before their operational rules are approved. Their strategies reject readiness, submission, payer-outcome, and closure transitions.

## 3. Initial ICA and Pre/Post Claim Lifecycle

```text
                    +--------------------+
                    |       DRAFT        |
                    +--------------------+
                       | update / route
                       v
              +------------------------+
              |    READY_FOR_REVIEW    |
              +------------------------+
                       | review passes
                       v
              +------------------------+
              | READY_FOR_SUBMISSION   |
              +------------------------+
                       | request submission
                       v
              +------------------------+
              | SUBMISSION_REQUESTED   |
              +------------------------+
                       | verified outcome
                       v
              +------------------------+
              |       SUBMITTED        |
              +------------------------+
                 | query          | payer outcome
                 v                v
           QUERY_RAISED   PAYER_RESPONSE_RECEIVED
                 |                |
                 +----> SUBMITTED +----> APPROVED | REJECTED
                                                 |
                                                 v
                                              CLOSED

Any non-terminal allowed state ----> CANCELLED
```

### Lifecycle semantics

| Lifecycle status | Meaning | Allowed owner/action |
|---|---|---|
| `DRAFT` | Case exists but is incomplete. | Authorized Claim operator updates allowed draft facts. |
| `READY_FOR_REVIEW` | Operator declares information ready for business review. | ICA/PrePost strategy validates minimum completeness. |
| `READY_FOR_SUBMISSION` | Review is complete and payer route is eligible. | Authorized reviewer/action. |
| `SUBMISSION_REQUESTED` | Claim has requested future channel delivery. | Claim records submission intent; not delivery proof. |
| `SUBMITTED` | Delivery is manually or integration-verified. | Approved Claim command only. |
| `QUERY_RAISED` | Payer asks for information/documents. | Claim Query root command and history append. |
| `PAYER_RESPONSE_RECEIVED` | External result is available but may await authorized interpretation. | Manual/integration-approved command. |
| `APPROVED` | Payer approval has been recorded. | Authorization/outcome command with reference/rationale. |
| `REJECTED` | Payer rejection has been recorded. | Outcome command with reference/rationale. |
| `CANCELLED` | Case was stopped before final closure. | Authorized cancellation with rationale. |
| `CLOSED` | Operational Claim case is concluded. | Authorized closure after terminal outcome. |

`SETTLED`, `RECOVERED`, and `RECONCILED` are not Claim Processing lifecycle values. They belong to Phase 9 Financial Management.

## 4. Transition Guard Matrix

| From | To | Required guard | Required evidence |
|---|---|---|---|
| DRAFT | READY_FOR_REVIEW | Active tenant/Hospital, product-required draft fields, valid payer route if route selected. | Expected version. |
| READY_FOR_REVIEW | READY_FOR_SUBMISSION | Active same-tenant Hospital-Payer Integration and approved reviewer permission. | Expected version; review rationale where required. |
| READY_FOR_SUBMISSION | SUBMISSION_REQUESTED | Product readiness complete and one active payer route. | Submission intent with route/channel snapshot. |
| SUBMISSION_REQUESTED | SUBMITTED | Manual verified submission permission or future trusted Integration result. | Non-secret external reference/outcome. |
| SUBMITTED | QUERY_RAISED | Active payer query command. | Query details and raised timestamp. |
| QUERY_RAISED | SUBMITTED | Query response meets required evidence rule. | Response details/reference. |
| SUBMITTED / PAYER_RESPONSE_RECEIVED | APPROVED | Authorized payer-outcome recording. | Approval reference/rationale; amount if applicable. |
| SUBMITTED / PAYER_RESPONSE_RECEIVED | REJECTED | Authorized payer-outcome recording. | Rejection reference/rationale. |
| APPROVED / REJECTED | CLOSED | Terminal outcome exists. | Closure rationale if required. |
| Any non-terminal state | CANCELLED | Cancel permission and rationale. | Cancellation rationale. |

No command can mutate lifecycle state without an expected aggregate version and a corresponding append-only Claim Status History entry.

## 5. Workflow Platform Coordination

Phase 8 must use the completed Workflow Platform, but Claim Processing remains the lifecycle owner.

| Claim action | Workflow expectation | Consistency rule |
|---|---|---|
| Create ICA/PrePost Claim | Resolve an approved Claim workflow definition and create one Workflow Instance. | If workflow creation fails, Claim creation must not be reported as successful. Exact transaction/outbox implementation is decided in physical/application design. |
| Ready for Review | Create/advance approved review work. | Workflow task success alone does not change Claim state. |
| Ready for Submission | Create/advance submission work. | Claim strategy validates before workflow request. |
| Query Raised | Create/advance query-response work and applicable SLA. | Claim Query ownership stays in Claim Processing. |
| Approved/Rejected/Cancelled/Closed | Complete/cancel relevant work where allowed. | Claim history and Workflow history remain separate. |

The first implementation must select Workflow Definition through an approved mapping keyed by Claim Product and lifecycle action. Hard-coded workflow UUIDs are prohibited.

## 6. Payer Route and Submission Workflow

```text
Claim selects active Hospital-Payer Integration
        ->
Claim validates same Organization + Hospital + active Organization enablement
        ->
Claim becomes READY_FOR_SUBMISSION
        ->
Request Submission records Claim Submission Intent
        ->
Future Integration/Automation receives the intent
        ->
Trusted delivery result records verified SUBMITTED outcome
```

Phase 8 does not send an email, run an RPA process, call a payer API, read a mailbox, or interpret a payer reply.

## 7. Claim Data Rules for Initial Operational Scope

### Required to create a Draft

- Organization scope and Hospital scope;
- Claim Product;
- Claim Type controlled value;
- Creator/actor and initial audit/version values.

### Required before Ready for Submission

- Active Hospital-Payer Integration matching the Claim tenant/Hospital;
- product-required Claim facts defined by ICA/PrePost strategy;
- valid financial total where the product requires it;
- an approved Workflow Instance;
- all later-approved document/patient prerequisites. Until their contexts are approved, the first Phase 8 implementation must not falsely mark a Claim ready based on missing external evidence.

### Financial semantics

- All Claim monetary values use one explicit currency associated with the Claim; default currency is prohibited.
- Amounts are non-negative.
- Approved, deductible, co-pay, and patient responsibility amounts may remain absent until a payer/policy outcome exists.
- No benefit calculation is implemented in Phase 8. KYP calculation is deferred.

## 8. Initial Reference Data Requirements

Physical design may proceed only after Reference Data categories/values are designed and reviewed for:

- `CLAIM_PRODUCT`: ICA, PRE_POST, PARTNER_PROCESSING, KYP;
- `CLAIM_TYPE`: initial ICA/PrePost-approved values;
- `CLAIM_LIFECYCLE_STATUS`: lifecycle values defined in Section 3;
- `CLAIM_AUTHORIZATION_TYPE` and `CLAIM_AUTHORIZATION_STATUS`;
- `CLAIM_QUERY_TYPE` and `CLAIM_QUERY_STATUS`;
- `CLAIM_SUBMISSION_STATUS`;
- optional `CURRENCY` source/ownership decision.

Reference Data naming/seed scripts are not approved in this document.

## 9. Claim Number Strategy

The Claim root reserves an immutable business-facing Claim Number. The initial production strategy must be approved during Physical Database Design and must provide:

- uniqueness within the agreed Organization scope;
- concurrency-safe allocation;
- no dependence on frontend-generated numbers;
- no reuse after soft deletion;
- a neutral format that does not embed protected patient information.

Until then, a Claim cannot expose a provisional ad-hoc number as a production business identifier.

## 10. Implementation Sequence

The implementation sequence remains mandatory:

1. Approve this Workflow and Implementation Plan.
2. Produce Physical Database Design: tables, ownership references, audits, versioning, constraints, indexes, check rules, and migration order.
3. Perform SQL Architecture Review.
4. Produce and review PostgreSQL migrations and Reference Data migration plan.
5. Implement Domain Layer: Claim root, child entities, product strategies, lifecycle/value objects.
6. Implement Repository Layer: raw SQL function/repository boundary and persistence mappers.
7. Implement Application Layer: access orchestration, UUID generation, workflow/route coordination, conflict/error mapping.
8. Implement versioned REST API Layer: DTOs, permissions, named command endpoints, response mapping.
9. Implement unit, integration, tenant-isolation, stale-version, lifecycle, and secret-safety tests.
10. Only then begin React frontend work for approved endpoints.

## 11. Deferred Work

- Partner Processing operational workflow and TPA/payer desk policy.
- KYP eligibility, waiting period, deductible, co-pay, and sub-limit rules.
- Patient/encounter aggregate and data contract.
- Document storage/reference and required-document rules.
- Claim line items, diagnoses, procedures, billing/coding.
- External dispatch and inbound response automation.
- Settlement, recovery, appeals, remittance, and reconciliation.

## 12. Validation

This workflow plan preserves product isolation, distinguishes submission intent from verified delivery, prevents financial lifecycle leakage into Phase 8, and retains Claim/Workflow ownership separation. It introduces no physical database, SQL, NestJS code, REST API, or frontend implementation.

## 13. Approval Gate

**Next deliverable:** Claim Processing Physical Database Design.

**Pause for approval:** Confirm the lifecycle, transition guards, Workflow coordination, Reference Data needs, and phased product activation plan before physical database design starts.
