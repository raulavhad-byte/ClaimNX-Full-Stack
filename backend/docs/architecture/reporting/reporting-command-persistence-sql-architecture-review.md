# ClaimNX Phase 11 — Reporting & BI Command Persistence SQL Architecture Review

## Document Information

| Field | Value |
|---|---|
| Module | Reporting & BI |
| Phase | 11 — Reporting & BI |
| Status | Draft — approval required |
| Purpose | Review the planned PostgreSQL command-persistence guardrails before writing migrations |

## Objective

Confirm that the Reporting & BI command functions preserve tenant isolation, auditability, soft-delete rules, reference-data integrity, and optimistic concurrency.

## Command Boundaries

The command-persistence migration will provide server-side PostgreSQL functions for:

- Report definition: create, update, activate/deactivate, and soft-delete.
- Report schedule: create, update, pause/resume, and soft-delete.
- Report execution: queue, start, complete, and fail.
- Report delivery: create a delivery request and record its terminal outcome.

Executions and delivery outcomes are operational evidence. They must not be rewritten after reaching a terminal state. The future migration will store only sanitized metadata and approved storage references; it will not store credentials, access tokens, or raw protected document content.

## Mandatory SQL Guards

1. Every command accepts `organization_id`, `actor_user_id`, and `expected_version` for mutable aggregates.
2. Every read and mutation filters by `organization_id`; a Hospital-scoped command also filters by `hospital_id`.
3. The actor must be an active ClaimNX IAM user and active Organization Member for the supplied tenant.
4. Reference-value identifiers must be active global values and belong to their expected Reporting category.
5. Mutable commands use atomic optimistic concurrency: `id`, tenant scope, `version`, and active/non-deleted predicates are checked in one statement.
6. A definition may be activated only when its required configuration is complete. A schedule may run only against an active definition.
7. Executions follow `QUEUED → RUNNING → COMPLETED | FAILED`; terminal executions cannot be restarted or overwritten.
8. Soft deletion records `deleted_by`, `deleted_at`, updates `updated_by`/`updated_at`, and increments `version`.

## Data Integrity and Performance Review

- Active business uniqueness will use partial unique indexes with `deleted_at IS NULL` and `is_deleted = FALSE`.
- Foreign keys use `RESTRICT` for owned definitions/schedules where historical executions or deliveries exist.
- Tenant-scoped indexes support report-definition lookup, schedule selection, queued execution polling, and delivery retrieval.
- All migrations will be transactional, additive, backward compatible, and followed by a read-only validation query.

## Approval Gate

No command-persistence migration is to be applied until this review is approved.

## Next Step

After approval, create the Reporting & BI PostgreSQL command-persistence migrations, then validate the stored procedures and constraints before proceeding to the application layer.
