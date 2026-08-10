# ClaimNX Workflow Platform - SQL Architecture Review

| Field | Value |
|---|---|
| Module | Workflow Platform |
| Phase | Phase 6 - Workflow Platform |
| Version | 1.0 |
| Status | Approved - 2026-07-30 |
| Reviewed inputs | Approved Physical Database Design and Legacy Preflight Review |
| Database evidence | 14 Workflow tables, 33 foreign keys, zero records in every Workflow table |
| Date | 2026-07-30 |

## Objective

Review whether the approved Workflow Platform physical design can safely move
to PostgreSQL migration scripting. This review validates migration ordering,
legacy compatibility, tenant isolation, constraints, audit, concurrency,
performance, and rollback posture. It creates no SQL migration.

## Review outcome

**Recommended outcome: approve with mandatory migration controls.**

The design respects the approved Workflow aggregates and can be evolved without
business-data conversion because all 14 Workflow tables are empty. The existing
schema remains structurally high-risk because 33 foreign keys must survive.
Every control in this review is mandatory for the future migration.

## 1. Legacy compatibility review

| Review area | Finding | Required migration control |
|---|---|---|
| Table identity | All existing Workflow tables must remain. | Use `ALTER TABLE` and additive changes only. Never rename, drop, or recreate a legacy table. |
| Primary keys | Existing UUID IDs are referenced across the Workflow family. | Preserve every existing primary key and its column name. |
| Foreign keys | 33 legacy relationships were discovered. | Assert every existing FK before migration and revalidate it afterwards. |
| Legacy values | All Workflow tables are currently empty. | Add required fields as nullable first, then validate and make them required. |
| Compatibility fields | Legacy Queue/Role/User and approval fields conflict with new ownership boundaries. | Preserve columns and FKs, but route no new Phase 6 business writes through them. |
| Global uniqueness | Instance reference and Queue code are globally unique today. | Replace only after active Organization-scoped unique indexes validate successfully. |

## 2. Organization isolation review

The approved tenant scope is `organization_id`, not Hospital-only filtering.
The review approves adding non-null Organization scope to:

```text
workflow_instances
workflow_queues
workflow_tasks
workflow_sla
workflow_history
workflow_task_history
```

Required controls:

1. Add `organization_id` as a nullable column first.
2. For legacy Instance and Hospital-scoped Queue context, derive Organization
   through the current Hospital relationship.
3. Abort the migration if any non-empty record cannot resolve one Organization.
4. Add `NOT NULL`, an Organization foreign key, and active tenant indexes only
   after validation succeeds.
5. Use Organization plus primary-key composite compatibility keys for
   tenant-owned relationships.

`workflow_queues.scope_hospital_id` is optional, so it cannot be trusted as an
authoritative tenant source. New Queue writes must always provide
`organization_id` directly.

## 3. Aggregate-boundary review

| Aggregate | SQL boundary decision |
|---|---|
| Workflow Definition | Platform-governed: no Organization column. Definition version remains pinned by Instances. |
| Workflow State/Transition | Definition-owned: composite Definition/State constraints prevent cross-definition transitions. |
| Workflow Instance | Organization-scoped root with Hospital compatibility context. |
| Workflow Queue | Organization-scoped root. Queue retirement cannot cascade to Tasks. |
| Work Item | Existing `workflow_tasks` becomes the independent Work Item root. It references, but does not become a child of, the Instance. |
| SLA Marker | Existing `workflow_sla` becomes one Work Item-owned marker. |
| Histories | Instance history and new Work Item history are append-only owner-scoped records. |

No foreign key transfers domain ownership. Cross-aggregate changes remain an
application-service transaction responsibility.

## 4. Required constraints review

The migration must implement and validate all of the following:

