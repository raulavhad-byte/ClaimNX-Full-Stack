# ClaimNX Workflow Platform — Bounded Context and Aggregate Design

| Field | Value |
|---|---|
| Module | Workflow Platform |
| Phase | Phase 6 — Workflow Platform |
| Version | 1.0 |
| Status | Approved — 2026-07-30 |
| Prerequisites | Business Understanding and Domain Analysis approved 2026-07-30 |
| Date | 2026-07-30 |

## Objective

Define the Workflow Platform bounded-context boundary, aggregate roots,
ownership rules, invariants, and consistency boundaries before producing a
Logical ERD or physical database design.

## Bounded Context

### Workflow Platform

Workflow Platform is a shared operational-coordination bounded context. It
owns reusable process definitions, workflow state control, operational work,
queues, assignment responsibility, SLA markers, and append-only workflow
history.

It does **not** own the Claim, Patient, Policy, Hospital, User, Role,
Permission, or Organization data that it references.

## Context map

```text
IAM ── authenticated actor / permission decision ───────┐
Tenant Management ── organization / active membership ──┼──> Workflow Platform
Hospital ── optional operational context ───────────────┤
Claim Processing ── external subject / command result ──┤
Insurance Foundation ── external subject context ───────┘

Workflow Platform ── operational events / read data ──> Reporting, Notifications, AI (future)
```

All incoming identifiers are references. An incoming context remains the
authoritative owner of its own lifecycle and business meaning.

## Aggregate summary

| Aggregate Root | Scope | Owns | Does not own |
|---|---|---|---|
| Workflow Definition | Platform | States, Transitions, Definition lifecycle | Tenant work, queues, Claims, Users |
| Workflow Instance | Organization | Current instance state, external-subject reference, Instance history | Work Item lifecycle, Queue lifecycle, business subject data |
| Workflow Queue | Organization | Queue identity, availability/lifecycle, routing metadata | Queue work items, Users, Organization Members |
| Work Item | Organization | Work lifecycle, current queue reference, current direct assignment, priority, SLA marker, Work Item history | Workflow Definition, Instance state, Organization Member lifecycle |

## Aggregate 1 — Workflow Definition

### Aggregate root

`WorkflowDefinition`

### Child entities

- `WorkflowState`
- `WorkflowTransition`

### Purpose

Provide a versioned, platform-governed model that determines which instance
states exist and which transitions are valid.

### Invariants enforced inside the aggregate

1. Definition code is stable and unique in its platform scope.
2. A Definition cannot be activated without at least one State.
3. Exactly one active initial State exists in a Definition.
4. Every Transition references two States owned by the same Definition.
5. A Transition cannot have identical source and target State unless an
   explicit self-transition business requirement is approved later.
6. A retired Definition cannot be changed or start new Instances.
7. Existing Instances retain the Definition/version they started from;
   Definition evolution cannot silently alter historical operational truth.

### Consistency boundary

Definition State and Transition changes are atomic with the Definition. A
single aggregate update validates its complete state graph before persistence.

## Aggregate 2 — Workflow Instance

### Aggregate root

`WorkflowInstance`

### Child entities

- `WorkflowInstanceHistoryEvent` (append-only)

### Value objects / references

- `ExternalSubjectReference` — subject context/type plus identifier only
- `WorkflowDefinitionReference` — definition identifier and version snapshot
- `CurrentWorkflowStateReference`

### Purpose

Represent one Organization-scoped execution of an approved Definition for one
externally owned business record.

### Invariants enforced inside the aggregate

1. Instance Organization is immutable.
2. External Subject Reference is immutable after start. Corrections require an
   explicitly approved cancellation/restart workflow rather than relinking.
3. Instance Definition reference and current State must be compatible.
4. Instance state changes use only an approved Definition Transition.
5. A terminal Instance cannot transition unless that Definition explicitly
   exposes a permitted reopening transition.
6. Every lifecycle action increments the Instance version and appends one
   Instance History Event.
7. The Instance never writes to its External Subject.

### Important boundary decision

`WorkItem` is not a child entity of `WorkflowInstance`. A busy Instance can
have many independently assigned, SLA-managed Work Items. Making all of them
children would create unnecessary contention and require every task update to
lock the parent Instance.

Work Items reference the Instance; they do not mutate the Instance directly.
An application-level workflow policy coordinates any business rule that needs
both aggregate states to change.

## Aggregate 3 — Workflow Queue

### Aggregate root

`WorkflowQueue`

### Child entities

None in the first Phase 6 release.

### Purpose

Represent an Organization-scoped operational destination for Work Items.

