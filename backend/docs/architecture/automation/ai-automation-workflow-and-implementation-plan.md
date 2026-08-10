# ClaimNX Phase 10 — AI & Automation Workflow and Implementation Plan

| Attribute | Value |
|---|---|
| Module | AI & Automation |
| Phase | 10 — AI & Automation |
| Status | Draft for approval |
| Depends on | Approved Business Understanding, Domain Analysis, Aggregate Design, Logical ERD, and Architecture Review |
| Implementation style | Raw SQL source of truth; NestJS modular monolith; DDD and Clean Architecture |

---

## 1. Objective

Define the approved delivery order for Phase 10 so that automation capabilities are introduced safely, remain advisory and human-controlled, preserve tenant/product isolation, and never take ownership from existing ClaimNX contexts.

## 2. Delivery Principles

- Build the shared automation foundation once; activate operational flows initially only for `ICA` and `PRE_POST`.
- Treat `PARTNER_PROCESSING` and `KYP` as guarded products: document parsing/evidence organisation only.
- Persist only non-secret, minimum-necessary automation data.
- Use asynchronous, durable work requests for model calls and external dispatch.
- Preserve human accountability: AI outputs are candidates, not business facts.
- Claim Processing remains authority for Claim lifecycle; Financial Management remains authority for financial facts.
- Implement one vertical capability at a time and verify before enabling the next.

## 3. Operational Workflows

### 3.1 Document Intelligence Workflow

```text
DocumentUploaded
    ↓
Validate actor, Organization, Hospital, Claim Product, and source artefact policy
    ↓
Create idempotent Automation Work Request
    ↓
Queue Automation Job Attempt
    ↓
Server-side OCR / extraction adapter
    ↓
Persist candidates, confidence, safe provenance, and immutable audit metadata
    ↓
Create or update Automation Review Case
    ↓
Human accepts / rejects / corrects / defers
    ↓
If accepted, create owner-context command request only
```

### 3.2 Claim Readiness Scoring Workflow

```text
ClaimReadyForReviewRequested
    ↓
Validate active ICA or PRE_POST product strategy and tenant scope
    ↓
Create idempotent scoring Work Request
    ↓
Evaluate approved readiness factors
    ↓
Persist 0–100 advisory score, factor summary, model/policy metadata, audit evidence
    ↓
Create Review Case when score/rule requires review
    ↓
Human decision or owner-context command request
```

The readiness result never independently transitions a Claim.

### 3.3 Financial Insight Workflow

```text
RemittanceDeductionRecorded
    ↓
Validate Financial source reference, tenant/hospital scope, and Claim Product
    ↓
Create idempotent financial-insight Work Request
    ↓
Analyse approved financial facts and historical patterns
    ↓
Persist advisory insight, recommended follow-up, optional appeal draft, audit evidence
    ↓
Human review
    ↓
Optional owner-context command request or Workflow follow-up request
```

Financial Management remains the authority for all figures, deductions, recovery, reconciliation, and posting.

### 3.4 Payer Dispatch Workflow

```text
ClaimSubmissionRequested / approved Claim Submission Intent
    ↓
Validate ICA or PRE_POST strategy, tenant/hospital scope, and active route
    ↓
Create idempotent Payer Dispatch Task: DISPATCH_QUEUED
    ↓
Start one Dispatch Attempt: DISPATCH_IN_PROGRESS
    ↓
Email / API / RPA adapter resolves opaque secret reference at runtime
    ↓
Persist redacted attempt outcome and external correlation reference
    ↓
Verified success: DISPATCH_COMPLETED → owner-context Claim command request
Failure: DISPATCH_FAILED → human follow-up / approved retry policy
```

No credential, token, portal session, or raw external payload is persisted by Phase 10.

## 4. Phase 10 Build Sequence

| Step | Deliverable | Objective | Validation / approval gate |
|---|---|---|---|
| 1 | Physical Database Design | Define exact columns, foreign keys, constraints, soft-delete and audit strategy for automation records. | Approve Physical Database Design. |
| 2 | SQL Architecture Review | Review naming, indexes, tenant filters, deletion semantics, append-only controls, and secret safety. | Approve SQL Architecture Review. |
| 3 | Reference-Data Catalogue | Define controlled values for automation purpose, job/review/dispatch status, and safe failure classifications. | Approve Reference-Data Catalogue. |
| 4 | PostgreSQL Migrations | Create additive raw SQL migrations and post-migration validation. | Approve PostgreSQL Migration Scripts. |
| 5 | Domain Layer | Implement aggregates, value objects, policies, product strategies, and domain errors. | Approve Domain Layer. |
| 6 | Repository Layer | Implement raw-SQL mapping and tenant-scoped repository contracts. | Approve Repository Layer. |
| 7 | Command Persistence Design | Define database functions/outbox command persistence for work/review/dispatch transitions. | Approve Command Persistence Migration Design. |
| 8 | Command Persistence Migration | Add reviewed database functions, append-only guards, and validation queries. | Approve Command Persistence Migration. |
| 9 | Application Layer | Implement use cases, actor and tenant validation, orchestration, and safe error mapping. | Approve Application Layer. |
| 10 | Infrastructure Adapters | Implement provider-neutral model, dispatch, secret-reference, and durable publication adapters. | Approve Infrastructure Adapters. |
| 11 | REST API Layer | Implement versioned controllers, DTO validation, permissions, response safety, and API integration scripts. | Approve REST API Layer. |
| 12 | Testing and Completion Review | Execute unit, repository, migration, integration, tenant-isolation, concurrency, redaction, and rollback tests. | Approve Phase 10 Completion. |

No row may be skipped or reordered.

