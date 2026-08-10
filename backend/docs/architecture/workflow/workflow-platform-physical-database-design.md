# ClaimNX Workflow Platform - Physical Database Design

| Field | Value |
|---|---|
| Module | Workflow Platform |
| Phase | Phase 6 - Workflow Platform |
| Version | 1.0 |
| Status | Approved - 2026-07-30 |
| Prerequisites | Architecture, workflow plan, and legacy preflight approved 2026-07-30 |
| Evidence | 14 legacy Workflow tables, 33 foreign keys, zero records in every Workflow table |
| Date | 2026-07-30 |

## Objective

Define a production PostgreSQL design for the approved Workflow Platform
aggregates. This is a physical design specification only; it contains no
executable migration SQL.

## Approved compatibility direction

All existing Workflow tables are empty, so business-record conversion is not
needed. Yet 33 foreign keys connect the Workflow family. No existing Workflow
table, primary key, or foreign-key relationship may be dropped, renamed, or
replaced. The Phase 6 strategy is additive, backward-compatible evolution.

## Physical mapping

| Approved model | Physical table | Decision |
|---|---|---|
| Workflow Definition | `workflow_definitions` | Evolve in place. |
| Workflow State | `workflow_states` | Evolve in place. |
| Workflow Transition | `workflow_transitions` | Evolve in place. |
| Workflow Instance | `workflow_instances` | Evolve in place. |
| Workflow Queue | `workflow_queues` | Evolve in place. |
| Work Item | `workflow_tasks` | Existing Task becomes approved Work Item storage. |
| Current Assignment | `workflow_tasks` fields | Work Item-owned current assignment. |
| SLA Marker | `workflow_sla` | One Work Item-owned physical SLA marker. |
| Instance History Event | `workflow_history` | Evolve as immutable Instance history. |
| Work Item History Event | `workflow_task_history` | New append-only table. |

`workflow_assignments`, `workflow_attachments`, `workflow_comments`,
`workflow_escalation_rules`, `workflow_escalations`, and
`workflow_notifications` remain legacy compatibility tables. They receive no
new core Workflow write ownership in this phase.

## Common database standards

All business tables use application-generated UUIDs and contain:

```text
created_by, created_at
updated_by, updated_at
deleted_by, deleted_at
version
```

Audit actors reference `public.users(id)` with `ON DELETE RESTRICT`. Version
starts at `1` and must be `>= 1`. Normal retirement is soft delete only.

Definitions, States, and Transitions are platform-governed and have no
`organization_id`. Instances, Queues, Work Items, SLA Markers, and both history
tables require non-null `organization_id` referencing `public.organizations(id)`.

Tenant-owned parent tables expose a unique `(organization_id, id)` key. Their
tenant-owned children use composite foreign keys where required, preventing
cross-Organization Queue, Task, SLA, or history references.

## Core aggregate physical specifications

### 1. Workflow Definition - `workflow_definitions`

| Column/group | Rule |
|---|---|
| `id` | Existing UUID primary key; retained. |
| `code`, `name`, `description` | Platform business identifier, name, and optional description. |
| `definition_version` | Required integer `>= 1`; pinned by running Instances. |
| `status`, `allows_reopen` | Existing lifecycle controls. |
| audit, soft delete, `version` | Standard fields; nullable legacy audit actors remediated before `NOT NULL`. |

`code` is unique among active Definitions. A new Definition version cannot
silently alter a running Instance.

### 2. Workflow State - `workflow_states`

| Column/group | Rule |
|---|---|
| `id`, `workflow_definition_id` | Existing PK and parent Definition FK. |
| `code`, `name` | Unique within the active parent Definition. |
| `display_order` | Required positive integer. |
| `sla_target_minutes` | Optional; positive when present. |
| `default_queue_id` | Legacy compatibility only; no new Phase 6 writes. |
| `is_initial`, `is_terminal`, audit, soft delete, `version` | Initial and terminal child controls plus standard fields. |

