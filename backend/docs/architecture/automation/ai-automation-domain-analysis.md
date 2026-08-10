# ClaimNX Phase 10 — AI & Automation Domain Analysis

| Attribute | Value |
|---|---|
| Module | AI & Automation |
| Phase | 10 — AI & Automation |
| Status | Draft for approval |
| Depends on | Phases 1–9 foundations; approved AI & Automation Business Understanding |
| Architectural style | DDD, Clean Architecture, Modular Monolith |
| Data ownership | AI & Automation owns automation work, inference, recommendation, dispatch, review, and audit records only |

---

## 1. Objective

Translate the approved Phase 10 business scope into a domain model with clear ubiquitous language, ownership boundaries, invariants, and interaction rules.

This document does not define tables, SQL migrations, REST endpoints, message-broker technology, or implementation code.

## 2. Domain Purpose

AI & Automation turns approved operational source events into reviewable, tenant-scoped decision support and controlled automation requests. Its purpose is to reduce manual effort while preserving human accountability and the authority of existing ClaimNX bounded contexts.

It must never become the owner of a Claim lifecycle, a financial decision, an insurance partner, a workflow task, a document, or a secret.

## 3. Ubiquitous Language

| Term | Meaning |
|---|---|
| Automation Work Request | An immutable request to perform one approved automation purpose against a source business record. |
| Automation Job | A managed execution attempt for a Work Request. A request may have more than one attempt only through approved retry policy. |
| Source Artefact | A reference to an approved document, email artefact, remittance artefact, Claim, or other upstream record. It is not copied or owned by this context. |
| Extraction Candidate | A proposed structured value extracted from a source artefact. It includes field name, candidate value, provenance, and confidence. |
| Inference Result | A model-produced, advisory output, including a score, classification, explanation, or recommendation. |
| Readiness Score | An advisory score from 0–100 representing completeness and submission readiness. It is not an approval decision. |
| Insight | An advisory explanation of a probable denial, disallowance, short payment, or recommended follow-up. |
| Dispatch Task | A controlled request to send or submit a Claim through an approved channel, including Email, API, or RPA Portal. |
| Dispatch Attempt | One auditable execution attempt for a Dispatch Task. |
| Review Decision | A human acceptance, rejection, correction, or override of an AI candidate or automation result. |
| Prompt/Model Audit | Immutable metadata identifying the model, prompt or policy version, sanitized input provenance, result metadata, and timing. |
| Correlation Reference | A safe identifier used to trace related actions across bounded contexts without duplicating business ownership. |

## 4. Domain Responsibilities

AI & Automation owns:

- Automation work request lifecycle and retry eligibility.
- Automation job execution status and non-secret operational diagnostics.
- Extraction candidates and their field-level confidence and provenance.
- Advisory readiness scores and their explainable factor summary.
- Advisory denial, disallowance, short-payment, and follow-up insights.
- Controlled payer-dispatch tasks and dispatch attempt history.
- Human review decisions and override evidence.
- Immutable prompt, model, inference, and execution audit metadata.

AI & Automation does not own:

- Claim lifecycle, Claim status history, authorizations, queries, or submission intents — Claim Processing owns these.
- Settlements, remittances, deductions, recovery, reconciliation, or financial postings — Financial Management owns these.
- Insurance Partner master data, product plans, or partner enablement — Insurance Foundation owns these.
- Hospital–Payer routing configuration or secret references — Hospital–Payer Integration owns these.
- Workflow queues, assignments, work items, and tasks — Workflow Platform owns these.
- Document binaries, email bodies, or credential values — their respective storage and secret-management boundaries own these.

## 5. Context Inputs and Outputs

### 5.1 Accepted Inputs

| Upstream event or request | Domain response |
|---|---|
| `DocumentUploaded` | Create `InitiateDocumentExtractionJob` Work Request. |
| `ClaimReadyForReviewRequested` | Create `ExecuteClaimReadinessScoringJob` Work Request. |
| `RemittanceDeductionRecorded` | Create `GenerateDisallowanceAnalysisJob` Work Request. |
| `ClaimSubmissionRequested` | Create `EnqueueRPADispatchTask` Work Request. |
| Human review request | Capture a Review Decision against an existing candidate or inference result. |

### 5.2 Produced Outputs

| Output | Receiving context / actor | Rule |
|---|---|---|
| Extraction Candidates | Human reviewer; later approved Claim command | Never directly overwrites business data. |
| Readiness Score and factors | Human reviewer; Claim Processing | Advisory only. |
| Denial/short-payment insight | Revenue-cycle user; Financial and Claim Processing users | Advisory only. |
| Dispatch outcome | Claim Processing through an approved command request | Must be verified; never mutates Claim data directly. |
| Review Decision | Audit and downstream approved command workflow | Decision actor and timestamp are mandatory. |

## 6. Domain Invariants

1. Every Automation Work Request, Job, Candidate, Insight, Dispatch Task, and Review Decision belongs to exactly one Organization.
2. Claim-related records also carry exactly one Hospital and Claim Product context.
3. Product context is immutable after a Work Request is accepted.
4. `ICA` and `PRE_POST` are operationally active in Phase 10. `PARTNER_PROCESSING` and `KYP` permit document parsing and evidence organisation only; scoring, insight-driven lifecycle automation, and dispatch are guarded.
5. An automation result is advisory until a human review or approved business command accepts it.
6. AI & Automation must not issue direct writes to Claim Processing, Financial Management, Insurance Foundation, Workflow Platform, or source-document storage.
7. A Dispatch Task may use only a non-secret, opaque configuration or secret reference. It must never contain a credential, password, token, session cookie, or plaintext portal payload.
8. A verified Dispatch Attempt may request a Claim command through the approved integration boundary; Claim Processing remains final authority for business validation and state change.
9. Every model invocation and automation attempt requires immutable audit metadata: model identifier, policy or prompt version, sanitized input provenance, correlation reference, timestamp, and outcome.
10. Every mutable automation aggregate uses optimistic concurrency. Stale updates must fail safely.
11. Review overrides must retain the original candidate or result, final value or decision, actor, timestamp, and reason where a value changes.
12. Audit records, inference records, and execution history are append-only. Corrections require compensating records, not mutation of historical facts.

