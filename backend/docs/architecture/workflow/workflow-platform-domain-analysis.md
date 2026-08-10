# ClaimNX Workflow Platform — Domain Analysis

| Field | Value |
|---|---|
| Module | Workflow Platform |
| Phase | Phase 6 — Workflow Platform |
| Version | 1.0 |
| Status | Approved — 2026-07-30 |
| Prerequisite | Workflow Platform Business Understanding approved 2026-07-30 |
| Date | 2026-07-30 |

## Objective

Translate the approved Workflow Platform business understanding into a shared
domain language, domain responsibilities, core concepts, lifecycle invariants,
and cross-context interaction rules. This document deliberately does not yet
approve aggregates, ERD, SQL, API contracts, or implementation.

## Why

Workflow capability will be reused by multiple future ClaimNX bounded contexts.
The domain must therefore be precise enough to prevent future modules from
creating incompatible task, queue, assignment, or status models.

## Domain responsibility

The Workflow Platform coordinates operational work. It decides whether a
workflow state change, task assignment, queue placement, or SLA lifecycle
action is valid. It does not decide the business outcome of a Claim,
Pre-authorization, Document, Settlement, or Insurance policy.

## Ubiquitous language

| Term | Domain meaning | Not the same as |
|---|---|---|
| Workflow Definition | Approved reusable process model, including states and transitions. | A specific tenant's work. |
| Workflow State | Named approved stage in a Definition. | A free-text status. |
| Workflow Transition | Permitted directed movement between two States. | Any arbitrary status update. |
| Workflow Instance | Organization-scoped execution of a Definition for one external business record. | The business record itself. |
| Work Item | Unit of operational responsibility within an Instance. | A user account or an IAM permission. |
| Queue | Organization-scoped pool through which Work Items are distributed. | A message broker topic. |
| Assignment | Current work responsibility to an active Organization Member. | IAM role assignment. |
| SLA Policy | Approved target timing rule applied to operational work. | A guarantee of a business outcome. |
| SLA Marker | Calculated due/breach position of an Instance or Work Item. | A timer that changes business data directly. |
| Workflow History Event | Append-only explanation of a business workflow action. | Standard row audit columns. |
| External Subject | A reference to a record owned by another bounded context. | A duplicated Claim or Patient model. |

## Core domain concepts

### Workflow Definition

A platform-governed template that establishes the valid operational language
for a process. A Definition has a lifecycle and can only be used to start new
Instances when approved and active.

It conceptually contains:

- a stable business code and display name;
- a set of Workflow States;
- a set of permitted Workflow Transitions;
- policy defaults, such as intended SLA behaviour;
- a versioned lifecycle.

### Workflow Instance

An Organization-owned execution of one approved Workflow Definition. It stores
the current Workflow State and a reference to exactly one External Subject.

The subject reference needs a context/type and an identifier, for example a
future Claim Processing Claim. The Workflow Platform must treat that reference
as opaque and must never copy the subject's domain data.

### Work Item

An operational activity within a Workflow Instance. The initial Phase 6 domain
uses a Work Item as the unit that queues, assigns, progresses, and becomes
overdue. An Instance may contain one or more Work Items.

### Queue and Assignment

A Queue is an Organization-owned distribution point. Assignment identifies the
one current responsible Organization Member, if direct responsibility is
required. A Work Item may be queue-only, member-assigned, or both. A direct
assignee must be an active member of the same Organization.

### Workflow History Event

History captures business intent not represented by standard audit columns:

- instance started;
- work item created;
- state transitioned;
- queue changed;
- assignment or reassignment occurred;
- priority or due time changed;
- SLA breached, paused, or resumed;
- work item completed, cancelled, or reopened when permitted.

History is append-only. Corrective actions create a new event; they never
rewrite prior history.

## Domain invariants

1. A Workflow Definition must contain at least one State before it can be
   activated for new Instances.
2. An Instance can start only from an approved initial State of an active
   Definition.
3. An Instance has exactly one Organization and exactly one External Subject
   reference.
4. A Workflow State change must follow a Transition approved by the Instance's
   Definition.
5. An Instance cannot use a State from another Definition.
6. A Work Item cannot belong to an Instance in another Organization.
7. A Queue cannot receive Work Items from another Organization.
8. A direct assignee must be an active, non-retired Organization Member in the
   same Organization.
