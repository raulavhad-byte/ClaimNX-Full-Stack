# ClaimNX Phase 10 — AI & Automation Reference-Data Catalogue

| Attribute | Value |
|---|---|
| Module | AI & Automation |
| Phase | 10 — AI & Automation |
| Status | Approved |
| Owner | Reference Data bounded context |
| Scope | Global classifications used by Phase 10 tables and commands |

---

## 1. Objective

Define controlled global Reference Data required by the approved AI & Automation physical design. These values classify automation work and dispatch operations; they do not contain secrets, provider-specific credentials, or medical content.

## 2. Ownership and Rules

- Reference Data owns categories and values; AI & Automation only references their UUIDs.
- All values below are global (`organization_id IS NULL`), active, and non-deleted when used.
- Codes are immutable uppercase `SNAKE_CASE` identifiers.
- Display names may be refined without changing the code.
- Deactivation is a governed change: active operational records retain the historical UUID, but new operations may not select a deactivated value.
- No status value itself grants authorization. IAM permissions and tenant membership remain mandatory.

## 3. Required Categories and Values

### 3.1 `AUTOMATION_WORK_PURPOSE`

| Code | Display name | Intended use |
|---|---|---|
| `DOCUMENT_EXTRACTION` | Document Extraction | Extract structured candidates from an authorized document source. |
| `CLAIM_READINESS_SCORING` | Claim Readiness Scoring | Produce advisory readiness/risk score for ICA or PRE_POST. |
| `DISALLOWANCE_ANALYSIS` | Disallowance Analysis | Produce advisory deduction/disallowance insight. |
| `PAYER_DISPATCH` | Payer Dispatch | Request controlled delivery through approved channel infrastructure. |
| `RESPONSE_CLASSIFICATION` | Response Classification | Classify an authorized inbound payer response into safe candidate facts. |

### 3.2 `AUTOMATION_WORK_STATUS`

| Code | Display name | Meaning |
|---|---|---|
| `QUEUED` | Queued | Accepted and waiting for an eligible executor. |
| `IN_PROGRESS` | In Progress | Actively being processed. |
| `REVIEW_REQUIRED` | Review Required | Human decision is required before an owner command may proceed. |
| `COMPLETED` | Completed | Completed with retained outputs or verified result. |
| `FAILED` | Failed | Processing failed; retry policy and error classification apply. |
| `CANCELLED` | Cancelled | Cancelled without a completed owner action. |

### 3.3 `AUTOMATION_JOB_STATUS`

| Code | Display name | Meaning |
|---|---|---|
| `STARTED` | Started | Attempt began. |
| `SUCCEEDED` | Succeeded | Attempt produced valid, retained result(s). |
| `FAILED` | Failed | Attempt failed. |
| `TIMED_OUT` | Timed Out | Attempt exceeded its approved execution limit. |
| `RETRY_SCHEDULED` | Retry Scheduled | A later retry is authorized. |
| `CANCELLED` | Cancelled | Attempt stopped without success. |

### 3.4 `AUTOMATION_REVIEW_TYPE`

| Code | Display name | Meaning |
|---|---|---|
| `LOW_CONFIDENCE_EXTRACTION` | Low Confidence Extraction | Extracted value requires validation. |
| `READINESS_EXCEPTION` | Readiness Exception | Readiness recommendation needs authorized review. |
| `DISALLOWANCE_EXCEPTION` | Disallowance Exception | Advisory disallowance insight needs review. |
| `DISPATCH_EXCEPTION` | Dispatch Exception | Delivery failure or ambiguous verification needs review. |
| `INBOUND_RESPONSE_EXCEPTION` | Inbound Response Exception | Inbound response classification needs review. |

### 3.5 `AUTOMATION_REVIEW_STATUS`

| Code | Display name | Meaning |
|---|---|---|
| `OPEN` | Open | Awaiting authorized reviewer action. |
| `IN_REVIEW` | In Review | Assigned/being reviewed. |
| `APPROVED` | Approved | Accepted for creation of an owner-command request where applicable. |
| `REJECTED` | Rejected | Rejected; no owner command is created from this decision. |
| `CANCELLED` | Cancelled | No longer actionable. |

