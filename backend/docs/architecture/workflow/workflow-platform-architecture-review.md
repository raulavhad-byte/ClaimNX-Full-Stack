# ClaimNX Workflow Platform — Architecture Review

| Field | Value |
|---|---|
| Module | Workflow Platform |
| Phase | Phase 6 — Workflow Platform |
| Version | 1.0 |
| Status | Approved — 2026-07-30 |
| Prerequisites | Business Understanding, Domain Analysis, Aggregate Design, and Logical ERD approved 2026-07-30 |
| Date | 2026-07-30 |

## Objective

Review the approved Workflow Platform business and logical architecture before
workflow planning, physical database design, SQL migrations, or source code
begins. The review identifies whether the design is safe to implement inside
the ClaimNX modular monolith.

## Review decision

**Recommendation: approve with the mandatory implementation controls in this
document.**

The Workflow Platform is appropriately modeled as a shared bounded context.
Its aggregate separation protects operational performance and preserves the
ownership boundaries of Tenant Management, IAM, Hospital, and future Claim
Processing.

## Architecture alignment

| Review area | Result | Evidence / decision |
|---|---|---|
| Modular monolith | Pass | Workflow remains a module in the NestJS application with explicit application/service boundaries. |
| DDD ownership | Pass | Workflow coordinates work; it does not own Claim, User, Role, Organization, or Hospital data. |
| Clean Architecture | Pass | Domain aggregates remain independent from NestJS, Supabase, and transport details. |
| Aggregate boundaries | Pass | Definition, Instance, Queue, and Work Item have separate consistency boundaries. |
| Tenant isolation | Pass with control | Organization-owned roots carry tenant context; every query and mutation must scope `organization_id`. |
| IAM separation | Pass with control | IAM supplies actor identity and permission decisions; Workflow must never store a duplicate role or permission model. |
| Audit / compliance | Pass | Standard audit plus append-only operational history is required. |
| Concurrency | Pass with control | Every mutable root uses its own expected version; cross-root work is coordinated explicitly. |
| Scalability | Pass | Work Items are independent of Workflow Instance locking; queues do not own task collections. |
| Future integration | Pass | External Subject Reference prevents Claim/Insurance field duplication. |
| Legacy compatibility | Pending physical evidence | Existing legacy workflow relations must be inspected before physical design. |

## Approved component responsibilities

```text
API Layer
  Authenticated actor + route organization + request validation
        ↓
Application Layer
  Tenant membership gate + IAM permission decision + use-case coordination
        ↓
Domain Layer
  Definition graph / Instance transition / Work Item / Queue invariants
        ↓
Repository Layer
  Tenant-scoped persistence and expected-version mutation
        ↓
PostgreSQL
  Constraints, audit, soft delete, indexes, and history persistence
```

No layer may bypass a lower responsibility:

- the controller cannot decide valid state transitions;
- the repository cannot silently bypass tenant scope;
- the domain cannot call Supabase or inspect HTTP/JWT objects;
- a database constraint cannot replace application-level authorization.

## Aggregate consistency review

### Workflow Definition

The Definition owns its state graph. State and Transition creation, update, or
retirement must be validated and persisted as a single Definition transaction.
An Instance records the Definition/version from which it was started so later
Definition changes do not rewrite historical meaning.

### Workflow Instance

The Instance owns its own state and external-subject reference. It must not
contain a mutable collection of all Work Items; that would turn normal task
assignment into high-contention parent updates.

### Workflow Queue

Queue lifecycle is independent from Work Item mutation. Retiring a Queue must
not cause a cascade delete or hidden reassignment. An explicit application use
case is required to redistribute open work.

### Work Item

Work Item is the operational concurrency boundary. Assignment, reassignment,
priority, due-time, SLA, and task lifecycle changes require a Work Item expected
version. A Work Item may reference an Instance, Queue, and Organization Member,
but cannot modify those roots directly.

## Security and tenant-isolation review

### Mandatory controls

1. The Organization identifier is taken from the API route and validated as a
   UUID. It is never accepted as a body field.
2. The actor identifier is taken from the verified JWT only.
3. Every Organization-owned repository read filters by `organization_id`.
4. Every mutation includes both `organization_id` and `expected_version` in its
   predicate or transaction command.
5. Application use cases validate active Organization Membership before any
   Workflow action.
6. IAM permission evaluation occurs before a command executes. The specific
   Workflow permission catalogue will be approved during API Design.
