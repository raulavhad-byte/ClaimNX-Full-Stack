# ClaimNX Phase 11 — Reporting & BI Command Persistence Migration Design

## 1. Document Information

| Item | Value |
|---|---|
| Module | Reporting & BI |
| Phase | 11 — Reporting & BI |
| Status | Draft — approval required before SQL implementation |
| Database | PostgreSQL / Supabase |
| Architecture | DDD, Clean Architecture, Modular Monolith |
| Purpose | Define the database command boundary for Reporting & BI mutations |

## 2. Objective

Define the approved PostgreSQL command-persistence contract for Reporting & BI. The next migration will expose transaction-safe SQL functions for report-definition, schedule, execution, and delivery lifecycle commands.

## 3. Why

Reporting commands must preserve tenant isolation, auditability, controlled reference data, optimistic concurrency, and safe handling of healthcare reporting outputs. REST controllers and application services must never assemble ad-hoc write SQL.

## 4. Scope

This design covers:

- Report Definition lifecycle: draft, update, activate, retire, soft delete.
- Report Schedule lifecycle: create, update, pause, activate, retire, soft delete.
- Report Execution lifecycle: queue, start, complete, fail.
- Report Delivery lifecycle: queue and record terminal outcome.
- Tenant, hospital-scope, IAM, reference-data, audit, and concurrency guards.

This design does not cover report-query execution engines, BI semantic models, document rendering, email-provider integration, or storage of raw report results. Those remain application/infrastructure responsibilities.

## 5. Ownership and Persistence Boundaries

The Reporting bounded context owns report metadata and lifecycle state only.

- A Report Definition owns its schedules and execution intent.
- A Report Schedule owns when an approved definition may be executed.
- A Report Execution records one attempted run.
- A Report Delivery records delivery intent/outcome for one completed report output.
- Source-domain records remain owned by Hospital, Claim, Financial, Workflow, and Insurance contexts.

All reporting records are Organization-scoped. A hospital-scoped command must prove that the supplied Hospital belongs to the supplied Organization. Organization-wide reports use an explicit null hospital scope only where the approved physical design permits it.

## 6. Common Command Rules

Every mutating function in the implementation migration shall:

1. Receive `p_organization_id` and `p_actor_user_id`.
2. Verify the actor is an active ClaimNX IAM user and active Organization Member.
3. Verify any supplied `p_hospital_id` belongs to `p_organization_id` and is active.
4. Validate every reference value against its approved category, global/tenant scope, active state, and soft-delete state.
5. Populate `created_by`, `created_at`, `updated_by`, `updated_at`, `deleted_by`, `deleted_at`, and `version` according to ClaimNX standards.
6. Use UUIDs supplied by the application layer for new business entities.
7. Require `p_expected_version` for every mutable existing aggregate or child record.
8. Perform version comparison and mutation in the same SQL statement/transaction.
9. Return the affected UUID on success; return `NULL` for a stale, retired, inactive, missing, or cross-tenant target. The application layer converts that result into the appropriate 404, 403, or 409 response after an authorized read where needed.
10. Never accept or persist plaintext credentials, access tokens, raw report output, clinical attachments, or unbounded external payloads.

## 7. Approved Command Contracts

The physical migration shall use the exact table and column names approved in the Reporting & BI Physical Database Design. The following function names are the command API contract.

| Command function | Intent | Concurrency / guard |
|---|---|---|
| `create_report_definition` | Creates a tenant-scoped Draft report definition. | Active actor; approved report category, data source type, and output format. |
| `update_report_definition` | Updates mutable Draft definition metadata only. | Definition version and tenant scope. |
| `set_report_definition_status` | Activates or retires a definition. | Activation requires a complete, valid definition; retirement blocks future schedules/executions. |
| `soft_delete_report_definition` | Retires and soft deletes an unused definition. | No active schedule or non-terminal execution may depend on it. |
| `create_report_schedule` | Creates a schedule for an active Definition. | Valid schedule status and delivery channel; definition tenant scope. |
| `update_report_schedule` | Updates schedule timing/delivery metadata. | Schedule version; active definition. |
| `set_report_schedule_status` | Activates, pauses, or retires a schedule. | Schedule version and approved lifecycle state. |
| `soft_delete_report_schedule` | Retires and soft deletes a schedule. | Schedule version; no queued/running execution is orphaned. |
| `create_report_execution` | Creates a queued execution request. | Definition and optional schedule are active, tenant compatible, and valid. |
| `start_report_execution` | Marks a queued execution running. | Execution version; only `QUEUED → RUNNING`. |
| `complete_report_execution` | Records successful terminal execution metadata. | Execution version; only `RUNNING → COMPLETED`; output is an opaque approved reference/summary only. |
| `fail_report_execution` | Records a failed terminal execution with sanitized reason. | Execution version; only `QUEUED/RUNNING → FAILED`. |
| `create_report_delivery_request` | Queues Portal or Email delivery for a completed output. | Completed execution; approved delivery channel. |
| `record_report_delivery_outcome` | Records terminal delivery result. | Delivery version; only valid lifecycle transition. |