### 3.6 `AUTOMATION_INFERENCE_TYPE`

| Code | Display name | Meaning |
|---|---|---|
| `DOCUMENT_FIELD_EXTRACTION` | Document Field Extraction | Structured field candidates from document source. |
| `CLAIM_READINESS_SCORE` | Claim Readiness Score | Advisory readiness score and reasons. |
| `DISALLOWANCE_INSIGHT` | Disallowance Insight | Advisory avoidance/recovery insight. |
| `PAYER_RESPONSE_CLASSIFICATION` | Payer Response Classification | Safe classification of an authorized inbound response. |

### 3.7 `AUTOMATION_OWNER_COMMAND_STATUS`

| Code | Display name | Meaning |
|---|---|---|
| `PENDING` | Pending | Awaiting owner bounded-context handling. |
| `ACCEPTED` | Accepted | Owner accepted command for processing. |
| `COMPLETED` | Completed | Owner completed its own command. |
| `REJECTED` | Rejected | Owner rejected command under its own rules. |
| `FAILED` | Failed | Owner command failed after acceptance. |
| `CANCELLED` | Cancelled | Command cancelled before completion. |

### 3.8 `AUTOMATION_DISPATCH_CHANNEL`

| Code | Display name | Meaning |
|---|---|---|
| `EMAIL` | Email | Approved email delivery adapter. |
| `RPA_PORTAL` | RPA Portal | Approved portal automation adapter. |
| `API` | API | Approved payer API adapter. |

The selected channel must also match the active Hospital–Payer Integration configuration. This catalogue does not replace that integration configuration.

### 3.9 `AUTOMATION_DISPATCH_STATUS`

| Code | Display name | Meaning |
|---|---|---|
| `QUEUED` | Queued | Dispatch request accepted and durable. |
| `IN_PROGRESS` | In Progress | Adapter has started external delivery. |
| `COMPLETED` | Completed | Delivery has a verified safe result. |
| `FAILED` | Failed | Delivery failed; safe failure context retained. |
| `REVIEW_REQUIRED` | Review Required | Result is ambiguous or requires human decision. |
| `CANCELLED` | Cancelled | Dispatch cancelled before verified completion. |

### 3.10 `AUTOMATION_VERIFICATION_STATUS`

| Code | Display name | Meaning |
|---|---|---|
| `PENDING` | Pending | Verification not yet complete. |
| `VERIFIED` | Verified | Delivery/result verification completed. |
| `NOT_VERIFIED` | Not Verified | Delivery/result could not be verified. |
| `REVIEW_REQUIRED` | Review Required | Evidence requires human review. |

## 4. Product Activation Matrix

| Capability | ICA | PRE_POST | PARTNER_PROCESSING | KYP |
|---|---:|---:|---:|---:|
| Document extraction | Enabled | Enabled | Parse/evidence only | Parse/evidence only |
| Readiness scoring | Enabled | Enabled | Guarded | Guarded |
| Disallowance insight | Enabled | Enabled | Guarded | Guarded |
| Payer dispatch | Enabled only after separate go-live approval | Enabled only after separate go-live approval | Guarded | Guarded |

This matrix is enforced in the Claim Product strategy and application layer, not by Reference Data alone.

## 5. Data Integrity Requirements

The migration must ensure that every category exists before its values are inserted. A post-migration validation query must confirm the exact active value count and required code set for each category.

Reference values are selected by UUID in persisted Phase 10 tables. Commands may accept a code only when an application service resolves it to an active, global UUID under the approved category.

## 6. Migration Intent

The future catalogue migration will be additive and idempotent for development recovery. It will:

1. create missing categories through the existing Reference Data convention;
2. insert missing global active values by category code and value code;
3. never overwrite a user-managed display name or deactivated historical value; and
4. fail validation if an active required category/value is absent after seeding.

## 7. Approval Gate

**Decision:** Approved. Proceed to author Phase 10 PostgreSQL migration scripts; execution remains a separate approval gate.
