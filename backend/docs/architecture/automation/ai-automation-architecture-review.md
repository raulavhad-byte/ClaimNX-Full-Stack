# ClaimNX Phase 10 — AI & Automation Architecture Review

| Attribute | Value |
|---|---|
| Module | AI & Automation |
| Phase | 10 — AI & Automation |
| Status | Draft for approval |
| Reviewed inputs | Approved Business Understanding, Domain Analysis, Bounded Context and Aggregate Design, Logical ERD |
| Review decision | Approved with the guardrails in this document, subject to final approval |

---

## 1. Objective

Verify that the proposed AI & Automation design preserves ClaimNX DDD, Clean Architecture, tenant isolation, data security, human accountability, and ownership boundaries before workflow planning or implementation begins.

## 2. Architecture Decision Summary

The architecture is approved in principle as a dedicated AI & Automation bounded context inside the ClaimNX modular monolith.

It is an advisory and controlled-orchestration capability. It does not become a generic AI platform, a secret vault, a document store, a direct payer-portal client with persisted credentials, or the owner of Claim/Financial/Insurance/Workflow business facts.

## 3. Clean Architecture Alignment

| Layer | Allowed responsibility | Prohibited responsibility |
|---|---|---|
| Domain | Aggregates, invariants, state transitions, policies, value objects, domain events | NestJS controllers, SQL, provider SDKs, HTTP calls, storage SDKs |
| Application | Commands/use cases, tenant/actor validation orchestration, transaction boundary coordination, product strategy selection | Direct SQL scattered across use cases, direct external credential handling |
| Infrastructure | Raw-SQL repositories, model-provider adapter, event/outbox adapter, secret-reference resolver interface, safe dispatch adapter | Business lifecycle authority owned by another context |
| Presentation | Versioned REST DTO validation, authorization enforcement, response mapping | Domain rules or secret exposure |

The dependency direction remains inward: Presentation and Infrastructure depend on Application/Domain; Domain depends on no framework or provider.

## 4. Ownership Boundary Review

| Concern | Decision | Review result |
|---|---|---|
| Claim lifecycle and submission | Claim Processing remains sole authority. AI & Automation issues only auditable command requests. | Approved |
| Financial outcomes | Financial Management remains sole authority for remittance, settlement, deduction, recovery, reconciliation, and posting. | Approved |
| Payer master and enablement | Insurance Foundation remains owner. | Approved |
| Hospital–payer route and credentials | Hospital–Payer Integration owns route configuration; external secret management owns secret values. | Approved |
| Human-review work items | Workflow Platform owns the queue/work-item lifecycle; AI & Automation can request/refer to it. | Approved |
| Documents and emails | Source storage remains owner; AI & Automation stores safe references/provenance only. | Approved |

No cross-context database writes are permitted.

## 5. Tenant Isolation Review

Every automation record must carry immutable Organization scope. Claim-related work must also carry immutable Hospital and Claim Product scope.

Required application and repository safeguards:

- Every read, update, retire, review, retry, and dispatch command filters by `organization_id`.
- Claim-related reads and writes additionally filter by `hospital_id`.
- Referenced Claim, Hospital, route, submission intent, source artefact, partner, and actor must be validated within the same tenant context before use.
- Cross-tenant access fails as not found or forbidden according to the API policy, without leaking record existence.
- Aggregate version checks are applied to every mutable command.

**Review result: Approved, conditional on implementation tests for cross-organization and cross-hospital access.**

## 6. Product Isolation Review

| Product | Phase 10 allowed operations | Guard requirement |
|---|---|---|
| `ICA` | Extraction, readiness scoring, insights, controlled dispatch, human review | Active strategy |
| `PRE_POST` | Extraction, readiness scoring, insights, controlled dispatch, human review | Active strategy |
| `PARTNER_PROCESSING` | Document parsing and evidence organisation only | Guard scoring, insight-driven operational automation, and dispatch |
| `KYP` | Document parsing and evidence organisation only | Guard scoring, insight-driven operational automation, and dispatch |

The Claim Product Strategy factory must be called before an automation request is accepted and again before an execution or dispatch is started. Product must be stored as immutable context—not inferred only from a caller-provided route.

**Review result: Approved.**

## 7. AI, Privacy, and Secret Safety Review

### 7.1 Model Provider Safety

- Model access is server-side only, behind an infrastructure adapter.
- Model/provider selection, policy/prompt version, and sanitized source provenance are audited for every invocation.
- Prompt construction follows minimum-necessary data handling and configured redaction rules.
- Model output is treated as untrusted candidate data and must pass domain/application validation before persistence.

### 7.2 Secret Safety

