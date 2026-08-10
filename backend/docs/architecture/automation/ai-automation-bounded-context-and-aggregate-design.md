# ClaimNX Phase 10 — AI & Automation Bounded Context and Aggregate Design

| Attribute | Value |
|---|---|
| Module | AI & Automation |
| Phase | 10 — AI & Automation |
| Status | Draft for approval |
| Depends on | Approved Business Understanding and Domain Analysis |
| Architecture | DDD, Clean Architecture, Modular Monolith |

---

## 1. Objective

Define the AI & Automation bounded-context boundary, aggregate roots, child entities, ownership rules, and transactional consistency requirements.

This document intentionally does not prescribe physical tables, SQL migrations, APIs, queues, or model-provider implementation.

## 2. Bounded Context Boundary

The AI & Automation bounded context owns the lifecycle of approved automation work and the auditable advisory outputs it produces. It translates trusted upstream business events into tenant-scoped automation requests, model or dispatch attempts, human-review decisions, and command requests for the owning context.

It is not a replacement for Claim Processing, Financial Management, Insurance Foundation, Hospital–Payer Integration, Workflow Platform, IAM, or document storage.

## 3. Context Responsibilities

| Responsibility | Owned by AI & Automation? | Notes |
|---|---|---|
| Automation request acceptance, idempotency, retries, and execution status | Yes | Tenant-scoped and auditable. |
| Extraction candidates and confidence | Yes | Advisory data with immutable source provenance. |
| Readiness scores, operational insights, and appeal drafts | Yes | Advisory; no direct lifecycle or finance update. |
| Controlled dispatch task and attempt history | Yes | Uses only non-secret opaque route/secret references. |
| Human review and override decision | Yes | Preserves original result and reviewer rationale. |
| Claim lifecycle and submission intent | No | Claim Processing owns it. |
| Financial settlement, deduction, recovery, and posting | No | Financial Management owns it. |
| Payer master, products, and enablement | No | Insurance Foundation owns it. |
| Hospital–payer routing and secrets | No | Hospital–Payer Integration and external secret management own them. |
| Queue, assignment, and work-item lifecycle | No | Workflow Platform owns it. |

## 4. Aggregate Overview

Phase 10 uses four aggregate roots. They are deliberately separated so that high-volume execution history, human review, and externally retried dispatch attempts do not create unnecessary contention on a single aggregate.

| Aggregate root | Purpose | Main consistency boundary |
|---|---|---|
| Automation Work Request | Accepts and manages one approved automation purpose against a source record. | Idempotent request acceptance, product guard, job lifecycle. |
| Automation Review Case | Groups reviewable extraction/inference outputs and records human decisions. | Candidate/result integrity and immutable review trail. |
| Payer Dispatch Task | Controls one external payer submission/routing request and its attempts. | Safe dispatch lifecycle and verified-result handling. |
| Automation Audit Trail | Preserves append-only inference, prompt/model, and execution audit facts. | Historic truth only; no normal mutable lifecycle. |

## 5. Aggregate: Automation Work Request

### 5.1 Purpose

Represent one idempotent, tenant-scoped request to perform an approved automation purpose against an upstream source record.

### 5.2 Identity and Scope

- `automation_work_request_id` is application-generated UUID.
- `organization_id` is mandatory and immutable.
- `hospital_id` is mandatory for claim-related operations and immutable.
- `claim_id`, `claim_product`, source artefact reference, source context, correlation reference, and initiating actor are retained as references only.

### 5.3 Child Entities

| Child entity | Role |
|---|---|
| Automation Job Attempt | One execution attempt, including safe status, start/end timing, redacted failure classification, and retry sequence. |
| Automation Result Reference | A reference to an output aggregate or output record produced by an attempt. |

### 5.4 Invariants

- Exactly one approved purpose is chosen at creation: document extraction, readiness scoring, financial insight, or payer dispatch enqueueing.
- A Work Request cannot change Organization, Hospital, Claim Product, source reference, or purpose after acceptance.
- Only one active Job Attempt can exist for a Work Request at a time.
- Unsupported operations for `PARTNER_PROCESSING` and `KYP` are rejected before execution.
- Retry creates a new attempt and retains all previous attempts.
- Stale mutable commands require the expected aggregate version.

## 6. Aggregate: Automation Review Case

### 6.1 Purpose

Provide a controlled human-review boundary for AI-generated extraction candidates, readiness outputs, insights, and proposed follow-up drafts.

### 6.2 Identity and Scope

- `automation_review_case_id` is application-generated UUID.
- The Review Case has immutable Organization, Hospital where applicable, Claim Product where applicable, source reference, and correlation reference.
- It references the source Work Request and Automation Job Attempt without owning them.

### 6.3 Child Entities

| Child entity | Role |
|---|---|
| Extraction Candidate | Field identifier, proposed value, source provenance, confidence, and candidate status. |
| Inference Result | Readiness score, insight, explanation, recommendation, or appeal-draft output. |
| Review Decision | Human accept, reject, correct, defer, or override decision. |
| Accepted Command Request | A non-authoritative request to the owner context after an accepted review outcome. |

### 6.4 Invariants

- Candidate and inference payloads are immutable once recorded; corrections are separate Review Decisions.
- Confidence is within 0–1 and is attached to the originating candidate/result.
- Every Review Decision requires an active IAM actor and timestamp.
- A correction or override requires a reason and preserves the original candidate/result.
- Review acceptance may request an owner-context command but never performs the owner-context write.
- Review decisions use optimistic concurrency on the Review Case.

