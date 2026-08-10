# ClaimNX Phase 10 — AI & Automation Business Understanding

| Field | Value |
|---|---|
| Phase | 10 — AI & Automation |
| Status | Draft for approval |
| Architecture | DDD, Clean Architecture, Modular Monolith |
| Primary consumers | Hospitals, Claim Operations Teams, Insurer/TPA Integration Teams |
| Scope | AI-assisted document intelligence and operational automation |

## 1. Objective

Define the approved business scope for ClaimNX AI & Automation before domain modelling, database design, or code begins.

The phase will help hospital claim teams capture, classify, extract, validate, route, and follow up on claim-related information. It must reduce manual work without allowing an AI model to make an unreviewed financial, clinical, or coverage decision.

## 2. Business Problem

For cashless ICA and Pre/Post claim operations, teams currently receive information from uploaded documents, email responses, payer portals, and future RPA automations. The information is inconsistent, often unstructured, and may include protected health information.

Manual interpretation causes three material risks:

- Delayed pre-authorisation and claim response processing.
- Incorrect transcription or missed payer conditions.
- Incomplete audit evidence for why a claim was routed, updated, or escalated.

ClaimNX needs a controlled automation capability that proposes structured outcomes, preserves evidence, and requires a human decision where business risk remains.

## 3. Approved Business Outcomes

- Classify an incoming document or message by business purpose, such as pre-authorisation request, payer query, approval, rejection, settlement advice, or supporting document.
- Extract candidate structured fields from approved document types, including claim reference, patient identifiers, payer reference, dates, amounts, and response status.
- Validate extracted candidates against the tenant-scoped Claim, Hospital–Payer Integration, Insurance Partner, and Reference Data records already owned by their respective contexts.
- Create an Automation Case for review when confidence, validation, or policy rules require human attention.
- Generate operational suggestions: recommended routing, missing-document prompts, follow-up reminders, and draft Claim lifecycle actions.
- Preserve the source reference, model/version metadata, confidence, validation outcome, reviewer decision, and resulting business command in a complete audit trail.

## 4. Explicit Non-Goals

Phase 10 does **not**:

- Make an autonomous approval, denial, settlement, write-off, recovery, or fraud determination.
- Replace the Claim Aggregate as the final authority for claim lifecycle transitions.
- Store payer portal passwords, tokens, email passwords, or model-provider credentials in business tables.
- Treat AI output as a legally, clinically, or financially authoritative record.
- Create a new owner for documents, Claims, Financial Posting, Workflow tasks, Hospital–Payer routes, or Reference Data.
- Build the React portal. The frontend remains a future phase and will consume versioned APIs.

## 5. Business Actors

| Actor | Responsibility |
|---|---|
| Claim Operations User | Reviews automation suggestions and executes approved business actions. |
| Hospital User | Uploads claim documents and supplies missing information. |
| Automation Service | Coordinates ingestion, extraction, validation, confidence policy, and review-case creation. |
| AI Provider | Produces bounded, schema-constrained extraction/classification candidates only. |
| Payer/TPA | Sends emails, portal responses, API responses, or remittance documents. |
| Auditor/Compliance User | Reviews source evidence, automation decisions, model metadata, and human overrides. |

## 6. Ubiquitous Language

| Term | Meaning |
|---|---|
| Automation Case | Tenant-scoped record representing one controlled automation attempt and its review outcome. |
| Source Artefact | A document, email, API response, or portal/RPA capture referenced by storage identifier; no secret is embedded. |
| Extraction Candidate | A proposed structured value with provenance and confidence; it is not a business fact until accepted. |
| Validation Result | A deterministic rule result comparing a candidate with ClaimNX-owned records and reference data. |
| Confidence Policy | Approved thresholds that determine automatic routing to review, never automatic business adjudication. |
| Review Decision | Human acceptance, correction, rejection, or escalation of an automation result. |
| Automation Action | A proposed downstream command, executed only through the owning bounded context after review/authorization. |

## 7. Core Business Rules

