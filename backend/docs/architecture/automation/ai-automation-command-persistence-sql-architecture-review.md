# ClaimNX Phase 10 - AI and Automation Command Persistence SQL Architecture Review

| Attribute | Value |
|---|---|
| Module | AI and Automation |
| Phase | 10 |
| Status | Draft for approval |
| Depends on | Approved command-persistence migration design |
| Target migration | `src/database/migrations/20260802100300_create_ai_automation_command_functions.sql` |

---

## 1. Objective

Review the planned Phase 10 command-persistence migration before any PostgreSQL function is written or applied. The review confirms command ownership, transaction boundaries, security guardrails, and the validation contract for Supabase.

## 2. Why

Phase 10 can receive untrusted external data and can request payer dispatch. A database write boundary is required so an API defect, a retry, or a future adapter cannot cross tenant scope, alter a Claim directly, duplicate dispatch, or store secret material.

## 3. File Path, File Name, and Action

**File path:** `src/database/migrations/20260802100300_create_ai_automation_command_functions.sql`

**File name:** `20260802100300_create_ai_automation_command_functions.sql`

**Action:** The migration will be created only after this review is approved. It must then receive a separate post-migration validation run before the NestJS application layer begins.

## 4. Review Results

| Review area | Result | Required implementation evidence |
|---|---|---|
| Command ownership | Approved | Functions write only Phase 10 tables and never update Claim, Financial, Insurance, Workflow, or document-owner tables. |
| Identity | Approved | Every function accepts `p_actor_user_id` and verifies an active, non-deleted `public.users` record. |
| Tenant isolation | Approved | Every command verifies the active Organization, Hospital, Claim, route, and parent record in the supplied `(organization_id, hospital_id)` scope. |
| UUID strategy | Approved | Each create function receives an application-generated UUID. No business UUID is generated in PostgreSQL. |
| Optimistic concurrency | Approved | Each mutable root command accepts `p_expected_version` and uses one atomic `UPDATE ... WHERE version = p_expected_version ... RETURNING`. |
| Idempotency | Approved | Work requests, owner-command requests, and dispatch tasks use their approved active unique keys and return the existing root identifier for a repeat create. |
| Reference data | Approved | Every controlled reference is verified as active, global, non-deleted, and in its exact approved category. |
| Append-only integrity | Approved | Attempts, candidates, inference results, review decisions, dispatch verification, and automation audit entries are insert-only; no mutation functions will be supplied. |
| Review control | Approved | Correction and override decisions require a non-empty reason and atomically allocate the next decision sequence. |
| Payer dispatch boundary | Approved | Dispatch functions permit only opaque `credential_secret_reference`; they do not accept passwords, tokens, cookies, portal sessions, or raw external payloads. |
| Claim ownership | Approved | Completion may create an owner-command request only. It cannot alter `public.claims` or a Claim lifecycle state. |
| External side effects | Approved | Functions persist intent and safe outcome evidence only. Email, API, and RPA execution remain disabled until the Infrastructure Adapter/go-live approval. |

## 5. Required Function Contract

The migration must use `SECURITY INVOKER` behavior (the default) and schema-qualified references. Each function must:

1. Validate required identifiers and non-blank bounded text before a write.
2. Check the active IAM actor and the tenant scope before reading or mutating a root.
3. Validate all parent and controlled-reference ownership inside the same transaction.
4. Insert audit values (`created_by`, `created_at`, `updated_by`, `updated_at`, `version`) for every new mutable record.
5. Return the root UUID for an idempotent duplicate, or `NULL` for a stale/inactive/out-of-scope mutation.
6. Use `SET LOCAL` only where necessary; do not alter global database session settings.
7. Write sanitized summaries and reference identifiers only. Raw documents, prompts, model responses, payer emails, credentials, tokens, and payloads are prohibited.

## 6. Transaction Boundaries

| Command group | Required atomic work |
|---|---|
| Work request create | Scope and reference checks, idempotency lookup, request insert, sanitized audit insert. |
| Job attempt start/terminal record | Start changes only the mutable Work Request. Terminal recording atomically appends one immutable attempt, changes root status/version, and writes sanitized audit. |
| Review decision | Case version mutation, next sequence calculation, decision append, and audit insert. |
| Owner command request | Scope/reference checks, idempotency lookup, request insert, and audit insert; no downstream owner action. |
| Dispatch task create | Claim/route/submission-intent checks, idempotency lookup, queued task insert, and audit insert. |
| Dispatch delivery (future adapter command) | Task version/status mutation, immutable attempt or verification append, and audit insert. The current command migration only queues a dispatch task. |

## 7. SQL Safety Decisions

- PostgreSQL functions must not use dynamic SQL for table or column selection.
- No function may issue `DELETE`, physical cascade, or `TRUNCATE` against a Phase 10 business table.
- A secret reference is treated as opaque text: it must not be parsed, logged, echoed, or returned from a read DTO.
- Database errors must be generic and must not expose input content or external response content.
- Product-specific operational entitlement remains in `AutomationProductStrategyFactory`; SQL preserves product context but does not duplicate the product state machine.

## 8. Post-Migration Validation Design

Create the read-only companion file:

`docs/architecture/automation/ai-automation-command-persistence-post-migration-validation.sql`

It must verify that:

1. All approved function signatures exist.
2. Every mutation function has the required actor, tenant, and expected-version parameters.
3. The existing append-only triggers remain installed.
4. A duplicate idempotent create returns one active root identifier.
5. A stale root version returns no mutation result.
6. A cross-tenant command cannot mutate or read the root.
7. Correction and override decisions without a reason are rejected.
8. One request/task cannot have multiple active attempts.
9. Dispatch completion has no direct foreign-key or trigger path that mutates `public.claims`.
10. No function parameter, result, table comment, or audit column introduces plaintext credential storage.

## 9. Manual Supabase Application Procedure

After migration approval, the user will:

1. Open Supabase Dashboard -> SQL Editor -> New query.
2. Copy the entire committed migration from VS Code.
3. Confirm the target project and `postgres` role.
4. Run the script once and confirm `Success. No rows returned`.
5. Run the companion read-only validation query.
6. Stop and share the error if any result is not `true`; do not improvise a production fix in the SQL editor.

## 10. Pause for Approval

Approve **AI and Automation Command Persistence SQL Architecture Review** to create the reviewed migration and its validation script. No SQL function has been created or applied at this stage.