## 5. Initial Implementation Scope by Capability

| Capability | Phase 10 initial scope | Deferred |
|---|---|---|
| Document intelligence | Work request, job lifecycle, candidate persistence, confidence, review/audit model, provider interface. | Advanced medical coding validation, document annotation UI. |
| Readiness scoring | Advisory score and factor summary for ICA/PRE_POST. | Automated submission/state change. |
| Financial insight | Advisory analysis and reviewable recommendation. | Autonomous financial posting, recovery, settlement, or reconciliation decisions. |
| Payer dispatch | Durable dispatch task, attempts, route validation, opaque secret reference, verified owner-command request. | Credential storage, portal-session persistence, autonomous unverified lifecycle transitions. |
| Human review | Review decision and override audit. | Full review-workbench frontend; Workflow Platform integration remains via approved request boundary. |

## 6. Product Strategy Plan

| Strategy | `ICA` | `PRE_POST` | `PARTNER_PROCESSING` | `KYP` |
|---|---|---|---|---|
| Extraction | Enabled | Enabled | Enabled for parsing/evidence only | Enabled for parsing/evidence only |
| Readiness scoring | Enabled | Enabled | Guarded | Guarded |
| Financial insight | Enabled when relevant | Enabled when relevant | Guarded | Guarded |
| Payer dispatch | Enabled with approved route and intent | Enabled with approved route and intent | Guarded | Guarded |
| Owner-context command request | Enabled after review/verification | Enabled after review/verification | Guarded except later approved draft-safe actions | Guarded except later approved draft-safe actions |

The domain strategy factory is the single enforcement point. Controllers, repositories, and model adapters must not implement product-specific business branching independently.

## 7. Required Database Design Decisions for the Next Step

The Physical Database Design must decide and document:

- Exact table names and whether reference/result child records are separate tables.
- Required Organization, Hospital, Claim, Claim Product, source, route, actor, audit, version, and soft-delete columns.
- Which records are mutable aggregates and which are append-only history/audit facts.
- Foreign-key rules that preserve historic audit evidence without direct cross-context ownership or destructive cascading.
- Partial unique indexes for active idempotency, one active job attempt, and dispatch attempt sequencing.
- Check constraints for score/confidence ranges and controlled lifecycle values.
- Indexes for tenant-scoped operational queues, status, correlation references, source references, and audit lookup.
- Protected-data/minimum-necessary storage rules and explicit secret prohibition.
- Retention, archival, and redaction approach for safe diagnostics and inference content.

## 8. Required Testing Plan

### 8.1 Database and Migration Tests

- Required reference data exists.
- All tables, constraints, indexes, triggers, and append-only protections exist.
- Organization/Hospital scope and route/submission-intent prerequisites are enforced.
- Confidence and readiness score ranges reject invalid input.
- Audit and attempt records cannot be updated/deleted through normal paths.
- Re-running migrations is safe where the migration strategy requires it.

### 8.2 Domain and Application Tests

- ICA/PRE_POST active strategy allows approved operations.
- PARTNER_PROCESSING/KYP guarded strategy blocks scoring, operational automation, and dispatch.
- Review correction retains original candidate and creates an auditable decision.
- Stale expected version returns conflict.
- Duplicate correlation/idempotency request returns the existing safe result rather than creating duplicate side effects.
- No use case directly updates Claim, Financial, Insurance, Workflow, or document-store data.

### 8.3 Adapter and API Tests

- Model/provider adapter receives sanitized input and records safe audit metadata.
- Secret values never appear in DTOs, logs, errors, repository models, or audit payloads.
- Dispatch retry produces a new attempt and preserves previous attempts.
- Verified dispatch creates a command request; it does not update Claim directly.
- REST endpoints enforce permissions, Organization/Hospital isolation, validation, and safe error responses.

## 9. Deployment and Operational Readiness

- Feature flags must allow individual automation purposes, model providers, and dispatch channels to be enabled per approved environment.
- Production model and RPA credentials/configuration are managed outside the application database.
- Monitoring must expose safe counts, latency, failure classes, retry backlog, review backlog, dispatch success rate, and correlation references—never secrets or raw protected payloads.
- Alerting thresholds and manual operating procedures are required before enabling real external dispatch.
- Initial production rollout is limited to advisory document intelligence/readiness scoring. External dispatch requires a separately approved operational go-live gate.

## 10. Documentation Deliverables

| Deliverable | Required content |
|---|---|
| Physical Database Design | Objective, ownership, full logical-to-physical mapping, constraints, indexes, audit, tenant scope, migration intent, validation, approval gate. |
| SQL Architecture Review | Risks, decisions, validation queries, backward compatibility, performance and security review. |
| Reference-Data Catalogue | Controlled category/value definitions, owners, meanings, lifecycle, and seed strategy. |
| Migration files | Objective, why, path, file name, action, complete SQL, validation, rollback/forward-evolution note. |
| Layer deliverables | Objective, why, file path/name, complete production content, validation, and approval gate. |

## 11. Completion Criteria

Phase 10 is complete only when:

- All approved capability scope is implemented without taking ownership from other contexts.
- ICA and PRE_POST automation flows have passing tests.
- PARTNER_PROCESSING and KYP operational guard tests pass.
- Tenant, Hospital, actor, and product isolation tests pass.
- Review, concurrency, idempotency, append-only, and audit tests pass.
- Secret-redaction tests pass.
- Dispatch is disabled by default in production until its separate go-live gate is approved.
- `npm test -- --runInBand automation` (or approved equivalent) and `npm run build` pass.

## 12. Approval Gate

**Decision required:** Approve AI & Automation Workflow and Implementation Plan before starting the Physical Database Design.