1. Every Automation Case belongs to exactly one Organization; it may additionally be scoped to one Hospital and one Claim where known.
2. Tenant isolation is enforced in storage, service, and API layers. An automation worker must never infer tenant scope from a frontend request.
3. Source Artefacts are immutable references. Retention/deletion follows the owning Document/Storage policy, not an AI-specific physical delete.
4. AI provider output is untrusted input. It must be schema validated and assessed by deterministic rules before use.
5. All AI model calls record provider, model identifier, prompt/template version, execution timestamp, and non-secret request/result references sufficient for audit.
6. Low confidence, conflicting extraction, missing tenant scope, or policy-sensitive content always creates or updates a human-review case.
7. An accepted automation suggestion invokes a command in the owning context—Claim, Workflow, Financial, or Hospital–Payer Integration—which performs its own authorization and aggregate validation.
8. Automation must not bypass optimistic concurrency, append-only history, audit columns, or approval requirements in existing modules.
9. Credentials are held only as opaque references to an approved secret manager; prompt logs and error logs must not contain credentials or raw sensitive payloads.
10. AI results must never alter Financial Posting records, which remain append-only and require their approved Financial commands.

## 8. Initial Operational Flows

### 8.1 Claim document intake

1. A tenant-scoped source document is uploaded or referenced.
2. Automation identifies document class and extracts candidate values.
3. Deterministic validation checks Organization, Hospital, Claim, payer, and reference-data scope.
4. The system creates an Automation Case with a review state.
5. A permitted operations user accepts, corrects, rejects, or escalates it.
6. Any accepted action is submitted through the owning aggregate and is recorded with the reviewer identity.

### 8.2 Payer response intake

1. An approved email/API/RPA integration produces a non-secret source reference.
2. Automation classifies the response and proposes a payer decision/query/update.
3. A confidence and policy check determines review routing.
4. The reviewer may submit the resulting Claim command; the Claim Aggregate validates the lifecycle transition.

### 8.3 Follow-up automation

1. A deterministic rule identifies a Claim awaiting payer response or required document.
2. Automation proposes a follow-up action and creates a Workflow work item through the Workflow Platform.
3. Claim Operations performs or approves the follow-up. No email/portal action occurs without an approved integration route and policy.

## 9. Integration Boundaries

| Existing Context | Phase 10 relationship |
|---|---|
| Claim Processing | Owns Claim lifecycle, authorization, queries, submission intent, and final transition validation. |
| Workflow Platform | Owns queues, work items, assignments, SLA, and operational task state. |
| Hospital–Payer Integration | Owns approved hospital-specific payer routing and non-secret credential references. |
| Insurance Foundation | Owns platform partners, contacts, product plans, and tenant enablements. |
| Financial Management | Owns remittance, settlement, recovery, bank matching, and immutable postings. |
| Document/Storage capability | Owns binary content and retention; Automation stores only immutable source references. |
| IAM / Organization Members | Owns users, permissions, and tenant membership. |

## 10. Security, Privacy, and Compliance Requirements

- Only the minimum necessary content is sent to an external AI provider.
- Provider access uses server-side credentials from the secret manager; no frontend or business-table secret storage is permitted.
- The system must support a configurable provider/model allow-list and a tenant-level disable switch in a later configuration design.
- Automation audit records must be tenant-scoped, immutable where needed, and searchable by source reference, Claim, outcome, reviewer, and execution time.
- Inputs and outputs are classified as sensitive operational data. Logs record structured metadata, not raw PHI or payer credentials.
- Manual review is mandatory for any AI-proposed payer decision, claim transition, clinical interpretation, financial amount, or external communication action.

## 11. Non-Functional Requirements

- **Reliability:** retry-safe processing with idempotency keys; duplicate source events cannot create duplicate actions.
- **Performance:** asynchronous processing; Claim and Workflow API requests must not wait for a long-running model call.
- **Observability:** correlation ID across ingestion, model request, validation, review, and downstream command.
- **Explainability:** every suggestion shows source provenance, confidence, validation failures, and model/template version.
- **Cost control:** per-tenant/provider usage metrics and configurable size/token limits.
- **Extensibility:** provider adapter interface supports Gemini initially and alternative providers later without domain changes.

## 12. Phase 10 Delivery Boundary

Phase 10 foundation will initially enable:

- Document/message classification.
- Structured extraction candidates.
- Deterministic validation and human-review routing.
- Claim/Workflow action suggestions, not autonomous execution.
- Provider-adapter foundation and auditable execution records.

Email sending, RPA browser execution, autonomous claim adjudication, fraud scoring, and BI model analytics remain separate later capabilities unless approved as a new business requirement.

## 12.1 Enhanced Approved AI and Automation Capabilities

The following capabilities are approved as part of the Phase 10 business scope. They remain advisory or human-controlled unless a later approved rule explicitly authorizes an automated action.

