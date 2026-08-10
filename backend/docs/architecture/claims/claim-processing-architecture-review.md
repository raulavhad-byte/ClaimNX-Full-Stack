# ClaimNX Claim Processing Architecture Review

| Attribute | Value |
|---|---|
| Module | Claim Processing |
| Phase | Phase 8 - Claim Processing |
| Version | 1.0 |
| Status | Draft - awaiting approval |
| Prerequisites | Business Understanding, Domain Analysis, Bounded Context Design, Logical ERD approved |
| Date | 2026-08-01 |

## 1. Objective

Review the approved Claim Processing logical design against ClaimNX enterprise architecture standards before workflow design, physical database design, SQL migrations, or NestJS implementation.

## 2. Review Result

**Recommendation: approve the architecture with the guardrails in this document.**

The design supports a modular monolith today, keeps Claim business ownership separate from Workflow/Insurance/IAM, and creates an extensible shared foundation without enabling unapproved product operations.

## 3. Architecture Decisions Confirmed

| Decision | Review outcome | Reason |
|---|---|---|
| One shared Claim aggregate | Approved | Shared tenant, Hospital, payer-route, lifecycle, audit, and concurrency controls should not be duplicated per product. |
| Immutable Claim Product | Approved | Prevents ICA, Pre/Post, Partner Processing, and KYP logic from being switched after case creation. |
| Product strategy boundary | Approved | ICA/PrePost can operate first; Partner Processing/KYP are structurally present but operationally guarded. |
| Claim lifecycle separate from Workflow state | Approved | Claim owns business truth; Workflow owns tasks, queues, assignments, and SLA. |
| Hospital-Payer Integration reference | Approved | Correctly preserves Hospital-specific Insurer/TPA operational context. |
| Payer identity route snapshot | Approved in principle | Historical claims must remain understandable after route/master changes; physical representation awaits next stage. |
| Authorization, query, submission intent as Claim children | Approved | They have no independent business meaning outside the Claim. |
| Append-only Claim Status History | Approved | Provides audit-grade state-transition evidence. |
| Patient/document/line-item deferral | Approved | Their owner and privacy/financial semantics are not approved yet. |
| Recovery/settlement exclusion | Approved | Belongs to Phase 9 Financial Management. |

## 4. DDD and Ownership Review

### Aggregate boundaries

The Claim aggregate is a valid consistency boundary because the product, Hospital/Organization scope, payer route, readiness, lifecycle, and append-only history must remain coherent.

Claim child records cannot be independently created, reassigned, or modified outside a Claim command.

### Cross-context boundaries

| External context | Allowed interaction | Prohibited interaction |
|---|---|---|
| Insurance Foundation | Read/validate an active Hospital-Payer Integration and retain an approved historical reference. | Updating Partner or route configuration from Claim Processing. |
| Workflow Platform | Request/coordinate approved workflow instance or work action. | Creating/updating queues, tasks, assignments, SLA, or history directly. |
| IAM / Organization | Validate active actor, permissions, and membership. | Owning roles, permissions, or user lifecycle. |
| Hospital | Validate Hospital tenant scope. | Editing Hospital, department, contact, or address data. |
| Future Patient/Document | Reference externally owned stable IDs only after approval. | Creating a parallel patient/document master inside Claim Processing. |
| Financial Management | Publish/offer Claim references and approved outcomes. | Recording settlement, recovery, or remittance. |

## 5. Tenant Isolation Review

Every Claim command must use all applicable scope checks:

```text
authenticated active actor
  + active Organization membership
  + permission for requested action
  + Organization ID path/context
  + Claim Organization ID
  + Hospital Organization ID
  + selected Hospital-Payer Integration Organization/Hospital ID
```

The user interface, a supplied UUID, payer code, or product value is never treated as proof of tenant access.

The physical design must persist `organization_id` on the Claim root. Child records inherit scope through `claim_id`; whether they also persist `organization_id` must be evaluated for enforcement/query performance without creating inconsistent tenant values.

## 6. Security and Privacy Review

