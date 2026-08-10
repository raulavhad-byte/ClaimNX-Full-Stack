# ClaimNX Workflow Platform - Legacy Database Preflight Review

| Field | Value |
|---|---|
| Module | Workflow Platform |
| Phase | Phase 6 - Workflow Platform |
| Version | 1.0 |
| Status | Approved - 2026-07-30 |
| Input | Read-only Supabase inspection performed 2026-07-30 |
| Date | 2026-07-30 |

## Objective

Record the factual condition of the legacy Workflow database objects before
Physical Database Design begins. This review makes no schema or data change.

## Why this review was required

The approved Workflow Platform architecture uses Organization-scoped Workflow
Instances, Queues, Work Items, append-only history, and strict aggregate
boundaries. Existing `public.workflow_instances` and `public.workflow_queues`
were known to exist, and both could have dependent records. A physical design
could therefore not safely begin until their structure, data condition, and
dependencies were inspected.

## Source and action

| Item | Value |
|---|---|
| Read-only script | `docs/architecture/workflow/workflow-platform-legacy-preflight.sql` |
| Database action | Read-only metadata, dependency, constraint, index, and data-profile queries |
| Files changed by preflight | None in the database |
| Required decision | Evolve existing objects in place; no drop, rename, or replacement is approved |

## Findings

### 1. Existence

Both legacy objects exist:

- `public.workflow_instances`
- `public.workflow_queues`

### 2. Legacy Workflow Instance structure

`workflow_instances` contains a UUID primary key, globally unique
`instance_reference`, `workflow_definition_id`, `current_state_id`,
`hospital_id`, external `source_type` and `source_id`, status, priority,
open/close values, audit fields, soft-delete fields, and a version.

Important constraints and indexes observed:

- `chk_workflow_instances_status` permits legacy status values;
- foreign keys preserve links to `workflow_definitions`, `workflow_states`, and
  `hospitals`;
- a global unique constraint exists on `instance_reference`;
- legacy indexes exist for definition, hospital, source, and status lookup.

### 3. Legacy Workflow Queue structure

`workflow_queues` contains a UUID primary key, globally unique `code`, `name`,
legacy `type`, optional user/department/role/hospital scope columns, active
flag, audit fields, soft-delete fields, and a version.

Important constraints and indexes observed:

- `chk_workflow_queues_type` permits legacy queue types;
- foreign keys preserve links to `hospital_department`, `hospitals`, `roles`,
  and `users`;
- a global unique constraint exists on `code`;
- legacy indexes exist for active, hospital, role, and type lookup.

### 4. Tenant-scope gap

Neither legacy table contains `organization_id`.

- Instances use mandatory `hospital_id` as the legacy tenant-like scope.
- Queues use optional `scope_hospital_id` plus optional user, department, and
  role scopes.

This does not meet the approved Phase 6 Organization isolation requirement.
The Physical Database Design must introduce the approved Organization scope in
a backward-compatible way and must never trust legacy hospital-based filtering
alone.

### 5. Data and audit condition

The read-only profile returned zero records in both tables. Therefore:

- there is no Instance or Queue business data to transform;
- no missing legacy scope, audit, timestamp, version, or soft-delete mismatch
  exists in current rows;
- the legacy status distribution query is not required because there are no
  records to classify.

### 6. Dependency condition

The foreign-key inspection returned 17 relationships involving the two tables.
Notable inbound dependencies include Workflow attachments, comments,
escalations, history, notifications, and SLA records pointing to
`workflow_instances`; escalation rules reference `workflow_queues`.

The legacy tables also have outbound dependencies to Workflow definitions,
states, hospitals, departments, roles, and users.

## Architecture decision

The approved physical-design direction is:

1. preserve the existing `workflow_instances` and `workflow_queues` table
   identities and their existing primary keys;
2. preserve every existing inbound and outbound foreign-key relationship;
3. perform in-place, additive, backward-compatible evolution only;
4. replace legacy global uniqueness with Organization-scoped active uniqueness
   only through a reviewed migration that preserves compatibility;
5. add no physical deletion or cascade deletion behaviour;
6. assess every dependent legacy Workflow table before changing a referenced
   key, status model, or Queue lifecycle rule.

## Physical Database Design inputs

The next design must explicitly cover:

- Organization scope strategy for legacy Instances and Queues;
- compatibility of `hospital_id` and `scope_hospital_id` with Organization;
- preservation or controlled evolution of legacy global `instance_reference`
  and Queue `code` uniqueness;
- legacy statuses and queue types versus approved lifecycle values;
- compatibility of dependent attachments, comments, escalation, history,
  notification, and SLA tables;
- new Work Item and append-only history structures without breaking existing
  Workflow records;
- audit, soft-delete, version, foreign-key, and index evolution.

## Validation

- Both target legacy tables exist.
- Both target legacy tables currently contain zero rows.
- Constraints, indexes, and all identified foreign-key dependencies are
  recorded.
- No database table, record, constraint, index, function, or policy was
  changed during the preflight.
- Physical Database Design remains blocked until this review is approved.

## Approval record

Approved on 2026-07-30. The legacy Workflow database condition and the
in-place, backward-compatible evolution direction are accepted.

Next mandatory stage: **Workflow Platform Physical Database Design**.
