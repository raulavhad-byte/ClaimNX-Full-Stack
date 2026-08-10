# ClaimNX Claim Processing Domain Analysis

| Attribute | Value |
|---|---|
| Module | Claim Processing |
| Phase | Phase 8 - Claim Processing |
| Version | 1.0 |
| Status | Draft - awaiting approval |
| Prerequisite | Claim Processing Business Understanding approved |
| Date | 2026-08-01 |

## 1. Objective

Translate the approved Claim Processing business understanding into a domain model that protects ownership boundaries, tenant isolation, product isolation, historical traceability, and controlled lifecycle transitions.

## 2. Why

The Claim is the operational record through which clinical, financial, payer-routing, and workflow activities meet. Its design must avoid two unsafe extremes:

- a single unbounded record that lets every product add unrelated fields and transitions; or
- separate product tables that duplicate tenant, audit, payer-routing, and lifecycle rules.

The approved solution is a shared Claim foundation with explicit product strategies and independently owned supporting aggregates.

## 3. Ubiquitous Language

| Term | Domain meaning |
|---|---|
| Claim | Tenant-scoped Hospital business case for an ICA, Pre/Post, Partner Processing, or KYP product pathway. |
| Claim Product | Immutable pathway discriminator: `ICA`, `PRE_POST`, `PARTNER_PROCESSING`, or `KYP`. |
| Claim Lifecycle | Claim Processing's business state; not a Workflow task state. |
| Payer Route | Selected active Hospital-Insurance Partner Integration used for this Claim's operational destination context. |
| Submission Readiness | The Claim's business confirmation that mandatory data is present and the payer route can be selected. |
| Submission Intent | An audited request for future delivery. It is not proof of external delivery. |
| Payer Outcome | A recorded external response or manually confirmed decision, pending detailed payer-response scope. |
| Claim Query | A payer request for clarification, information, or documents against one Claim. |
| Authorization | A pre-authorization/approval amount, reference, or enhancement milestone associated with one Claim. |

## 4. Bounded Context Responsibilities

| Bounded context | Owns | Claim Processing may reference |
|---|---|---|
| Claim Processing | Claim case, Claim lifecycle, product strategy, readiness, claim query, authorization, submission intent, immutable claim history | Other context identifiers only |
| Hospital | Hospital identity, facility details, departments | `hospital_id` |
| Insurance Foundation | Insurer/TPA master, Organization enablement, Hospital-Payer Integration | `hospital_insurance_partner_integration_id`, Partner snapshot/identity as approved later |
| Workflow Platform | Workflow definitions, instances, tasks, queues, assignments, SLA | `workflow_instance_id` |
| IAM / Organization | User identity, permissions, memberships, tenant scope | Organization and actor IDs |
| Patient / Clinical (future) | Patient identity, encounter/admission, clinical details | Stable reference only after that context is defined |
| Document capability (future) | Stored object identity and metadata | Document reference only after ownership is defined |
| Financial Management | Settlement, remittance, recovery, payment | Claim reference only |

Claim Processing must never update Hospital, Insurance Partner, Workflow task, User, Patient, Document, or Financial records directly.

## 5. Aggregate Design

### 5.1 Claim Aggregate Root

**Aggregate root:** `Claim`

The Claim aggregate enforces all changes that alter the business case's product, Hospital/Organization scope, payer route, financial summary, lifecycle, readiness, or workflow linkage.

**Core identity and context:**

- `claim_id` - application-generated UUID;
- `organization_id` - immutable tenant scope;
- `hospital_id` - immutable Hospital scope after creation;
- `claim_product` - immutable product discriminator after creation;
- `claim_number` - future approved business identifier;
- `hospital_insurance_partner_integration_id` - selected operational payer route when required;
- future patient/encounter references, without taking ownership;
- lifecycle status, current stage reference, workflow instance reference, version, audit, and soft-delete attributes.

**Root-owned value concepts:**

- monetary summary (claimed, approved, deductible, co-pay, patient responsibility) when each field has approved meaning;
- submission-readiness state;
- payer destination snapshot policy, to be resolved in Logical ERD;
- transition rationale.

### 5.2 Claim Child Entities

The following entities are proposed as Claim-owned children because they cannot have meaning outside the Claim's lifecycle and tenant scope:

| Child entity | Responsibility | Lifecycle ownership |
|---|---|---|
| Claim Authorization | Initial, enhancement, final authorization reference and approved amount milestones. | Claim root |
| Claim Query | Payer query, requested response information, due date/SLA reference, response state. | Claim root |
| Claim Submission Intent | Intent and verified outcome metadata for a payer submission. Delivery execution remains external. | Claim root |
| Claim Status History | Append-only record of a Claim business transition. | Claim root |

`Claim Line Item` and `Claim Document Reference` are deliberately **not yet approved** as Claim children. Their ownership depends on the later Patient/Clinical, Billing, and Document boundary decisions.