1. Claim Processing must not store payer portal passwords, API tokens, SMTP secrets, mailbox passwords, or raw credentials.
2. `credential_secret_reference` from Insurance Foundation is non-secret routing metadata and must not be returned through Claim APIs by implication.
3. Patient, clinical, diagnosis, document, and policy data are deferred because healthcare privacy classification and retention rules need explicit approval.
4. All state changes require audit actor/time and immutable history evidence.
5. API errors and logs must never echo credential, document contents, or external payloads.
6. A later inbound payer response must be authenticated/validated by the Integration capability before it becomes a Claim command.

## 7. Lifecycle and Workflow Review

The following separation is mandatory:

| Concern | Owner |
|---|---|
| Is a Claim ready/submitted/approved/query-raised/cancelled? | Claim Product Strategy and Claim aggregate |
| Who performs work and from which queue? | Workflow Platform |
| When SLA pauses/escalates? | Workflow Platform |
| Did an external channel actually deliver a package? | Future Integration capability, then an approved Claim command |

The physical and application designs must not expose a generic `PATCH /status` endpoint. They must expose named commands with explicit expected version, actor context, target action, and rationale when required.

## 8. Product Isolation Review

| Risk | Guardrail |
|---|---|
| ICA rules applied to KYP | Resolve product strategy from the immutable root product for every command. |
| Partner Processing becomes operational accidentally | Guarded handler rejects unapproved lifecycle actions. |
| Product filtering leaks data | Authorization scopes Organization/Hospital first; product is an additional business filter only. |
| Shared labels hide different meaning | Status/stage transitions are validated using product context, not display text alone. |
| Future fields cause null-heavy root | Add product extensions only after product-specific domain analysis; do not pre-create speculative columns. |

## 9. Clean Architecture Review

Expected module dependency direction:

```text
presentation (REST DTO/controller)
          -> application (use cases / authorization orchestration)
          -> domain (Claim aggregate / product strategies / invariants)
          <- infrastructure (raw-SQL repositories / external context readers)
```

- Domain does not import NestJS, Supabase client, HTTP DTOs, or SQL.
- Application generates UUIDs, checks access, invokes strategies, and maps domain failures to use-case outcomes.
- Repositories call reviewed PostgreSQL functions or raw SQL; they do not own business decisions.
- Controllers validate input and map stable command results; they do not decide lifecycle transitions.

## 10. Performance and Evolution Review

- The initial query pattern is Organization + Hospital + Product + lifecycle; future indexes need real approved query evidence.
- Append-only Claim history can grow rapidly; its partitioning/retention strategy is deferred until volume and legal retention requirements are known.
- Payer-route and Workflow references provide integration stability without synchronous external calls on ordinary Claim reads.
- Product-specific logic is isolated by strategy, allowing new variants without rewriting common tenant/audit controls.

## 11. Open Decisions That Block Physical Design

The following must be resolved in Workflow and Implementation Planning before SQL begins:

1. Canonical lifecycle statuses and stages for ICA and Pre/Post.
2. Whether `Claim Type` is Reference Data and its initial approved values.
3. Claim business numbering strategy and uniqueness scope.
4. Currency, decimal precision, null/default policy, and validation rules for monetary amounts.
5. Which Claim fields may change in Draft versus after readiness/submission.
6. Initial Authorization/Query/Submission Intent statuses and required values.
7. Exact workflow definition selection and compensation behaviour if Workflow coordination fails.
8. The minimum patient and document reference contract, or the decision to keep both absent from the first implementation.

## 12. Validation

The architecture review confirms high cohesion, low coupling, DDD ownership boundaries, Clean Architecture direction, tenant isolation, auditability, security of payer credentials, and backward-compatible evolution. No SQL, migration, code, API, or frontend implementation is approved yet.

## 13. Approval Gate

**Next deliverable:** Claim Processing Workflow and Implementation Plan.

**Pause for approval:** Approve this architecture review before defining the detailed ICA/PrePost lifecycle and implementation sequence that will resolve the physical-design blockers.
