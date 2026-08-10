# ClaimNX Workflow Platform - Workflow and Implementation Plan

| Field | Value |
|---|---|
| Module | Workflow Platform |
| Phase | Phase 6 - Workflow Platform |
| Version | 1.0 |
| Status | Approved - 2026-07-30 |
| Prerequisites | Business Understanding, Domain Analysis, Aggregate Design, Logical ERD, and Architecture Review approved 2026-07-30 |
| Date | 2026-07-30 |

## Objective

Define the approved operational workflows and the mandatory implementation
sequence for the Workflow Platform. This document turns the approved domain
model into buildable behaviour without defining physical tables, SQL, REST
endpoints, or source code.

## Workflow 1 - Administer a Workflow Definition

```text
Authorized platform administrator
  -> authenticate and authorize
  -> create or load a Workflow Definition
  -> define its States and allowed Transitions as one aggregate change
  -> validate unique state codes and transition endpoints belong to the Definition
  -> validate the directed graph has an approved start state
  -> save Definition at version 1, with audit actor
  -> activate only after complete graph validation
  -> retain its version for every future Instance
```

Rules:

- Workflow Definition administration is platform-governed, not tenant-owned.
- A Definition change must not silently alter an active Workflow Instance.
- Published/active Definition versions are immutable to running Instances.
- Definition retirement is allowed only after a future impact review; it must
  never cascade-delete Instances.

## Workflow 2 - Start a Workflow Instance

```text
Authorized organization actor or approved system integration
  -> authenticate actor and resolve organization from trusted context
  -> authorize start action for the selected Definition
  -> load active, approved Definition version
  -> validate External Subject Reference only (do not mutate its owner)
  -> create tenant-scoped Workflow Instance at initial State, version 1
  -> append Instance Started history event in the same transaction
  -> create initial Work Item(s), where Definition policy requires them
  -> return Instance and its current state
```

Rules:

- The External Subject Reference contains a subject type and identifier; it is
  not a foreign key to a Claim, Patient, Policy, or other domain-owned record.
- Organization scope is mandatory on every Instance query and mutation.
- Starting the same business process twice requires a future, explicit
  idempotency/business-key policy. It is not assumed by this foundation.

## Workflow 3 - Transition a Workflow Instance

```text
Authorized organization actor
  -> resolve organization from trusted context
  -> load active Instance within the organization
  -> verify expected Instance version
  -> load the pinned Definition/version and current State
  -> validate requested Transition is allowed from current State
  -> atomically update current State and increment version
  -> append immutable State Transitioned history event
  -> create, complete, or cancel Work Items only when the approved
     Definition policy requires it
  -> return the new Instance version and state
```

Rules:

- An application service coordinates Instance and Work Item aggregates; child
  aggregates must not directly mutate one another.
- A stale version, inactive/retired Instance, invalid Transition, or tenant
  mismatch must produce no partial write.
- Instance completion/cancellation does not physically delete its history.

## Workflow 4 - Create and Assign a Work Item

```text
Authorized organization actor or Workflow application service
  -> resolve organization from trusted context
  -> verify active parent Instance in the organization
  -> create Work Item at version 1 with an allowed initial status
  -> optionally select an active Queue in the same organization
  -> optionally directly assign one active Organization Member in the same organization
  -> calculate initial SLA marker when the policy supplies one
  -> append Work Item Created and Assignment history events
  -> return Work Item
```

Rules:

- Work Item is an independent aggregate, not a child entity of Workflow
  Instance.
- A Work Item may have one direct current assignee. Multi-assignee,
  delegation, and skill routing are out of scope for the foundation.
- Queue and direct assignee are independently optional only when an approved
  work-allocation policy allows it.
- Assignment validation reads Organization Member/IAM data but does not own or
  update it.

## Workflow 5 - Reassign, Complete, or Cancel a Work Item

```text
Authorized organization actor
  -> load active Work Item in trusted organization scope
  -> verify expected Work Item version
  -> validate target Queue and/or Organization Member are active and tenant-matched
  -> apply reassignment or permitted status transition atomically
  -> increment Work Item version and update audit metadata
  -> append an immutable history event with reason/action context
  -> return updated Work Item
```

Rules:

- Completion and cancellation require a valid Work Item status transition.
- Reassignment, queue change, and direct-assignee change are always auditable.
- A completed/cancelled item cannot be changed unless a future approved reopen
  policy explicitly permits it.

## Workflow 6 - Manage a Workflow Queue

