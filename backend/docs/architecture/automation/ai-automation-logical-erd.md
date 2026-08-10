# ClaimNX Phase 10 — AI & Automation Logical ERD

| Attribute | Value |
|---|---|
| Module | AI & Automation |
| Phase | 10 — AI & Automation |
| Status | Draft for approval |
| Depends on | Approved Business Understanding, Domain Analysis, and Aggregate Design |
| Scope | Logical relationships only; no physical schema or SQL |

---

## 1. Objective

Define the logical records and relationships required to persist Phase 10 automation work, advisory inference, human review, payer dispatch, and immutable audit evidence without taking ownership of data that belongs to another ClaimNX context.

## 2. Logical Entity Catalogue

| Logical entity | Aggregate ownership | Purpose |
|---|---|---|
| Automation Work Request | Automation Work Request | Idempotent, tenant-scoped request for one approved automation purpose. |
| Automation Job Attempt | Automation Work Request | One execution attempt with status, retry sequence, and safe diagnostics. |
| Automation Result Reference | Automation Work Request | Link from an execution attempt to an output/review record. |
| Automation Review Case | Automation Review Case | Review boundary for outputs relating to one source context. |
| Extraction Candidate | Automation Review Case | Proposed structured field value with provenance and confidence. |
| Inference Result | Automation Review Case | Advisory score, classification, explanation, or recommendation. |
| Review Decision | Automation Review Case | Human acceptance, rejection, correction, deferment, or override. |
| Owner Context Command Request | Automation Review Case / Payer Dispatch Task | Durable request for a command owned by Claim Processing or another context. |
| Payer Dispatch Task | Payer Dispatch Task | Controlled routing/submission task based on an approved submission intent and route. |
| Payer Dispatch Attempt | Payer Dispatch Task | One external execution attempt with redacted outcome details. |
| Dispatch Verification | Payer Dispatch Task | Evidence that a dispatch outcome is verified before requesting a Claim command. |
| Automation Audit Entry | Automation Audit Trail | Append-only model, prompt/policy, execution, dispatch, and review audit evidence. |

## 3. External Logical References

These are references to owner-context records. They are never redefined as AI & Automation-owned entities.

| External reference | Owner bounded context | Usage |
|---|---|---|
| Organization | Tenant Management | Mandatory tenant scope. |
| Hospital | Hospital | Mandatory scope for Claim-related automation. |
| IAM User | IAM | Initiator, reviewer, and accountable actor. |
| Claim | Claim Processing | Source business context and product scope. |
| Claim Submission Intent | Claim Processing | Mandatory source for payer dispatch. |
| Financial Remittance / Deduction / Settlement | Financial Management | Source context for advisory financial insight. |
| Insurance Partner | Insurance Foundation | Partner identity reference only. |
| Hospital–Payer Integration | Hospital–Payer Integration | Approved route/channel and opaque secret reference only. |
| Source Artefact | Document / email storage boundary | Immutable source reference and provenance. |
| Workflow Work Item | Workflow Platform | Optional human-review routing reference. |

## 4. Entity Relationships

```text
Organization 1 ──── * Automation Work Request
Hospital     1 ──── * Automation Work Request          (Claim-related work only)
Claim        1 ──── * Automation Work Request          (when Claim-related)

Automation Work Request 1 ──── * Automation Job Attempt
Automation Job Attempt  1 ──── * Automation Result Reference
Automation Work Request 1 ──── * Automation Audit Entry

Automation Work Request 1 ──── * Automation Review Case
Automation Review Case  1 ──── * Extraction Candidate
Automation Review Case  1 ──── * Inference Result
Automation Review Case  1 ──── * Review Decision
Automation Review Case  1 ──── * Owner Context Command Request
Automation Review Case  1 ──── * Automation Audit Entry

Claim Submission Intent 1 ──── * Payer Dispatch Task
Hospital–Payer Integration 1 ─ * Payer Dispatch Task
Payer Dispatch Task 1 ─────── * Payer Dispatch Attempt
Payer Dispatch Task 1 ─────── * Dispatch Verification
Payer Dispatch Task 1 ─────── * Owner Context Command Request
Payer Dispatch Task 1 ─────── * Automation Audit Entry
```

`1 ──── *` means one owner-side record can be referenced by many dependent records. It does not imply lifecycle ownership across bounded contexts.

## 5. Tenant and Product Scope Rules

| Logical record | Organization | Hospital | Claim | Claim Product |
|---|---|---|---|---|
| Automation Work Request | Required | Required for Claim-related work | Required when Claim-related | Required when Claim-related |
| Automation Job Attempt | Inherited from Work Request | Inherited | Inherited | Inherited |
| Automation Review Case | Required | Required when Claim-related | Optional/required according to source purpose | Required when Claim-related |
| Extraction Candidate / Inference Result / Review Decision | Inherited from Review Case | Inherited | Inherited | Inherited |
| Payer Dispatch Task / Attempt / Verification | Required | Required | Required | Required |
| Automation Audit Entry | Required | Required when applicable | Optional/required according to audited operation | Required when applicable |

No query or command may use a Claim, Hospital, source artefact, or automation record outside its Organization scope. Claim-related records must additionally validate Hospital scope.