## 8. Lifecycle Rules

### 8.1 Report Definition

`DRAFT → ACTIVE → RETIRED`

- Only Draft definitions are editable.
- Activation requires all mandatory metadata and approved reference values.
- Retired definitions cannot create schedules or executions.
- A definition is never physically deleted in normal operations.

### 8.2 Report Schedule

`ACTIVE ↔ PAUSED → RETIRED`

- Only an active definition may have an active schedule.
- Retiring a schedule prevents new execution creation; historical executions remain immutable.

### 8.3 Report Execution

`QUEUED → RUNNING → COMPLETED | FAILED`

- Terminal executions are immutable except for controlled, additive audit metadata if specifically approved later.
- An execution records sanitized counts, timestamps, and an opaque output reference only.

### 8.4 Report Delivery

Delivery processing is independent of execution generation. An Email/Portal delivery request must never include a credential, email body containing protected content, or report bytes in the database command contract.

## 9. Reference Data Validation Matrix

| Field / lifecycle | Required reference category |
|---|---|
| Definition category | `REPORT_CATEGORY` |
| Definition source type | `REPORT_DATA_SOURCE_TYPE` |
| Definition output format | `REPORT_OUTPUT_FORMAT` |
| Definition lifecycle | `REPORT_STATUS` |
| Schedule lifecycle | `REPORT_SCHEDULE_STATUS` |
| Execution lifecycle | `REPORT_EXECUTION_STATUS` |
| Delivery channel | `REPORT_DELIVERY_CHANNEL` |
| Refresh outcome | `REPORT_REFRESH_STATUS` |

Only active, non-deleted approved values may be used. Global values are preferred; tenant-scoped extensions require an explicitly approved future change.

## 10. Mutation and Audit Strategy

- SQL functions must be `SECURITY INVOKER` unless an approved exception is documented.
- Related state changes and audit/event insertions occur in a single transaction.
- Append-only execution/delivery history is preferred over overwriting prior outcomes.
- The migration must add database-level checks/indexes only where required by approved business rules; application validation does not replace database integrity.
- `SELECT ... FOR UPDATE` may be used only inside command functions where it prevents a legitimate lifecycle race.

## 11. Failure Semantics

| Condition | Required outcome |
|---|---|
| Invalid request shape / invalid reference value | Application/API returns `400 Bad Request` |
| Actor has no active tenant membership | `403 Forbidden` |
| Authorized target does not exist or is retired | `404 Not Found` |
| Expected version is stale | `409 Conflict` |
| Illegal lifecycle transition | `409 Conflict` |
| Database constraint/invariant failure | Transaction rollback; no partial reporting state |

## 12. Migration Deliverables

After this document is approved, create the following immutable migration artifacts under `src/database/migrations/`:

1. `<timestamp>_create_reporting_command_persistence_functions.sql`
2. `<timestamp>_validate_reporting_command_persistence.sql`

The implementation migration will contain only additive, backward-compatible changes and the command functions above. The validation migration will assert function existence, reference-data guards, status-transition constraints, append-only safeguards, and tenant/composite foreign-key integrity.

## 13. Validation Plan

Before moving to the Reporting & BI Application Layer, verify:

- Every command function exists with the approved argument contract.
- Cross-organization and cross-hospital writes cannot succeed.
- Stale expected versions cannot mutate rows.
- Invalid reference values cannot be persisted.
- Draft/active/retired, schedule, execution, and delivery transitions obey their matrices.
- A terminal report execution cannot be rewritten through standard commands.
- Audit fields and `version` are correct after each successful mutation.
- No report result, credential, secret, or sensitive payload is persisted by command functions.

## 14. Approval Gate

**Action requested:** Approve this Reporting & BI Command Persistence Migration Design.

On approval, the next step is **Reporting & BI Command Persistence SQL Architecture Review**, followed by the PostgreSQL command-persistence migration implementation and validation.