- AI & Automation stores only an opaque external secret reference where dispatch needs one.
- Passwords, tokens, cookies, portal sessions, raw authorization headers, and secret values are prohibited from database records, logs, exception text, API payloads, and audit entries.
- Dispatch adapters resolve a secret only at execution time through the approved secret-management boundary.

### 7.3 Sensitive Data Safety

- Source artefacts are referenced, not duplicated by default.
- Any persisted candidate/result requiring protected data receives approved protected storage handling, data classification, retention, and access controls during Physical Database Design.
- Diagnostics and external responses are redacted before persistence.

**Review result: Approved with no-secret storage as a non-negotiable architectural rule.**

## 8. Consistency, Audit, and Reliability Review

| Requirement | Architecture decision |
|---|---|
| Mutable aggregates | Optimistic concurrency using expected version. |
| Historic facts | Job attempts, dispatch attempts, review decisions, inference/prompt/model audits are append-only. |
| Duplicate upstream delivery | Idempotency/correlation reference is mandatory. |
| External side effects | Dispatch uses durable task/attempt records; retry is explicit and auditable. |
| Cross-context effect | A durable owner-context command request is created; receiving context validates and performs its own write. |
| Failure handling | No Claim/Financial mutation on model/dispatch failure; store only safe failure classification. |
| Recovery | In-progress work is detectable and eligible for a separately approved retry/reconciliation policy. |

The architecture requires a transactional outbox or equivalent durable command/event publication mechanism to be chosen in implementation planning. Direct in-memory event publication is not acceptable for a production dispatch/result flow.

## 9. Workflow Platform Decoupling Review

AI & Automation may create a request for human review or operational follow-up. Workflow Platform owns whether and how that becomes a work item, assignment, queue, escalation, or SLA.

Conversely, a Workflow task action can request an AI/automation action, but cannot bypass the AI & Automation product, tenant, review, and audit policies.

**Review result: Approved.**

## 10. External Dispatch Safety Review

1. Claim Processing creates and owns the Claim Submission Intent.
2. AI & Automation validates the active tenant-scoped Hospital–Payer route and creates a Dispatch Task.
3. An adapter attempts dispatch through the approved Email, API, or RPA channel.
4. The adapter records only safe attempt evidence and external correlation data.
5. A verified outcome creates a command request to Claim Processing.
6. Claim Processing validates business transition rules and appends Claim history.

This avoids direct Claim mutation and allows failed or ambiguous external responses to be reviewed safely.

## 11. Performance and Scalability Review

- Jobs, attempts, audits, and dispatch history can grow quickly; their logical separation prevents hot aggregate contention.
- Operational listings must use tenant-scoped and status-oriented access paths.
- Audit access should be paginated and filtered by correlation/aggregate reference.
- Source document bytes, raw model payloads, and raw portal responses must not be placed in transactional business tables.
- Long-running model/RPA operations must execute asynchronously; REST requests create work rather than waiting for completion.

**Review result: Approved.**

## 12. Required Implementation Guardrails

The following are mandatory before Phase 10 is considered complete:

- Raw SQL migrations remain the schema source of truth.
- All business UUIDs are generated in the application layer.
- Every business mutation records actor, timestamps, and version.
- All commands validate active IAM user and active Organization membership.
- All aggregate reads/writes enforce Organization; Claim-related operations enforce Hospital.
- REST endpoints use versioned paths and DTO validation.
- API responses never contain secrets or raw protected external payloads.
- Model and dispatch adapter failures are mapped to safe domain/application errors.
- Tests cover product guards, tenant isolation, concurrency conflicts, idempotency, append-only history, secret redaction, and direct-owner-mutation prohibition.

## 13. Review Findings and Resolutions

| Finding | Resolution |
|---|---|
| AI could appear to own Claim state through recommendations. | Results are advisory and only create owner-context command requests after approved review/verification. |
| RPA could leak credentials into automation records. | Only opaque external secret references are permitted. |
| Product rules could leak across products. | Immutable Claim Product plus strategy guard at request and execution stages. |
| Audit data could be overwritten or deleted. | Audit, attempts, verification, and review history are append-only. |
| External dispatch may be retried unsafely. | Idempotency/correlation and per-attempt history are mandatory. |
| Source documents could be copied into business tables. | Source references/provenance only by default; protected handling is explicitly designed later. |

## 14. Architecture Review Decision

**Decision: APPROVED, subject to the stated implementation guardrails.**

The design can proceed to Workflow and Implementation Plan. It must not proceed to Physical Database Design, migrations, or code until that plan is approved.

## 15. Approval Gate

**Decision required:** Approve AI & Automation Architecture Review before preparing the Workflow and Implementation Plan.