## 6. Important Logical Attributes

### 6.1 Automation Work Request

- Identity, Organization, Hospital, Claim, Claim Product, source-reference type/value, purpose, correlation reference, idempotency reference.
- Request status, expected version, initiator, creation/update audit.
- The source-reference data is a safe identifier only; it must not contain a document binary, email body, credential, or raw protected payload.

### 6.2 Automation Job Attempt

- Work Request reference, attempt number, status, queued/started/completed timestamps, model/provider reference where applicable.
- Redacted failure classification, retry eligibility, external correlation reference.

### 6.3 Extraction Candidate and Inference Result

- Source Review Case reference, source artefact/provenance reference, output type, proposed value or safe structured result, confidence, policy/prompt/model version, and creation timestamp.
- Values requiring protected data handling are represented by an approved safe reference or approved encrypted/protected storage approach to be determined in Physical Database Design.

### 6.4 Review Decision

- Review Case and target result/candidate reference, decision type, final accepted/corrected value where applicable, mandatory reviewer, decision timestamp, override reason when applicable.

### 6.5 Payer Dispatch Task

- Organization, Hospital, Claim, Claim Product, Claim Submission Intent, Insurance Partner, Hospital–Payer Integration route, channel, opaque secret reference, dispatch lifecycle status, correlation reference, expected version, and audit fields.

### 6.6 Automation Audit Entry

- Organization and applicable Hospital/Claim references, event type, aggregate/reference identity, actor/system identity, model/provider/prompt-policy metadata where applicable, sanitized provenance, redacted outcome metadata, correlation reference, and immutable occurrence timestamp.

## 7. Cardinality and Deletion Semantics

- Automation-owned records use soft deletion only where lifecycle retirement is needed; normal operational deletion is prohibited.
- Audit entries, job attempt history, dispatch attempts, verification history, and review decisions are append-only and must not be soft-deleted in routine operations.
- An upstream record’s retirement must not physically cascade-delete automation audit or historical records.
- A source reference that becomes unavailable is represented as a safe historical reference with an availability/retention indicator, not by deleting dependent audit history.
- A Work Request can be retired only after no active Job Attempt remains.
- A Payer Dispatch Task can be retired only after no attempt is in progress and no unprocessed verified outcome command request remains.

## 8. Logical Uniqueness Rules

| Rule | Logical uniqueness scope |
|---|---|
| Work Request idempotency | Organization + automation purpose + source type/reference + idempotency/correlation key among active requests. |
| Job Attempt sequence | One attempt number per Work Request. |
| Extraction Candidate source identity | Review Case + source provenance + target field + candidate sequence. |
| Review Decision sequence | One sequential decision record per reviewed candidate/result. |
| Dispatch Task request | Organization + Claim Submission Intent + approved route + correlation/idempotency key among active tasks. |
| Dispatch Attempt sequence | One attempt number per Dispatch Task. |
| Owner Context Command Request | Receiving context + target aggregate + command purpose + source event/correlation key. |
| Audit identity | Append-only event identity or correlation + sequence; duplicates are rejected by idempotency policy. |

## 9. Logical Constraints

- Confidence is between 0 and 1 inclusive.
- Readiness score is between 0 and 100 inclusive.
- Job status, review decision, dispatch status, and command-request status use approved controlled values.
- `DISPATCH_COMPLETED` requires at least one verified Dispatch Verification record.
- A review correction or override requires a non-empty reason.
- A Claim-related automation record must have both Organization and Hospital scope matching the referenced Claim.
- An active dispatch task must reference an approved active Hospital–Payer Integration route and an active Claim Submission Intent.
- Every mutable aggregate record begins at version 1 and increments on successful update.
- Every audit entry and historical child record carries actor/system attribution and timestamp.

## 10. Data Classification

| Data class | Examples | Rule |
|---|---|---|
| Operational metadata | IDs, statuses, timestamps, channel, retry classification | May be persisted under tenant and audit rules. |
| Advisory business data | Score, extracted candidate, insight, recommendation | Persist only with provenance, confidence where applicable, and review/audit protection. |
| Protected health / sensitive source data | Document contents, email content, clinical or financial evidence | Minimize, sanitize, protect, and retain only under approved data-handling policy. |
| Secrets | Passwords, access tokens, portal credentials, cookies | Never persisted in this context. Only opaque external references are allowed. |

## 11. Deferred Logical Entities

The following remain deliberately deferred:

- Full prompt template catalogue and provider/model governance registry.
- Payer portal session, browser automation artifact, and credential vault entities.
- Document annotation, clinical coding, or medical-record aggregates.
- User-facing review work-item/assignment records.
- Financial appeal case management.

They require an approved subsequent business requirement and architecture review.

## 12. Acceptance Criteria for Moving to Architecture Review

Proceed only when reviewers agree that:

- Every logical entity has a clear AI & Automation ownership boundary.
- Tenant/Hospital/Product scope is explicit for Claim-related operations.
- External references remain references rather than copied or owned records.
- Audit, review, dispatch, retry, and idempotency relationships are sufficient.
- No relationship implies storage of plaintext credentials or direct owner-context mutation.

## 13. Approval Gate

**Decision required:** Approve AI & Automation Logical ERD before the Architecture Review.