### Medical Document Intelligence

- The platform may process approved claim-related documents using OCR and named-entity extraction.
- It may propose structured extraction candidates, such as patient identifiers, admission and discharge dates, diagnosis and procedure codes, invoice totals, policy details, and payer reference numbers.
- Every extracted field must retain its source artefact reference and a field-level confidence score.
- Extraction output is a candidate for review; it must not directly overwrite business-owned Claim, Financial, or Insurance data.

### Claim Readiness Scoring

- The platform may produce an advisory readiness score from 0 to 100 for ICA and PRE_POST claims.
- The score may consider document completeness, required attachments, tariff or package consistency, diagnosis/procedure consistency, payer-specific trends, and known submission requirements.
- A readiness score is decision support only. It does not approve, reject, submit, or change a Claim lifecycle state.

### Disallowance, Short-Payment, and Denial Insights

- The platform may analyse approved Financial deductions, remittances, settlements, and Claim history to identify probable disallowance, short-payment, or denial reasons.
- It may recommend follow-up actions and prepare an appeal or clarification draft for human review.
- Financial Management remains the sole owner of financial facts, settlement decisions, deductions, recoveries, and postings.

### Payer Portal and RPA Dispatch

- An approved Claim Submission Intent may cause the platform to enqueue a payer-routing or RPA dispatch task.
- Dispatch lifecycle states are `DISPATCH_QUEUED`, `DISPATCH_IN_PROGRESS`, `DISPATCH_COMPLETED`, and `DISPATCH_FAILED`.
- A verified external outcome may request an approved Claim command; it must never directly mutate Claim lifecycle data.
- Credentials, passwords, tokens, and portal secrets are never stored in this bounded context. The task may contain only an approved opaque secret reference held by the configured external secret-management boundary.

### Human-in-the-Loop Review and Override

- Human review is mandatory for material extraction, recommendation, and external-dispatch outcomes unless a later approved business policy says otherwise.
- The platform must retain the original AI candidate, confidence, final accepted or rejected value, reviewing actor, timestamp, and a reason when an override is supplied.

## 12.2 Product Scope and Isolation

| Claim product | Phase 10 operational scope |
|---|---|
| `ICA` | Active document intelligence, advisory scoring, insight generation, and controlled dispatch support. ICA is the Cashless and Pre-Authorization pathway. |
| `PRE_POST` | Active document intelligence, advisory scoring, insight generation, and controlled dispatch support. |
| `PARTNER_PROCESSING` | Document parsing and evidence organisation only. Operational recommendations and state automation remain guarded. |
| `KYP` | Document parsing and evidence organisation only. Operational recommendations and state automation remain guarded. |

Product context must be explicit in every automation request, result, audit event, and downstream command request. This prevents workflow logic from leaking between products.

## 12.3 Approved Asynchronous Integration Intent

Phase 10 will use explicit, auditable asynchronous work requests. The following event-to-intent mapping is approved for later design; it does not yet prescribe a database or implementation mechanism.

| Upstream business event | Phase 10 automation intent |
|---|---|
| `DocumentUploaded` | `InitiateDocumentExtractionJob` |
| `ClaimReadyForReviewRequested` | `ExecuteClaimReadinessScoringJob` |
| `RemittanceDeductionRecorded` | `GenerateDisallowanceAnalysisJob` |
| `ClaimSubmissionRequested` | `EnqueueRPADispatchTask` |

All intents must carry Organization, Hospital, Claim Product, source-record reference, correlation reference, and initiating actor context. Each automated inference or request must record the model or prompt version, sanitized input provenance, result confidence, and outcome for auditability.

## 13. Acceptance Criteria for Moving to Domain Analysis

- Business ownership boundaries above are accepted.
- Human review requirement is accepted for sensitive business actions.
- AI output is formally classified as a candidate, not a business fact.
- Scope is limited to AI-assisted document/message processing and workflow suggestions.
- No database schema, migration, or implementation begins before approval.

## 14. Approval Gate

**Objective:** approve the Phase 10 business boundary.

**Why:** domain analysis must not invent autonomous AI powers or cross existing bounded-context ownership.

**File path:** `docs/architecture/automation/ai-automation-business-understanding.md`

**Action:** review this business understanding and approve it unchanged, or provide a business correction.

**Validation:** this document contains no physical database or code design.

**Pause for approval:** after approval, proceed to **AI & Automation Domain Analysis**.