`default_queue_id` remains nullable because a platform Definition cannot own
an Organization Queue.

Exactly one active `is_initial = true` State is required before a Definition
may be activated. The physical enforcement uses an active partial unique index;
the activation command verifies that one initial State exists.

### Design correction record

On 2026-07-30, implementation review identified that the approved aggregate
invariant already required an initial State but the original structural
migration omitted the physical `is_initial` column. This is a required,
backward-compatible completion of the approved design, not a redesign.

### 3. Workflow Transition - `workflow_transitions`

| Column/group | Rule |
|---|---|
| `id`, `workflow_definition_id` | Existing PK and owning Definition. |
| `from_state_id`, `to_state_id` | Required endpoints in the same Definition. |
| `requires_comment`, `approval_required` | Existing controlled transition rules. |
| `approval_mode`, `approval_levels`, `restricted_to_role_id` | Legacy compatibility only; no unapproved new behaviour. |
| audit, soft delete, `version` | Standard fields. |

Active uniqueness is `(workflow_definition_id, from_state_id, to_state_id)`.
Definition/State composite keys keep both endpoints inside the Definition.

### 4. Workflow Instance - `workflow_instances`

| Column/group | Rule |
|---|---|
| `id` | Existing UUID primary key retained. |
| `organization_id` | New authoritative tenant scope. |
| `instance_reference` | Active unique within Organization. |
| `workflow_definition_id`, `workflow_definition_version` | Definition and new pinned version (`>= 1`). |
| `hospital_id` | Legacy Hospital context; must belong to Instance Organization. |
| `source_type`, `source_id` | External Subject Reference only; no cross-domain ownership. |
| `current_state_id` | State belonging to selected Definition. |
| `status`, `priority`, `opened_at`, `closed_at`, `closure_reason` | Retained compatibility values. |
| audit, soft delete, `version` | Root standard. |

Required active indexes: Organization/state/status and Organization/external
subject (`source_type`, `source_id`). Global Instance-reference uniqueness is
retired only after its Organization-scoped replacement passes validation.

### 5. Workflow Queue - `workflow_queues`

| Column/group | Rule |
|---|---|
| `id`, `organization_id` | Existing PK plus new authoritative tenant scope. |
| `code`, `name` | Unique among active Queues in one Organization. |
| `type` | Legacy controlled category. |
| `scope_hospital_id` | Optional legacy Hospital context; tenant-matched when set. |
| `scope_department_id`, `scope_role_id`, `scope_user_id` | Legacy scopes; no new core writes. |
| `is_active`, audit, soft delete, `version` | Lifecycle and standard fields. |

Queue retirement is blocked while an active Work Item references it. No Queue
foreign key may cascade-delete a Work Item.

### 6. Work Item - `workflow_tasks`

| Column/group | Rule |
|---|---|
| `id`, `organization_id` | Existing PK plus new authoritative tenant scope. |
| `workflow_instance_id` | Same-Organization parent Instance. |
| `workflow_state_id` | Optional State context. |
| `type`, `title`, `description` | Existing Work Item content. |
| `queue_id` | Optional same-Organization current Queue. |
| `assigned_organization_member_id` | New direct assignment; active member in same Organization. |
| `assigned_to_user_id` | Legacy compatibility mirror only. |
| `status`, `priority`, `due_at` | Work lifecycle and due context. |
| audit, soft delete, `version` | Work Item standard. |

Current Queue and direct Organization Member are owned by the Work Item.
`workflow_assignments` cannot become a second current-assignment source.
Indexes support Organization/status, Queue/status, assignee/status, and due
timestamp worklists.

### 7. SLA Marker - `workflow_sla`

