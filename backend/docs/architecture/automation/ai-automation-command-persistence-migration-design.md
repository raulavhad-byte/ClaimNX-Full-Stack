# ClaimNX Phase 10 — AI & Automation Command Persistence Migration Design

| Attribute | Value |
|---|---|
| Module | AI & Automation |
| Phase | 10 — AI & Automation |
| Status | Draft for approval |
| Depends on | Approved Phase 10 physical schema, reference-data catalogue, domain layer, and repository layer |
| Target migration | `src/database/migrations/20260802100300_create_ai_automation_command_functions.sql` |

---

## 1. Objective

Define the first reviewed PostgreSQL write boundary for Phase 10. The migration will add atomic command functions for durable automation requests, review decisions, and payer-dispatch lifecycle actions.

## 2. Why

Automation is allowed to request, analyse, and route work. It must not directly mutate Claim, Financial, Insurance, Workflow, or document-owner records. Database command functions create one enforceable boundary for tenant scope, active IAM actors, reference data, optimistic concurrency, idempotency, append-only attempts, and safe audit records.

## 3. File Path and Action

**File path:** `src/database/migrations/20260802100300_create_ai_automation_command_functions.sql`

**Action:** Create the migration locally only after this design is approved. Do not apply it until the SQL Architecture Review has also been approved.

## 4. Command Scope

| Command | Transactional responsibility | Key safeguards |
|---|---|---|
| `create_automation_work_request` | Creates one durable, idempotent automation request. | Active actor; Organization/Hospital/Claim scope; active purpose/status; source + idempotency uniqueness; no secret payload. |
| `start_automation_work_request` | Changes a durable request to `IN_PROGRESS`. | Tenant-scoped request; expected request version; product strategy remains enforced in application layer. |
| `record_automation_job_attempt` | Atomically appends one terminal immutable attempt and changes request status. | Expected version; approved safe provider/model/policy metadata only. |
| `create_automation_review_case` | Creates a review case owned by the automation context. | Same Organization/Hospital/Claim scope as work request; active review type/status. |
| `record_automation_review_decision` | Appends a human review decision and increments case version. | Active actor; expected case version; correction/override requires reason; original candidates remain immutable. |
| `create_automation_owner_command_request` | Persists a safe, idempotent request to an owner context. | No owner-table mutation; target context/type allow-list; safe payload policy; human review prerequisite where required. |
| `create_payer_dispatch_task` | Creates a durable, idempotent dispatch task in `DISPATCH_QUEUED`. | ICA/PRE_POST strategy checked in application layer; active Hospital–Payer route and submission intent; opaque secret reference only. |
| `create_payer_dispatch_task` | Creates a durable, idempotent dispatch task in the approved queued status. | ICA/PRE_POST strategy checked in application layer; active Hospital-Payer route and submission intent; opaque secret reference only. |

## 5. Required Command Guards

Every function must enforce the following inside its transaction:

1. `actor_user_id` resolves to an active, non-deleted `public.users` record.
2. Claim-related data is filtered by both `organization_id` and `hospital_id`; the Hospital belongs to that Organization.
3. The referenced Claim, Work Request, Review Case, Integration Route, and Submission Intent are active and belong to the supplied tenant scope.
4. All controlled references are active, global `reference_values` in the expected category.
5. Business UUIDs are supplied by the NestJS application layer. The migration must not add database-generated business UUIDs.
6. Mutable roots use atomic `WHERE id = ... AND version = expected_version` updates and return `NULL` when stale, inactive, deleted, or outside the tenant.
7. The caller maps a `NULL` mutation result to a safe `404`, `403`, or `409` response only after application-layer scope evaluation.
8. Append-only records (`automation_job_attempt`, extraction candidates, inference results, review decisions, dispatch attempts, dispatch verifications, audit entries) are inserted only. No update or delete function is created.
9. Every command writes complete audit values and starts inserted record versions at `1`.

## 6. Idempotency and Concurrency

| Aggregate | Idempotency key | Concurrency rule |
|---|---|---|
| Automation Work Request | `(organization_id, source_record_type, source_record_id, work_purpose_reference_value_id, idempotency_key)` | New request returns existing active request identifier when the same key is re-issued. |
| Owner Command Request | `(organization_id, target_context, idempotency_key)` | Duplicate request returns existing identifier; it never duplicates a downstream owner action. |
| Payer Dispatch Task | `(organization_id, claim_id, idempotency_key)` | Duplicate create returns existing task identifier; every state change requires `expected_version`. |
| Job attempt | Sequential child attempt number | The terminal attempt and root status/version change in one transaction. A start event changes only the mutable root, because attempts are append-only. |
| Review Case | Explicit case identifier | Every decision requires the current case `expected_version` and inserts next sequence atomically. |

## 7. Payer Dispatch Boundary

- `credential_secret_reference` is an opaque reference only. Command parameters, audit data, error messages, and database comments must not accept/store a password, token, cookie, portal session, or credential payload.
- The dispatch completion command may record a verified external reference and sanitized outcome summary only.
- Successful verification can create an `automation_owner_command_request`; it must never update `public.claims` directly.
- Actual email/API/RPA execution is deferred to the approved Infrastructure Adapter layer and is disabled by default until the separate dispatch go-live approval.

## 8. Product Isolation

- The database persists the approved Claim Product reference context.
- NestJS `AutomationProductStrategyFactory` is the single policy point: ICA and PRE_POST enable approved operations; PARTNER_PROCESSING and KYP permit document extraction only.
- Database functions must not replicate product-specific workflow rules; they only reject missing/inactive reference scope and preserve immutable tenant context.

## 9. Validation After Migration

The post-migration validation script must verify:

- All command function signatures exist.
- All functions enforce Organization/Hospital and active actor scope.
- Duplicate idempotency requests return one safe root identifier.
- Stale versions return no mutation result.
- Only one active job/dispatch attempt can exist per root.
- Append-only tables still reject update/delete.
- Review decisions preserve sequence and require override/correction reason.
- Dispatch completion cannot directly alter a Claim.
- No secret-like data is accepted in credential or audit fields.

## 10. Pause for Approval

Approve **AI & Automation Command Persistence Migration Design** to proceed to the SQL Architecture Review. No database function will be created or applied before that approval.