- `version >= 1` on every evolved or new business table;
- positive display order and positive SLA minutes where supplied;
- Definition-bound State code/name uniqueness;
- Definition-bound Transition uniqueness and endpoint integrity;
- active Organization-scoped Instance reference uniqueness;
- active Organization-scoped Queue code/name uniqueness;
- one active SLA Marker per Work Item;
- same-Organization composite references for Instance/Task/Queue/SLA/history;
- `ON DELETE RESTRICT` for new foreign keys;
- soft-delete flag/timestamp consistency on every evolved table.

The active direct-assignee rule cannot be represented by a static foreign key:
an Organization Member can later be suspended. It is enforced in the service
layer and tenant-aware SQL functions at assignment time.

## 5. IAM and audit review

All newly required audit actors reference `public.users(id)` using restrictive
foreign keys. Because the legacy Workflow tables are empty, audit remediation
does not require data backfill; however, the migration must assert this fact
before changing nullable audit actor columns.

The migration must create a unique compatibility key on
`public.organization_members(organization_id, id)` before adding a composite
Task-to-Organization-Member foreign key. Organization Membership lifecycle and
IAM permissions remain owned by their established bounded contexts.

History records are immutable. Their standard audit fields are creation facts;
normal update and delete functions/controllers must not be introduced.

## 6. Index and performance review

Approved indexes are justified by approved worklists and history reads:

| Query need | Index direction |
|---|---|
| Instance worklist | Active `(organization_id, status/current_state_id)`. |
| External-subject lookup | Active `(organization_id, source_type, source_id)`. |
| Queue worklist | Active `(organization_id, is_active)`. |
| Work Item worklists | Active Organization plus status, queue, assignee, and due-time indexes. |
| SLA monitoring | Active Work Item and due/breach indexes. |
| History | `(organization_id, owner_id, occurred_at)` indexes. |

Every new partial index must use the standardized active predicate. No index is
approved merely because a legacy column exists.

## 7. Migration transaction and rollout review

The future migration must run in ordered, reversible stages:

1. read-only assertions: table, foreign-key, zero-record, and legacy-index
   inventory;
2. additive nullable columns and the new `workflow_task_history` table;
3. Organization derivation/backfill and audit/soft-delete/version assertions;
4. supporting unique compatibility keys;
5. `NOT NULL`, check, and foreign-key constraints;
6. indexes and partial active uniqueness;
7. legacy global-unique-index retirement only after replacement validation;
8. comments and post-migration validation queries.

Any failed assertion must raise an exception and roll back the migration. No
unreviewed DDL may run outside this ordered migration.

## 8. Security review

- Tenant route Organization ID, JWT actor, application authorization, SQL
  function parameters, and repository predicates must agree.
- Unauthorized cross-tenant access must return 403 before a query can expose
  tenant data.
- Backend application access remains the approved API boundary; no frontend
  filtering is trusted as tenant enforcement.
- RLS policy changes are not included in this Workflow schema migration. If
  direct Supabase client access is later approved, a separate RLS design and
  review is mandatory.

## 9. SQL architecture review checklist

| Check | Result |
|---|---|
| Approved aggregates preserved | Pass |
| Legacy table and FK preservation strategy | Pass with mandatory assertions |
| Tenant-isolation strategy | Pass with Organization derivation gate |
| Audit and concurrency design | Pass with audit-remediation gate |
| Soft-delete and uniqueness strategy | Pass |
| Work Item/SLA/history ownership | Pass |
| Queue retirement safety | Pass |
| Performance/index strategy | Pass |
| SQL migration ordering | Pass |
| Migration SQL created | Not yet - correctly blocked |

## Validation

- The review uses the approved physical design and actual database discovery.
- No schema, migration, function, table, or data has been changed.
- The required migration controls are explicit and testable.
- The next stage remains blocked until approval is recorded.

## Approval record

Approved on 2026-07-30. The migration controls for legacy compatibility,
Organization isolation, aggregate integrity, audit, concurrency, and rollback
are accepted.

Next mandatory stage: **Workflow Platform PostgreSQL Migration Scripts**.