## 7. Domain Policies

### 7.1 Confidence Policy

- Confidence is a numeric value from 0 to 1 inclusive and is always associated with an individual candidate or inference result.
- Confidence does not equal correctness and cannot alone trigger an autonomous business transition.
- The review policy may group confidence into configurable bands, but policy changes must be auditable and cannot rewrite historic confidence.

### 7.2 Human Review Policy

- Material extracted values, readiness exceptions, denial insights, appeal drafts, and dispatch failures require human review.
- A reviewer can accept, reject, correct, or defer a candidate/result.
- A review does not transfer ownership: accepting a candidate can only initiate a later approved command in the owner context.

### 7.3 Dispatch Policy

- A dispatch request is valid only when a Claim Submission Intent and the approved Hospital–Payer Integration route exist.
- Dispatch statuses are `DISPATCH_QUEUED`, `DISPATCH_IN_PROGRESS`, `DISPATCH_COMPLETED`, and `DISPATCH_FAILED`.
- A failure is non-destructive and must preserve an error classification safe for operational review; sensitive response data must be redacted.
- Retry requires an approved retry policy and preserves prior attempt history.

### 7.4 Model and Prompt Policy

- Models are called only from server-side infrastructure.
- Prompt and evidence preparation must sanitize protected health information to the minimum approved operational need.
- The system records version metadata and safety-policy outcome, not plaintext secrets or prohibited external payloads.

## 8. Domain State Models

### 8.1 Automation Work Request

`REQUESTED → QUEUED → IN_PROGRESS → COMPLETED`

Alternative terminal states: `FAILED`, `CANCELLED`, `REQUIRES_REVIEW`.

### 8.2 Extraction Candidate Review

`PROPOSED → ACCEPTED | REJECTED | CORRECTED | DEFERRED`

The original candidate remains immutable regardless of subsequent human decisions.

### 8.3 Dispatch Task

`DISPATCH_QUEUED → DISPATCH_IN_PROGRESS → DISPATCH_COMPLETED | DISPATCH_FAILED`

An approved retry creates a new Dispatch Attempt under the same Dispatch Task; it does not erase the failed attempt.

## 9. Cross-Context Boundaries

| Context | AI & Automation may read/reference | AI & Automation must not own or mutate directly |
|---|---|---|
| Claim Processing | Claim ID, Organization/Hospital scope, Claim Product, lifecycle context, approved submission intent | Claim lifecycle and Claim child entities |
| Financial Management | Remittance, deduction, settlement, and recovery references for analysis | Ledger facts and financial decisions |
| Insurance Foundation | Partner identity and product metadata | Partner master records and product plans |
| Hospital–Payer Integration | Approved route, channel, and opaque secret reference | Routing configuration and secrets |
| Workflow Platform | Work-item or queue reference for human review | Work items, assignments, and queues |
| Document / Email Storage | Source artefact reference and approved sanitized extraction input | Binary documents, email bodies, and storage policies |
| IAM / Tenant Management | Active actor identity and Organization membership | Users, roles, permissions, and memberships |

## 10. Domain Events and Command Requests

The following are conceptual domain events and command requests. Their transport mechanism is deliberately deferred.

| Event / request | Produced by | Consumed by | Purpose |
|---|---|---|---|
| `AutomationWorkRequested` | AI & Automation | Execution infrastructure | Start an approved automation purpose. |
| `ExtractionCandidatesProduced` | AI & Automation | Human review flow | Present structured candidates and confidence. |
| `ClaimReadinessScored` | AI & Automation | Human review flow | Present advisory score and factors. |
| `FinancialInsightGenerated` | AI & Automation | Revenue-cycle review | Present explanation and suggested follow-up. |
| `PayerDispatchCompleted` | AI & Automation | Claim Processing command boundary | Request verified submission outcome handling. |
| `PayerDispatchFailed` | AI & Automation | Human review / Workflow Platform | Request operational follow-up. |
| `AutomationReviewRecorded` | AI & Automation | Audit / approved command boundary | Preserve human decision and optionally request owner-context action. |

## 11. Failure and Safety Semantics

- Unsupported product operations return a controlled domain error and create no external side effect.
- Missing tenant, hospital, Claim, source artefact, active actor, approved route, or required reference data fails before model or dispatch execution.
- A failed model call or dispatch attempt does not change source business data.
- External responses are classified and redacted before being persisted as operational diagnostics.
- Duplicate event delivery is handled through a correlation reference and idempotency policy; it must not produce duplicate accepted business effects.

## 12. Acceptance Criteria for Moving to Bounded Context and Aggregate Design

This Domain Analysis is ready to proceed when reviewers agree that:

- AI & Automation ownership is limited to automation records, advisory outputs, controlled dispatch, review, and audit.
- Claim Processing and Financial Management retain final authority over their business facts and lifecycle changes.
- Product isolation and the Phase 10 scope for ICA, PRE_POST, PARTNER_PROCESSING, and KYP are explicit.
- Human-in-the-loop review and append-only audit requirements are sufficient.
- No secret, credential, or direct external-payload storage is implied.
- The state models and cross-context interactions are accepted as the basis for aggregate design.

## 13. Approval Gate

**Decision required:** Approve AI & Automation Domain Analysis before creating the bounded-context and aggregate-design document.