```text
Authorized organization administrator
  -> resolve organization from trusted context
  -> create or update an organization-scoped Queue with expected version
  -> activate/deactivate Queue under approved lifecycle rules
  -> before retirement, identify every active Work Item using the Queue
  -> explicitly reassign each affected Work Item to a replacement Queue/member
     or an approved unassigned state
  -> retire Queue only when it owns no active Work Item assignment
  -> preserve Queue history and audit record
```

Rules:

- Queue retirement must never cascade to Work Items.
- Retired/inactive Queues cannot receive new assignments.
- Queue membership, capacity, skills, and auto-routing are future capabilities,
  not part of this implementation.

## Workflow 7 - Apply SLA Due, Pause, Resume, and Breach Behaviour

```text
Work Item is created or its approved SLA policy changes
  -> calculate due timestamp from the approved policy
  -> persist current SLA marker as Work Item-owned state
  -> append due-date/SLA history event

Authorized action pauses work
  -> validate a pause is allowed for current Work Item status
  -> record pause start and reason; do not lose original due context
  -> append SLA Paused history event

Authorized action resumes work
  -> calculate revised due timestamp under the approved policy
  -> update SLA marker with optimistic concurrency
  -> append SLA Resumed history event

Scheduled future evaluator
  -> find due active Work Items within tenant-safe processing batches
  -> mark breach once when due threshold is crossed
  -> append SLA Breached history event
```

Rules:

- The foundation stores SLA state and history; scheduled processing and
  notification delivery are future implementation stages unless separately
  approved.
- A breach event is idempotent: one current breach must not generate repeated
  duplicate history records.
- Calendar/business-hours calculation requires a later approved policy and is
  not inferred here.

## Workflow 8 - Read Worklists and History

```text
Authorized organization actor
  -> resolve organization from route and JWT context
  -> authorize the requested worklist/history operation
  -> query tenant-scoped Instances, Work Items, and Queues
  -> filter active data and approved status/assignment criteria
  -> return paged worklist summary
  -> load append-only history only when explicitly requested
```

Rules:

- Every repository query must include organization scope for tenant data.
- Worklists must not eager-load unbounded history.
- History is append-only and cannot be updated or deleted by normal APIs.

## Cross-cutting execution controls

| Control | Required behaviour |
|---|---|
| Authentication | Actor identity is obtained only from validated Supabase JWT context. |
| Authorization | IAM permission plus active Organization Membership is required for tenant operations. |
| Tenant isolation | Route organization ID, trusted actor context, application validation, repository predicates, and SQL functions must agree. |
| Audit | All business writes include created/updated/deleted actor and timestamps; business actions append owner-scoped history events. |
| Optimistic concurrency | Every mutation supplies the owning aggregate expected version and increments it atomically. |
| Soft delete | Standard retirement uses soft deletion only; no normal physical deletes. |
| UUIDs | Application layer generates all business entity UUIDs. |
| Error policy | Unauthorized tenant access is 403; invalid request/rule is 400; stale version/conflict is 409; absent accessible record is 404. |

## Legacy database preflight gate

Before the Physical Database Design stage, complete a read-only inspection of
the existing `public.workflow_instances` and `public.workflow_queues` tables,
if present. The inspection must establish:

1. table columns, data types, defaults, constraints, and indexes;
2. record counts and active/soft-deleted data quality;
3. inbound and outbound foreign-key dependencies;
4. audit and tenant-scope readiness;
5. whether each table can be evolved in place or requires an approved
   compatibility path.

No existing Workflow table may be dropped, renamed, or overwritten based only
on this plan.

## Mandatory implementation sequence

```text
1. Approve this Workflow and Implementation Plan
2. Read-only legacy Workflow database preflight
3. Workflow Platform Physical Database Design
4. SQL Architecture Review
5. PostgreSQL migration scripts
6. Migration validation and compatibility verification
7. Domain layer
8. Repository layer
9. Application layer
10. API DTOs, controllers, validation, and authorization
11. Unit, integration, negative, concurrency, and tenant-isolation testing
12. Frontend worklists and administration UI (future phase)
```

## Validation plan

The implementation tests must cover at minimum:

- valid and invalid Definition state transitions;
- Instance creation with a tenant-safe external subject reference;
- transition rejection on stale Instance version;
- Work Item assignment rejection for an inactive or cross-tenant member;
- Queue retirement rejection while active Work Items remain assigned;
- Work Item stale-version rejection;
- SLA pause/resume/breach idempotency behaviours;
- history append-only behaviour;
- tenant-isolation rejection for every tenant-scoped read and mutation;
- legacy migration compatibility checks before and after migration.

## Approval record

Approved on 2026-07-30. The operational workflows, build sequence, testing
expectations, and legacy-compatibility gate are accepted.

Next mandatory step: **read-only legacy Workflow database preflight**.
Physical Database Design must not begin before its results are reviewed.