| Column/group | Rule |
|---|---|
| `id`, `organization_id` | Existing PK plus new tenant scope. |
| `workflow_instance_id`, `workflow_task_id` | Required same-Organization parents. |
| `target_minutes` | Required positive integer. |
| `started_at`, `due_at`, `resolved_at`, `is_overdue` | Existing SLA timing and breach fields. |
| `paused_at`, `paused_reason` | New optional pause context. |
| audit, soft delete, `version` | Added standard fields. |

One active SLA Marker may exist for an active Work Item. Breach and
pause/resume actions also append Work Item history events.

### 8. Instance History - `workflow_history`

| Column/group | Rule |
|---|---|
| `id`, `organization_id`, `workflow_instance_id` | Existing PK plus new same-Organization ownership. |
| `event_type`, `description` | Required immutable event classification and summary. |
| `event_payload` | New optional JSONB structured context. |
| `performed_by_user_id`, `occurred_at` | Event actor and business-event time. |
| audit, soft delete, `version` | Standard fields, recorded at creation. |

Normal update/delete operations are prohibited. Index by
`(organization_id, workflow_instance_id, occurred_at)`.

### 9. Work Item History - `workflow_task_history` (new)

| Column/group | Rule |
|---|---|
| `workflow_task_history_id` | Application-generated UUID primary key. |
| `organization_id`, `workflow_task_id` | Required same-Organization owner reference. |
| `event_type` | Required `VARCHAR(100)` event type. |
| `event_payload`, `description` | Optional structured context and required summary. |
| `occurred_by`, `occurred_at` | Actor and business-event time. |
| audit, soft delete, `version` | Immutable history fields; version remains `1`. |

The table has a composite same-Organization foreign key to `workflow_tasks`.
Index it by `(organization_id, workflow_task_id, occurred_at)`.

## Legacy compatibility rules

- Existing attachments and comments remain Instance-linked records.
- Existing escalation rules, escalations, and notifications remain untouched.
- `workflow_states.default_queue_id`, `workflow_transitions.restricted_to_role_id`,
  and `workflow_tasks.assigned_to_user_id` are compatibility fields only.
- New Phase 6 writes use Organization-safe fields and do not duplicate
  ownership in legacy tables.

## Foreign keys, uniqueness, and indexes

- New foreign keys use `ON DELETE RESTRICT`; cascade deletion is prohibited.
- Definition/State graph integrity uses Definition-scoped composite keys.
- Active unique rules: Definition code; State code/name per Definition;
  Transition triplet per Definition; Instance reference per Organization; Queue
  code/name per Organization; one active SLA Marker per Work Item.
- Existing global unique Instance-reference and Queue-code indexes are removed
  only after validated active, Organization-scoped replacement indexes exist.

## Migration strategy - design only

The later migration must:

1. assert all 14 Workflow tables and all 33 foreign keys exist;
2. add Organization and compatibility columns as nullable additive changes;
3. derive Organization scope from Hospital context and stop if it cannot be resolved;
4. remediate audit fields and validate versions/soft delete flags;
5. add composite compatibility keys and foreign keys;
6. add `workflow_task_history`;
7. create approved partial indexes and active uniqueness;
8. validate replacement indexes before retiring any legacy global unique index;
9. include post-migration verification queries and comments.

No migration SQL is approved by this document.

## Validation requirements

- All 14 legacy tables and all 33 foreign keys remain present.
- No existing primary key or required foreign key is broken.
- Every tenant-owned core record has valid Organization scope.
- A Work Item cannot reference a Queue, Instance, SLA Marker, or Organization
  Member in a different Organization.
- Definition/State boundaries, audit, version, and soft-delete uniqueness hold.
- Queue retirement cannot orphan active Work Items.
- Instance and Work Item histories are append-only.

## Approval record

Approved on 2026-07-30. The backward-compatible physical design, Organization
isolation model, aggregate ownership mapping, and validation requirements are
accepted.

Next mandatory stage: **Workflow Platform SQL Architecture Review**. No
migration script may be written before that review is approved.
