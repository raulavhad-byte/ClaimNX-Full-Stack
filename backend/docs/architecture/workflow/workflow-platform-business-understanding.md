# ClaimNX Workflow Platform — Business Understanding

| Field | Value |
|---|---|
| Module | Workflow Platform |
| Phase | Phase 6 — Workflow Platform |
| Version | 1.0 |
| Status | Approved — 2026-07-30 |
| Date | 2026-07-30 |
| Owner | Solution Architecture |

## Objective

Define the business purpose, scope, ownership, outcomes, and non-negotiable
rules for the ClaimNX Workflow Platform before any domain model, ERD, SQL, or
application code is designed.

## Why

Claims, pre-authorizations, documents, recoveries, and future operational
processes need consistent routing, assignment, state control, SLA visibility,
and auditability. Building a separate workflow implementation inside each
future business module would duplicate rules, create inconsistent controls, and
make operational reporting unreliable.

The Workflow Platform therefore provides shared workflow capability. It does
not own the business data or business decisions of Claims, Insurance,
Financial, or other bounded contexts.

## Business outcome

ClaimNX must enable an Organization to route operational work to the right
queue or assignee, track its lifecycle, identify overdue work, and retain a
complete auditable history of every workflow action.

The Platform must support phased adoption: it will be usable first as a generic
workflow foundation and later be configured by individual business modules.

## In-scope capabilities

1. **Workflow definitions** — approved reusable process templates and their
   permitted states/transitions.
2. **Workflow instances** — an Organization-scoped execution of a workflow
   for a business record owned by another bounded context.
3. **Tasks / work items** — operational units of work created within an
   instance.
4. **Queues** — Organization-scoped work pools used before or alongside a
   direct assignment.
5. **Assignments** — assignment and reassignment of a task to an eligible
   Organization Member.
6. **State transitions** — controlled progression, completion, cancellation,
   and re-opening only where the approved workflow permits them.
7. **SLA tracking** — due-at and breach visibility for operational work.
8. **History and audit** — immutable business history of state, queue, and
   assignee changes, in addition to standard entity audit columns.
9. **Operational views** — tenant-scoped lists of my work, queue work, and
   overdue work.

## Explicitly out of scope

- Claim-specific adjudication rules, benefits, and financial decisions
  (Phase 8 and Phase 9 own these).
- Insurance policy validation and payer-specific workflows (Phase 7 owns
  those business rules).
- User, role, permission, and Organization Member lifecycle management
  (IAM and Tenant Management own them).
- Messaging, e-mail, SMS, or notification delivery. The Workflow Platform may
  raise a future notification request, but it does not deliver messages.
- AI-generated decisions and automated adjudication (Phase 10).
- Frontend screens (future React phase).

## Business actors

| Actor | Business need |
|---|---|
| Organization Administrator | Configure approved tenant workflow options and monitor work distribution. |
| Operations Manager | View queues, workload, SLA risk, and overdue work. |
| Organization Member | View assigned work and perform permitted transitions. |
| Queue Manager | Assign or reassign eligible work within the Organization. |
| Future business module | Start and progress an instance while retaining ownership of its business record. |
| Auditor / Compliance officer | Reconstruct who changed work state, assignment, or priority and when. |

## Core business language

| Term | Meaning |
|---|---|
| Workflow Definition | Platform-governed model of a reusable process. |
| Workflow Instance | Tenant-scoped execution of a Definition for one externally owned business record. |
| Workflow State | Approved lifecycle stage within a Definition. |
| Work Item | A task that requires or records operational activity. |
| Queue | Tenant-scoped operational work pool. |
| Assignment | Current responsibility for a Work Item; it may be queue-based, member-based, or both. |
| Transition | Permitted change from one Workflow State to another. |
| SLA | Target time by which a Work Item or Instance should progress or complete. |
| History Event | Append-only record explaining an operational change. |

## Ownership boundaries

- **Workflow Platform owns:** Definitions, State models, Transitions,
  Instances, Work Items, Queues, Assignments, SLA markers, and Workflow
  History.
- **Tenant Management owns:** Organizations and Organization Member lifecycle.
- **IAM owns:** Users, roles, permissions, and permission evaluation.
- **Hospital Aggregate owns:** Hospitals, Addresses, Contacts, and
  Departments.
- **Future modules own:** the business entity associated with a Workflow
  Instance. Workflow stores a reference only; it must not duplicate Claim,
  Patient, Policy, or Financial data.

## Mandatory business rules

1. Every Workflow Instance belongs to exactly one Organization.
2. Every Work Item belongs to exactly one Workflow Instance.
3. An Organization Member may only view or act on work in their active
   Organization tenant and only when IAM permission permits the action.
4. A suspended or retired Organization Member cannot receive a new assignment
   or perform a transition.
5. A Work Item cannot transition unless its parent Instance and Definition
   permit the transition.
6. Workflow must not alter a business record owned by another bounded context
   without that context explicitly processing an approved command/event.
7. Normal removal is soft deletion where appropriate; operational history is
   never physically deleted.
8. State, assignment, queue, priority, and SLA changes are auditable.
9. All mutable workflow records use optimistic concurrency.
10. Tenant filtering is enforced by database design, repository queries,
    application services, and API boundaries. Frontend filtering is never
    trusted.

## Initial lifecycle assumptions for approval

These are business assumptions for the platform foundation, not yet a physical
schema:

- A Workflow Instance can be `DRAFT`, `ACTIVE`, `COMPLETED`, `CANCELLED`, or
  `SUSPENDED`.
- A Work Item can be `OPEN`, `IN_PROGRESS`, `WAITING`, `COMPLETED`,
  `CANCELLED`, or `SUSPENDED`.
- The exact states and transitions for Claims will be defined by Claim
  Processing later; Phase 6 establishes a configurable mechanism rather than
  hard-coding Claim states.
- A Work Item has at most one current directly assigned Organization Member.
  It may also have one current Queue.
- Assignment eligibility uses active Organization Membership first; detailed
  access-scope checks remain a future integration when that foundation exists.

## Non-functional expectations

- Every tenant read/write remains organization-scoped.
- Worklist queries must support paging and operational sorting.
- State/assignment updates are concurrency-safe and idempotency-ready.
- All lifecycle actions have a traceable audit actor and timestamp.
- The design must support future workflow events, notifications, and reporting
  without structural redesign.
- No unapproved direct database write is allowed from a future frontend.

## Dependencies and current constraints

- Phase 5 Tenant Management is complete and provides Organization and active
  Organization Member foundations.
- Current legacy database evidence shows `workflow_instances` and
  `workflow_queues` may already exist. Their actual schema, data, and inbound
  dependencies must be inspected during Physical Database Design; no assumption
  is made here that they can be dropped or replaced.
- The live Organization Member access-scope table is currently absent. This
  capability will not depend on it for the first Workflow Platform release.

## Approval record

Approved on 2026-07-30. The stated scope, ownership boundaries, and initial
lifecycle assumptions are accepted as the business baseline for Phase 6.

Next mandatory stage: **Workflow Platform Domain Analysis**. This approval does
not approve a data model, ERD, SQL, or code.