### 5.3 Separate Aggregate Candidates

| Candidate | Decision | Reason |
|---|---|---|
| Work Item | Separate Workflow aggregate | Assignment and queue ownership belong to Workflow Platform. |
| Hospital-Payer Integration | Separate Insurance aggregate | Route configuration is shared configuration, not Claim-owned data. |
| Settlement / Recovery | Separate Financial aggregate | Phase 9 owns financial realization and reconciliation. |
| Product policy / benefit evaluation | Separate future Policy/Benefits aggregate | KYP calculations need dedicated source-of-truth business rules. |

## 6. Product Strategy Boundary

Every Claim must be associated with one `ClaimProductStrategy`. The strategy validates product-specific creation, readiness, and transition rules. The aggregate retains common integrity rules and never delegates tenant or audit checks away.

| Product | Strategy status in Phase 8 | Allowed operational behaviour |
|---|---|---|
| `ICA` | Implemented strategy | Approved cashless/pre-authorization creation, readiness, and lifecycle transitions. |
| `PRE_POST` | Implemented strategy | Approved Pre/Post creation, readiness, and lifecycle transitions. |
| `PARTNER_PROCESSING` | Guarded strategy | Safe draft creation/read only; transitions require a later approved Partner Desk ruleset. |
| `KYP` | Guarded strategy | Safe draft creation/read only; policy/benefit validation and transitions require a later approved KYP ruleset. |

The strategy interface is a domain concept, not an API switch. A controller must not decide a product's transition validity based only on route or screen input.

## 7. Aggregate Invariants

1. A Claim has exactly one immutable Organization, Hospital, and Claim Product.
2. `hospital_id` must belong to `organization_id`; this is enforced in database, application, and API layers.
3. A payer route, when selected, must be active, belong to the same Organization and Hospital, and be authorized through Insurance Foundation.
4. The Claim cannot be made ready for submission without an approved payer route and all product-required business data.
5. Product cannot be changed after Claim creation. Create a new Claim when the business pathway changes.
6. Only the active product strategy can approve a lifecycle transition.
7. A terminal Claim cannot return to an active operational state without an explicit future reopening rule.
8. Every successful mutable action increments the aggregate version; stale commands fail without side effects.
9. Claim history is append-only. It records product, prior state, target state, actor, timestamp, and rationale.
10. Retired Claims are excluded from ordinary operational selection. Historical references remain readable subject to authorization.
11. A future verified delivery result may change `SUBMISSION_REQUESTED` to `SUBMITTED`; a front-end request alone cannot claim submission succeeded.
12. Claim Processing stores no plaintext payer or mailbox credential.

## 8. Lifecycle Ownership and Workflow Coordination

Claim lifecycle and workflow state are coordinated but separate.

```text
Claim transition approved by Claim Product Strategy
        ->
Claim root records business transition and history atomically
        ->
Application layer requests approved Workflow action
        ->
Workflow Platform owns task/queue/assignment history
```

The later implementation plan will define transaction boundaries and failure handling. No distributed transaction or asynchronous integration behaviour is assumed by this document.

## 9. Authorization Model

| Action | Required checks |
|---|---|
| Read Claim | Authenticated active IAM user, active Organization membership, claim tenant scope, permission. |
| Create Claim | Tenant membership, Hospital scope, Claim create permission, product creation eligibility. |
| Update / transition Claim | Tenant membership, Claim mutation permission, expected aggregate version, product strategy guard. |
| Manage query / authorization / submission intent | Claim mutation permission plus product-specific action permission when introduced. |
| View historical Claim | Tenant scope and approved historical-read permission; soft deletion does not imply public visibility. |

Cross-tenant administration, if ever required, must be an explicit audited IAM capability. It is not implied by a frontend filter or direct UUID knowledge.

## 10. Domain Events for Future Integration

The first implementation may persist history synchronously without a general event bus. The following business events are reserved to avoid future redesign:

- `ClaimCreated`
- `ClaimReadinessChanged`
- `ClaimSubmissionRequested`
- `ClaimSubmitted`
- `ClaimPayerResponseRecorded`
- `ClaimQueryRaised`
- `ClaimQueryResponded`
- `ClaimLifecycleTransitioned`
- `ClaimCancelled`

No email, RPA, API call, webhook, OCR, or AI action is triggered by this document.

## 11. Validation

This analysis respects the approved shared-foundation decision and keeps Partner Processing/KYP operational logic isolated. It introduces no physical schema, SQL migration, NestJS implementation, REST API, or frontend artefact.

## 12. Approval Gate

**Next deliverable:** Claim Processing Bounded Context and Aggregate Design.

**Pause for approval:** Confirm aggregate ownership, product strategy boundaries, invariants, and Workflow coordination before a logical ERD is produced.