9. A suspended or retired assignee does not become eligible merely because an
   old Assignment record exists; reassignment is required.
10. A completed or cancelled Work Item cannot be changed unless an approved
    Transition allows reopening.
11. An SLA breach is a fact about timing; it does not automatically approve or
    deny any business decision.
12. Every state, queue, assignment, priority, due-time, and lifecycle mutation
    emits one Workflow History Event with an audit actor and timestamp.
13. Normal operational removal uses soft deletion where applicable. History is
    retained and is never normally deleted.
14. Mutable entities require an expected version and reject stale updates.

## Domain policies

| Policy | Decision |
|---|---|
| Tenant access | Active Organization Member plus IAM permission is required. Workflow does not implement IAM permission logic. |
| Assignment eligibility | Same-Organization active membership is mandatory. Future access-scope checks may add constraints, not bypass it. |
| State authorization | Definition Transition validity is mandatory; later modules may add permission requirements. |
| Queue visibility | Tenant-scoped by default; queue managers require IAM permission. |
| External subject lifecycle | Workflow never deletes, mutates, or owns an External Subject. |
| SLA execution | Platform calculates/records timing state; future notification/event services perform delivery or escalation. |
| Audit | Standard audit columns record row mutation; Workflow History records operational meaning. |

## Cross-context interactions

| External context | Workflow receives | Workflow returns | Ownership boundary |
|---|---|---|---|
| Tenant Management | Organization and active membership validation | No membership lifecycle changes | Tenant Management owns membership. |
| IAM | Authenticated actor and authorization decision | No role/permission changes | IAM owns roles and permissions. |
| Hospital | Optional operational context/reference in future | No Hospital mutation | Hospital Aggregate owns Hospital data. |
| Claim Processing | Request to start/progress workflow for a Claim | Recorded transition/task outcome event | Claim Processing owns Claim state and decisions. |
| Insurance Foundation | Payer/process context in future | Workflow progress event | Insurance owns policy/payer data. |
| Notification / Reporting | Workflow event or read model data in future | No workflow mutation by consumers | Workflow owns operational event truth. |

## Domain events — conceptual only

The following names express future integration intent. They are not yet an
event-bus or database design decision.

- `WorkflowInstanceStarted`
- `WorkflowStateTransitioned`
- `WorkItemCreated`
- `WorkItemAssigned`
- `WorkItemReassigned`
- `WorkItemQueueChanged`
- `WorkItemDueDateChanged`
- `WorkItemSlaBreached`
- `WorkItemCompleted`
- `WorkItemCancelled`

## Error language

The future application layer must distinguish these business failures:

| Condition | Intended outcome |
|---|---|
| Unknown or retired Definition | Not found or conflict; no Instance starts. |
| Definition/State mismatch | Validation error. |
| Invalid Transition | Conflict; current state remains unchanged. |
| Cross-tenant Instance, Queue, Work Item, or Member | Forbidden or tenant-scoped not found; no detail leakage. |
| Ineligible assignee | Validation/forbidden error; no Assignment changes. |
| Stale expected version | Conflict (`409`); caller refreshes and retries. |
| Completed/Cancelled item mutation | Conflict unless a permitted reopen transition exists. |

## Design constraints carried forward

- Do not infer a physical table or database relationship from a concept until
  the Logical ERD and Physical Database Design stages are approved.
- Existing legacy `workflow_instances` and `workflow_queues` remain external
  evidence to inspect later; no replacement or deletion is approved.
- The future Domain Model must remain reusable without adding Claim-specific
  properties to Workflow entities.
- One direct assignee is an initial Phase 6 rule. Multi-assignee or team
  collaboration requires a documented business change.

## Validation

- The analysis preserves all boundaries approved in Business Understanding.
- Workflow is a coordination domain, not a duplicate Claim, IAM, or Tenant
  domain.
- State, assignment, queue, SLA, history, tenant isolation, and concurrency
  rules are explicit.
- No aggregate, ERD, SQL, REST API, or source code has been created.

## Approval record

Approved on 2026-07-30. The Workflow Platform shared language, responsibilities,
invariants, policies, and cross-context boundaries are accepted.

Next mandatory stage: **Workflow Platform Bounded Context and Aggregate
Design**.