### Invariants enforced inside the aggregate

1. Queue belongs to exactly one Organization.
2. Active Queue code is unique within its Organization.
3. An inactive or retired Queue cannot receive a new assignment.
4. Retiring a Queue does not delete Work Items or silently change current work
   ownership; an explicit reassignment policy is required.
5. Queue lifecycle changes use audit and optimistic concurrency.

### Important boundary decision

A Queue does not own its Work Items. Workload is a query/read concern. Work
Items retain the queue reference and are updated under their own aggregate
boundary.

## Aggregate 4 — Work Item

### Aggregate root

`WorkItem`

### Child entities

- `WorkItemHistoryEvent` (append-only)

### Value objects / references

- `CurrentAssignment` — optional Queue reference and optional direct
  Organization Member reference
- `SlaMarker` — due-at, breach-at, pause state, and timing reason
- `Priority`

### Purpose

Represent the independently executable operational work assigned to a Queue
and/or Organization Member within a Workflow Instance.

### Invariants enforced inside the aggregate

1. Work Item Organization must equal its Workflow Instance Organization.
2. Work Item Instance reference is immutable.
3. A Queue reference, when present, must belong to the same Organization and
   be active when newly assigned.
4. A direct assignee, when present, must be an active Organization Member in
   the same Organization at assignment time.
5. There is at most one current direct assignee.
6. Completed or cancelled Work Items reject normal update/assignment actions.
7. Work lifecycle transition must be permitted by the approved Work Item
   lifecycle policy for the parent Definition.
8. Assignment, queue, priority, SLA, and lifecycle mutations increment version
   and append a Work Item History Event.
9. A Work Item may be queue-only, direct-member-only, or both. It cannot be
   left without either when its operational state requires a responsible owner;
   the exact mandatory-assignment state policy is defined with the Definition.

## History ownership and audit decision

There is no independent, mutable `WorkflowHistory` aggregate.

Each history event is created only through its owning Instance or Work Item
aggregate in the same business transaction as the change it explains. Events
are append-only and do not support normal update/delete operations.

A future unified workflow-timeline read model may combine both event streams,
but it will not change ownership of historical truth.

## Cross-aggregate rules

| Rule | Enforcement location |
|---|---|
| Definition must exist and be active before Instance starts | Application service + Definition read contract |
| Instance State must belong to Definition | Workflow Instance aggregate |
| Work Item and Instance must share Organization | Application service before Work Item creation; repository tenant scope |
| Queue and Work Item must share Organization | Work Item aggregate/application validation |
| Assignee must be active Organization Member | Application service calls Tenant Management access contract |
| A task completion may affect Instance progression | Explicit application policy / future domain event; never hidden child mutation |
| IAM permission required for an operation | API/application boundary; IAM remains owner |

## Concurrency strategy

Each mutable root has its own `version`:

- Workflow Definition version controls Definition graph changes.
- Workflow Instance version controls Instance lifecycle transitions.
- Workflow Queue version controls Queue lifecycle changes.
- Work Item version controls task lifecycle, assignment, priority, and SLA
  updates.

There is no shared version across roots. Cross-aggregate operations validate
each expected version explicitly and reject stale writes.

## Tenant isolation strategy

- Workflow Definition is platform governed and is not tenant-owned.
- Workflow Instance, Workflow Queue, and Work Item each carry
  `organization_id`.
- Child history inherits tenant context from the owning root; it does not become
  an independent tenant authority.
- Repositories always scope Organization-owned roots by `organization_id`.
- APIs obtain Organization from the route and actor from JWT; they never trust
  Organization identifiers supplied in request payloads.

## Deliberate non-decisions

The following are intentionally deferred until a business need exists:

- Multiple concurrent direct assignees.
- Queue membership/skills matrices.
- Delegation, out-of-office substitution, and escalation chains.
- Definition version migration for in-flight Instances.
- Notification delivery mechanics.
- Claim-specific state/transition definitions.
- Workflow access-scope table integration.

## Validation

- Every domain concept has one clear owner.
- Aggregates do not cross Tenant, IAM, Hospital, Claim, or Insurance ownership
  boundaries.
- High-concurrency Work Item operations do not require locking an Instance.
- Tenant isolation, history, soft deletion, audit, and optimistic concurrency
  are explicit.
- No Logical ERD, SQL, database migration, API, or source code has been
  created.

## Approval record

Approved on 2026-07-30. The Workflow Platform context boundary, aggregate
roots, ownership model, consistency boundaries, and cross-aggregate rules are
accepted.

Next mandatory stage: **Workflow Platform Logical ERD**.