7. Assignment/reassignment validates the target Organization Member is active,
   non-deleted, and belongs to the same Organization.
8. History reads are tenant scoped through their owning Instance or Work Item.

### Security decisions

- Direct frontend-to-database Workflow writes are prohibited.
- Service-role database credentials remain backend-only.
- An External Subject Reference is opaque; it must not leak subject data from
  another tenant in a workflow response.
- Soft-retired queues, instances, work items, and assignments are excluded from
  normal operational lists.

## Audit and compliance review

| Requirement | Approved control |
|---|---|
| Who changed an entity | `created_by`, `updated_by`, `deleted_by`; history event actor. |
| When it changed | Standard timestamps plus event occurred-at time. |
| What operational change occurred | Append-only Instance/Work Item History Event. |
| Why it changed | Optional controlled reason/comment captured where the use case requires it. |
| History correction | New compensating event; no normal history edit/delete. |
| Record removal | Soft delete of mutable business records; no normal physical delete. |

## Performance and operational review

- Operational list queries must be tenant-scoped, paginated, and ordered by
  operational fields such as due time, priority, state, queue, or assignee.
- The future index strategy must begin from approved reads: tenant worklist,
  queue worklist, personal worklist, overdue work, and Instance timeline.
- Work Item history may grow rapidly. It must be indexed and queried by owning
  root; it should not be eagerly loaded for every worklist row.
- Definitions are read frequently but change infrequently; a later cache is
  permissible only after correctness and invalidation rules are defined.
- Database-level history/event records should be inserted in the same
  transaction as the change they explain.

## Cross-context integration review

| Integration | Approved interaction | Prohibited interaction |
|---|---|---|
| Tenant Management | Validate Organization and active membership | Change Organization Member status from Workflow. |
| IAM | Receive identity and permission decision | Persist role/permission copies in Workflow tables. |
| Claim Processing | Start/progress workflow through explicit command/event contract | Let Workflow adjudicate or alter Claim fields directly. |
| Hospital | Use identifier/context only when a use case needs it | Embed Hospital aggregate data into Workflow. |
| Notifications | Emit a future event/request | Send e-mail/SMS directly from domain logic. |
| Reporting | Expose controlled read data/events | Let reporting mutate operational state. |

## Legacy database compatibility control

Previous database inspection indicated `workflow_instances` and
`workflow_queues` may already exist. Before any physical schema decision, the
preflight must establish:

1. actual columns, types, defaults, constraints, indexes, and record counts;
2. all inbound and outbound foreign keys;
3. active/retired data quality and audit readiness;
4. whether the current records represent a reusable foundation or a legacy
   compatibility surface;
5. a forward-only evolution/compatibility strategy.

No legacy Workflow relation is approved for drop, rename, or data migration
until this evidence is reviewed.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Workflow becomes a hidden Claim domain | External Subject remains opaque; Claim transitions use explicit integration contracts. |
| Cross-tenant data exposure | Route/JWT tenant boundary plus repository predicates and database constraints. |
| High task-update contention | Work Item is a separate aggregate from Workflow Instance. |
| Definition change changes active process meaning | Instance stores Definition/version reference; no silent graph migration. |
| Assignment to inactive member | Validate current active membership at assignment time. |
| Unbounded history slows worklists | Keep history append-only and owner-scoped; do not eager-load it. |
| Queue retirement loses work | Prohibit cascade; require explicit reassignment policy. |
| Existing workflow tables break migration | Run legacy preflight before physical design; evolve forward only. |

## Mandatory next-stage inputs

The Workflow and Implementation Plan must explicitly include:

- Definition administration workflow;
- Instance start and transition workflow;
- Work Item creation, assignment, reassignment, and completion workflow;
- Queue lifecycle and queue retirement/reassignment policy;
- SLA due/breach/pause workflow;
- history recording policy;
- tenant-isolation and stale-version test scenarios;
- legacy database preflight before physical database design.

## Validation

- The architecture preserves the approved business, domain, aggregate, and ERD
  decisions.
- No physical schema, migration, REST API, or source code has been created.
- The identified legacy compatibility risk is explicitly gated before Physical
  Database Design.
- The implementation controls are sufficient for the modular monolith phase.

## Approval record

Approved on 2026-07-30. The Workflow Platform implementation controls,
security model, aggregate consistency boundaries, legacy compatibility gate,
and future-integration rules are accepted.

Next mandatory stage: **Workflow Platform Workflow and Implementation Plan**.
