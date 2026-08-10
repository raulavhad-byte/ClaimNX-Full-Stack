# ClaimNX Claim Processing Logical ERD

| Attribute | Value |
|---|---|
| Module | Claim Processing |
| Phase | Phase 8 - Claim Processing |
| Version | 1.0 |
| Status | Draft - awaiting approval |
| Prerequisite | Claim Processing Bounded Context and Aggregate Design approved |
| Date | 2026-08-01 |

## 1. Objective

Define the logical Claim Processing information model and cardinalities that implement the approved Claim aggregate without deciding PostgreSQL table shapes, column types, constraints, indexes, migration order, or APIs.

## 2. Logical Entity Overview

```text
Organization 1 ----- * Hospital 1 ----- * Claim
                                      |
                                      | 1
                                      *
                     Hospital-Payer Integration (external Insurance Foundation reference)

Claim 1 ----- * Claim Authorization
Claim 1 ----- * Claim Query
Claim 1 ----- * Claim Submission Intent
Claim 1 ----- * Claim Status History (append-only)
Claim 0..1 -- 1 Workflow Instance (external Workflow Platform reference)
```

`Organization`, `Hospital`, `Hospital-Payer Integration`, `Workflow Instance`, `User`, Patient/Clinical data, and Document data are external references. They are not Claim Processing entities.

## 3. Logical Entity: Claim

**Role:** Aggregate Root and tenant-scoped operational claim case.

| Logical attribute | Meaning | Required at creation | Mutability |
|---|---|---:|---|
| Claim ID | Application-generated unique identity. | Yes | Immutable |
| Organization ID | Tenant owner. | Yes | Immutable |
| Hospital ID | Hospital owner within Organization. | Yes | Immutable |
| Claim Product | `ICA`, `PRE_POST`, `PARTNER_PROCESSING`, or `KYP`. | Yes | Immutable |
| Claim Number | Future approved business-facing number. | No | Immutable once assigned |
| Claim Type | Controlled case classification such as pre-authorization/cashless/reimbursement. | Yes | Controlled change only in Draft if later approved |
| Lifecycle Status | Claim business lifecycle state. | Yes | Controlled transition only |
| Current Stage | Product-scoped operational stage label/reference. | No | Controlled transition only |
| Hospital-Payer Integration ID | Selected active operational payer destination. | No at Draft | Controlled route selection |
| Payer Partner ID snapshot | Historical master payer identity captured when route is selected. | No | Immutable snapshot once selected |
| Patient Reference | Stable external patient identity; owning context pending. | No | Controlled external reference |
| Encounter / Admission Reference | Stable external clinical reference; owning context pending. | No | Controlled external reference |
| Total Claimed Amount | Approved monetary summary meaning. | No | Controlled update |
| Approved Amount | Payer/authorization outcome amount. | No | Controlled update |
| Deductible Amount | Policy/benefit result, initially informational only. | No | Controlled update only when approved rules exist |
| Co-pay Amount | Policy/benefit result, initially informational only. | No | Controlled update only when approved rules exist |
| Patient Responsibility Amount | Amount borne by patient where applicable. | No | Controlled update |
| Workflow Instance ID | External Workflow Platform reference. | No | Set through approved coordination |
| Version | Optimistic concurrency version. | Yes, starts at 1 | System controlled |
| Created / Updated / Deleted audit | Actor and timestamps. | Yes for creation/update | System controlled |

### Claim identity and historical rule

`Hospital-Payer Integration ID` is the operational route reference. The logical model also reserves a payer partner identity snapshot so historical claims remain intelligible if the route is later retired, changed, or its master display data evolves. The exact physical snapshot representation is deferred to Physical Database Design.

## 4. Logical Entity: Claim Authorization

**Role:** A payer authorization/pre-authorization milestone owned by one Claim.

| Logical attribute | Meaning |
|---|---|
| Claim Authorization ID | Application-generated child identity. |
| Claim ID | Required parent Claim reference. |
| Authorization Type | Initial, enhancement, final, or later approved controlled value. |
| Authorization Reference | External payer authorization/letter reference when received. |
| Requested Amount | Amount requested for this milestone. |
| Approved Amount | Amount approved for this milestone. |
| Valid From / To | Optional payer validity period. |
| Decision Status | Requested, approved, partially approved, rejected, expired, or controlled future value. |
| Decision Rationale | Optional decision notes/reference. |
| Standard audit/version/soft-delete | Child lifecycle control. |

**Cardinality:** One Claim has zero or many Claim Authorizations. A Claim Authorization belongs to exactly one Claim and cannot be reassigned.

## 5. Logical Entity: Claim Query

**Role:** A payer-raised information/document clarification request owned by one Claim.

| Logical attribute | Meaning |
|---|---|
| Claim Query ID | Application-generated child identity. |
| Claim ID | Required parent Claim reference. |
| Query Reference | External payer query reference where available. |
| Query Type | Controlled classification. |
| Raised At | When the payer/operator raised the query. |
| Response Due At | Optional SLA/business deadline; Workflow SLA remains separately owned. |
| Query Status | Open, responded, closed, expired, or controlled future value. |
| Query Details | Structured/plain description governed by later privacy rules. |
| Response Details | Authorized response note/reference. |
| Responded At | Response timestamp where applicable. |
| Standard audit/version/soft-delete | Child lifecycle control. |