## 7. Aggregate: Payer Dispatch Task

### 7.1 Purpose

Control a Claim submission routing request across Email, API, or RPA Portal channels while keeping Claim Processing as final authority for Claim status changes.

### 7.2 Identity and Scope

- `payer_dispatch_task_id` is application-generated UUID.
- Organization, Hospital, Claim, Claim Product, Claim Submission Intent, payer route reference, channel, and correlation reference are immutable.
- The task may retain only opaque external secret/configuration references. It never retains actual credentials or secret values.

### 7.3 Child Entities

| Child entity | Role |
|---|---|
| Dispatch Attempt | An individual execution attempt, request timestamp, safe result classification, external correlation reference, and redacted diagnostics. |
| Dispatch Verification | Verification source and outcome required before requesting a Claim command. |
| Dispatch Outcome Command Request | A request sent to Claim Processing after verification. |

### 7.4 Invariants

- A Payer Dispatch Task is valid only for an approved Claim Submission Intent and approved Hospital–Payer Integration route.
- The current task status is exactly one of `DISPATCH_QUEUED`, `DISPATCH_IN_PROGRESS`, `DISPATCH_COMPLETED`, or `DISPATCH_FAILED`.
- Only one Dispatch Attempt may be in progress at once.
- `DISPATCH_COMPLETED` requires a verified outcome; a transport success alone is insufficient.
- A failed attempt does not modify the Claim or submission intent.
- Retries require approved policy and add a new attempt; they do not alter historical attempts.
- A verified outcome creates only a command request to Claim Processing, never a direct Claim mutation.

## 8. Aggregate: Automation Audit Trail

### 8.1 Purpose

Store immutable, non-secret operational evidence for model use, prompt/policy selection, inference production, dispatch execution, and review activity.

### 8.2 Audit Entries

| Entry type | Required evidence |
|---|---|
| Model invocation | Model identifier, policy/prompt version, sanitized input provenance, timing, correlation reference, outcome classification. |
| Inference produced | Work Request/Attempt reference, output type, confidence where applicable, result hash or safe reference. |
| Dispatch attempt | Task/attempt reference, channel, timing, non-secret external correlation reference, redacted result classification. |
| Human review | Review Case/Decision reference, actor, decision, timestamp, override reason if applicable. |

### 8.3 Invariants

- Audit entries are append-only.
- No normal update or deletion operation is permitted.
- An audit entry must not contain plaintext credentials, access tokens, raw sensitive external payloads, or source document binaries.

## 9. Transactional Boundaries

| Command | Transactional responsibility |
|---|---|
| Accept Work Request | Work Request, idempotency reference, first audit entry. |
| Start / complete / fail Job Attempt | Work Request state, Job Attempt, Audit Trail entry. |
| Record extraction/inference result | Review Case child result plus Audit Trail entry. |
| Record human review | Review Decision, Review Case version, accepted command request, Audit Trail entry. |
| Enqueue dispatch | Payer Dispatch Task, first attempt if started, Audit Trail entry. |
| Complete verified dispatch | Task lifecycle, verification record, Claim command request, Audit Trail entry. |

Cross-context commands are never part of the same database transaction. They use a durable, auditable command request and are validated by the receiving owner context.

## 10. Aggregate Relationships

```text
Automation Work Request
  ├── Automation Job Attempt (child)
  ├── creates ──> Automation Review Case
  │                 ├── Extraction Candidate (child)
  │                 ├── Inference Result (child)
  │                 └── Review Decision (child)
  └── creates ──> Payer Dispatch Task
                    ├── Dispatch Attempt (child)
                    └── Dispatch Verification (child)

All aggregates ──> Automation Audit Trail (append-only references)
```

The arrows show references and event relationships, not ownership across aggregate boundaries.

## 11. External References and Validation Gates

Before accepting a command, the application layer must validate the following through the owning context or approved read model:

- Active IAM actor and Organization membership.
- Organization and Hospital tenant scope.
- Claim and Claim Product eligibility where the operation is Claim-related.
- Approved source artefact availability and source data handling policy.
- Approved Hospital–Payer route and opaque secret reference for dispatch.
- Active Claim Submission Intent for external dispatch.
- Product strategy eligibility for the requested automation purpose.

## 12. Explicit Non-Aggregates

The following are intentionally not aggregates in Phase 10:

- A generalized AI model registry or prompt authoring platform.
- Credential or secret storage.
- Document binary storage and document retention rules.
- Claim line-item, clinical coding, tariff, benefit, or coverage aggregates.
- A payer portal session aggregate.
- Workflow queue and assignment aggregate.

They may be introduced only through an approved future business requirement and bounded-context review.

## 13. Acceptance Criteria for Moving to Logical ERD

Proceed only when the following are accepted:

- The four aggregate boundaries are sufficient and do not claim ownership from another context.
- The Work Request, Review Case, and Dispatch Task consistency rules are clear.
- Human review, product isolation, tenant scope, non-secret handling, and append-only audit requirements are preserved.
- Cross-context interactions occur through auditable command requests, not direct writes.

## 14. Approval Gate

**Decision required:** Approve AI & Automation Bounded Context and Aggregate Design before creating the Logical ERD.
