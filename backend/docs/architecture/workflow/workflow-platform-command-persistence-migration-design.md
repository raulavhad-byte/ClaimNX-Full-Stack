# ClaimNX Workflow Platform Command Persistence Migration Design

| Field | Value |
|---|---|
| Module | Workflow Platform |
| Phase | Phase 6 - Workflow Platform |
| Status | Approved - implementation in progress |
| Prerequisites | Phase 6 physical schema and integrity migrations validated |
| Purpose | Design transactional PostgreSQL commands required by approved Workflow write use cases |

## 1. Objective

Define the PostgreSQL command-function boundary required to implement the
already-approved Workflow Platform write workflows without bypassing aggregate
invariants, tenant isolation, audit, history, or optimistic concurrency.

No table is redesigned. This document adds only the command-persistence design
that was intentionally absent from the initial structural migrations.

## 2. Why this is required

The approved Workflow plan requires atomic multi-table operations. For example,
starting an Instance must create the Instance and its history event in one
transaction. A direct client-side sequence of inserts or updates could leave
partial data if any later step fails.

Each function is therefore the database transaction boundary. NestJS
repositories will invoke the functions; application services will validate
authorization, membership, and cross-context policy before calling them.

## 3. Ownership and security boundary

- NestJS obtains actor identity from the validated JWT.
- NestJS establishes active Organization membership before every tenant command.
- Every tenant command receives `p_organization_id` and `p_actor_user_id`.
- Functions scope every mutable row by the trusted Organization parameter.
- Functions do not authorize IAM permissions; IAM remains the owner of that decision.
- Functions never create, update, or delete Claim, Hospital, User, Role, or
  Organization Member records.
- UUIDs are supplied by the application layer; no database-generated business IDs.

## 4. Shared command rules

Every function must:

1. Use one database transaction.
2. Reject missing identifiers or invalid expected versions.
3. Require active, non-deleted root records for normal writes.
4. Set `created_by`, `updated_by`, and timestamps using `p_actor_user_id`.
5. Increment the owning aggregate `version` exactly once per successful mutation.
6. Append one immutable owner-scoped history event for every Instance or Work
   Item lifecycle mutation.
7. Return the affected root identifier, or `NULL` for stale/inaccessible rows.
8. Never physically delete a business record.

Application services map a `NULL` result to `409 Conflict` after confirming
that the accessible record exists; inaccessible records remain `404` or `403`
without leaking another tenant's information.

## 5. Function catalogue

### 5.1 Workflow Definition commands - platform scope

| Function | Objective | Primary writes |
|---|---|---|
| `create_workflow_definition` | Create a draft Definition, its States, and Transitions atomically. | `workflow_definitions`, `workflow_states`, `workflow_transitions` |
| `activate_workflow_definition` | Activate a complete Definition graph with expected version. | `workflow_definitions` |
| `retire_workflow_definition` | Retire a Definition with expected version; it cannot start new Instances. | `workflow_definitions` |

Required validations:

- Definition version, State codes, and Transition paths are valid.
- Exactly one active initial State exists before activation.
- Every Transition uses two States owned by the supplied Definition.
- No self-transition is permitted.
- Existing Instances are never rewritten when a Definition changes.

### 5.2 Workflow Instance commands - Organization scope

| Function | Objective | Primary writes |
|---|---|---|
| `start_workflow_instance` | Create an Instance at the approved initial State and append `INSTANCE_STARTED`. | `workflow_instances`, `workflow_history` |
| `transition_workflow_instance` | Change Instance State under expected version and append `STATE_TRANSITIONED`. | `workflow_instances`, `workflow_history` |
| `cancel_workflow_instance` | Cancel an active Instance under expected version and append `INSTANCE_CANCELLED`. | `workflow_instances`, `workflow_history` |

Required validations:

- Definition is active and has a valid initial State on start.
- Hospital, when supplied by the existing Instance schema, belongs to the same Organization.
- Definition and target State form an approved active Transition.
- Closed/cancelled/terminal Instances reject normal transitions.
- The external source reference is immutable after start.

### 5.3 Workflow Queue commands - Organization scope

| Function | Objective | Primary writes |
|---|---|---|
| `create_workflow_queue` | Create an Organization Queue at version 1. | `workflow_queues` |
| `update_workflow_queue` | Update permitted Queue attributes with expected version. | `workflow_queues` |
| `set_workflow_queue_status` | Activate or deactivate a Queue with expected version. | `workflow_queues` |
| `soft_delete_workflow_queue` | Retire a Queue only when no active Work Item references it. | `workflow_queues` |

Required validations:

- Queue code/name are unique in the Organization among active records.
- An inactive or retired Queue cannot receive a new Work Item assignment.
- Retiring a Queue fails if active Work Items still reference it.

### 5.4 Work Item and SLA commands - Organization scope

| Function | Objective | Primary writes |
|---|---|---|
| `create_work_item` | Create a Work Item, optional SLA marker, and `WORK_ITEM_CREATED` history. | `workflow_tasks`, `workflow_sla`, `workflow_task_history` |
| `assign_work_item` | Set Queue/direct member references under expected version and append `WORK_ITEM_ASSIGNED`. | `workflow_tasks`, `workflow_task_history` |
| `transition_work_item` | Change allowed Work Item status under expected version and append history. | `workflow_tasks`, `workflow_task_history` |
| `update_work_item_sla` | Update/pause/resume a single SLA marker under expected version and append history. | `workflow_sla`, `workflow_task_history` |
| `soft_delete_work_item` | Retire an allowed active Work Item with expected version and append history. | `workflow_tasks`, `workflow_task_history` |

Required validations:

- Work Item Organization equals the referenced Instance Organization.
- Queue, when supplied, is active and belongs to the same Organization.
- Direct assignee, when supplied, is an active Organization Member in the same Organization.
- Direct assignee is mirrored to legacy `assigned_to_user_id` only for compatibility.
- Completed or cancelled Work Items reject normal assignment/update actions.
- Only one active SLA marker exists for a Work Item.

## 6. Function parameter standard

All mutation functions use a consistent parameter order:

```text
p_<root_id>
p_organization_id                 -- tenant roots only
p_expected_version                -- updates/status/retire actions only
p_actor_user_id
p_<command-specific business values>
```

Create functions receive application-generated child/history UUIDs explicitly.
For structured creation, child payloads use `JSONB` arrays only where the
aggregate is created atomically as one command.

## 7. Migration sequence

The approved implementation sequence is:

1. `20260730133000_create_workflow_definition_functions.sql`
2. `20260730134000_create_workflow_instance_functions.sql`
3. `20260730135000_create_workflow_queue_functions.sql`
4. `20260730136000_create_work_item_functions.sql`
5. `20260730137000_validate_workflow_command_functions.sql` - read-only validation

Each migration is independently transactional, contains preconditions, and is
applied in this order. No migration drops, renames, or replaces a table.

## 8. Validation plan

Before proceeding to Workflow write use cases, validate:

- valid and invalid Definition graph creation;
- tenant-safe Instance creation and transition;
- stale Instance and Work Item version rejection;
- inactive/cross-tenant Queue and Organization Member rejection;
- Queue retirement protection while active Work Items reference it;
- atomic history append for every root mutation;
- SLA uniqueness and pause/resume behavior;
- no partial rows after intentionally failed commands.

## 9. Approval gate

Approval authorizes only the four command-function migration designs above.
It does not authorize REST APIs, controllers, or frontend work.

After approval, the next deliverable is:

**Workflow Definition Command Migration Script**.