**Cardinality:** One Claim has zero or many Claim Queries. A Query cannot be moved between Claims.

## 6. Logical Entity: Claim Submission Intent

**Role:** An auditable Claim-owned instruction/outcome reference for a future external payer submission.

| Logical attribute | Meaning |
|---|---|
| Claim Submission Intent ID | Application-generated child identity. |
| Claim ID | Required parent Claim reference. |
| Hospital-Payer Integration ID snapshot | Selected destination route at request time. |
| Submission Channel snapshot | Email/RPA Portal/API route type at request time. |
| Submission Status | Requested, dispatched, delivered, failed, acknowledged, or controlled future value. |
| Requested At / By | Request audit. |
| Verified At | External delivery verification time, if any. |
| External Submission Reference | Non-secret payer/reference identifier, if received. |
| Failure Category / Detail | Safe non-secret delivery outcome information. |
| Standard audit/version/soft-delete | Child lifecycle control. |

**Cardinality:** One Claim has zero or many Submission Intents. A single Claim may require resubmission; each distinct request remains historically traceable.

**Security:** No password, token, mailbox credential, portal credential, raw attachment, or secret reference value is stored in this entity.

## 7. Logical Entity: Claim Status History

**Role:** Immutable, append-only business-transition evidence.

| Logical attribute | Meaning |
|---|---|
| Claim Status History ID | Application-generated history identity. |
| Claim ID | Required parent Claim reference. |
| Claim Product | Product captured at transition time. |
| From Lifecycle Status | Prior lifecycle value. |
| To Lifecycle Status | New lifecycle value. |
| From Stage / To Stage | Optional product-scoped stage values. |
| Transition Rationale | Required/optional according to transition rule. |
| Workflow Instance ID | Optional external coordination reference at event time. |
| Transitioned By / At | Immutable actor/timestamp. |

**Cardinality:** One Claim has one or many history entries. A Claim must receive an initial history entry at creation. History records are never updated or normally soft-deleted.

## 8. External Logical References

| External reference | Referenced from | Contract |
|---|---|---|
| Organization | Claim and all tenant-owned children | Parent tenant scope; never inferred from frontend input. |
| Hospital | Claim | Must belong to Organization and be active at creation. |
| Hospital-Payer Integration | Claim, Submission Intent | Must match Claim Organization/Hospital and be active when newly selected. |
| Insurance Partner | Claim payer snapshot | Read-only historical reference/snapshot; Insurance Foundation owns master record. |
| Workflow Instance | Claim, Status History | Workflow Platform owns instance lifecycle. |
| User / Organization Member | Audit attributes | IAM/Organization own membership and authorization. |
| Patient/Encounter | Claim | No physical foreign key approved until its owning context exists. |
| Document | Future Claim Document Reference | Deferred; no document child entity approved here. |

## 9. Product Isolation Model

All Claim entities inherit their product context through the parent Claim. A child must never be associated with a Claim from another product implicitly.

| Product | Logical operational allowance in Phase 8 |
|---|---|
| ICA | Full approved Claim lifecycle, authorization and query design. |
| PRE_POST | Full approved Claim lifecycle, authorization and query design where rules overlap ICA. |
| PARTNER_PROCESSING | Shared root identity/data only; specialized child rules and operational lifecycle are deferred. |
| KYP | Shared root identity/data only; policy/benefit calculations and operational lifecycle are deferred. |

## 10. Deferred Logical Entities

The following are intentionally not included in the Phase 8 core ERD yet:

- Claim Line Item / billing code detail;
- Claim Document Reference;
- Claim medical diagnosis/procedure detail;
- Policy, member coverage, benefit, deductible, co-pay, and waiting-period entities;
- Financial settlement, recovery, appeal, remittance, and bank reconciliation;
- Email/RPA/API dispatch execution, raw request/response payloads, and inbound message records.

They require dedicated ownership and privacy/security decisions. Their absence is deliberate and avoids premature schema coupling.

## 11. Logical Relationship Rules

1. Every child shares the parent Claim Organization scope; it must never carry a conflicting tenant relationship.
2. Child IDs, Claim IDs, history IDs, and future external command IDs use application-generated UUIDs.
3. Claim History is append-only; status changes are invalid unless accompanied by a History record.
4. Soft deletion applies to normal operational entities; it does not erase Claim history or legal/audit evidence.
5. Unique business rules (Claim Number, external authorization reference, query reference, submission reference) require scope decisions during Physical Database Design; none are assumed globally unique here.
6. Monetary amounts require approved currency and precision rules during Physical Database Design; no default currency is assumed.

## 12. Validation

The logical ERD preserves the approved aggregate boundary, product isolation strategy, historical payer-route traceability, and cross-context ownership. It intentionally contains no PostgreSQL DDL, data type, index, foreign-key, or API implementation decision.

## 13. Approval Gate

**Next deliverable:** Claim Processing Architecture Review.

**Pause for approval:** Confirm logical entities, cardinalities, external references, deferred areas, and product-isolation model before architecture review and workflow design.
