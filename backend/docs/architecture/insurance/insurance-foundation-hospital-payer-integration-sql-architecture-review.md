# Insurance Foundation — Hospital–Payer Integration SQL Architecture Review

| Attribute | Value |
|---|---|
| Module | Insurance Foundation |
| Phase | Phase 7 — Insurance Foundation |
| Version | 1.0 |
| Status | Approved |
| Reviewed design | Hospital–Payer Integration Physical Database Design approved 2026-08-01 |
| Date | 2026-08-01 |

## Objective

Review the approved physical model against the existing ClaimNX PostgreSQL schema and migration conventions before any SQL migration is written or applied.

## Existing Compatibility Findings

| Existing element | Finding | Decision |
|---|---|---|
| public.hospitals | Primary key is legacy column id; Organization scope already exists through organization_id. | New foreign key uses hospital_id → hospitals.id. |
| public.hospitals tenant uniqueness | There is no existing usable unique key on (organization_id, id). | Add an additive unique constraint solely to support a composite tenant foreign key. |
| public.insurance_entities | Existing platform Insurance Partner root uses id and preserves claims.payer_id references. | New integration references id only; no change to claims or legacy payer data. |
| public.organization_insurance_partner_enablement | Existing active uniqueness exists for (organization_id, insurance_partner_id). | Use lifecycle-aware command validation as a prerequisite; do not store a redundant enablement foreign key. |
| public.reference_categories / reference_values | Existing Phase 7 convention uses system categories and UUID references. | Add two new system categories and six platform values additively. |
| public.users | Existing audit actor references use users(id) and ON DELETE RESTRICT. | Use the same audited foreign-key convention. |
| Existing Hospital/Insurance tables | Existing data and public API compatibility must be preserved. | No rename, drop, type change, or physical delete. |

## Approved Migration Units

The implementation will use separate, ordered, additive migration files:

| Order | Proposed migration file | Responsibility |
|---:|---|---|
| 1 | 20260801090000_seed_hospital_payer_integration_reference_data.sql | Seed controlled channel and lifecycle categories/values. |
| 2 | 20260801090100_create_hospital_payer_integration.sql | Add Hospital composite tenant support, table, FKs, checks, indexes, and comments. |
| 3 | 20260801090200_create_hospital_payer_integration_functions.sql | Create guarded command functions. |
| 4 | 20260801090300_validate_hospital_payer_integration_schema.sql | Run fail-fast post-migration structure and data validation. |

The reviewed migration files have been authored with these names. Their timestamps are after all existing Phase 7 migrations, preserving migration order.

## Reference Data Review

### Categories and values

| Category | Required active values | Design result |
|---|---|---|
| HOSPITAL_PAYER_INTEGRATION_CHANNEL | EMAIL, RPA_PORTAL, API | Approved; API is a reserved type only. |
| HOSPITAL_PAYER_INTEGRATION_STATUS | DRAFT, ACTIVE, INACTIVE | Approved; retirement uses standard soft delete, not a reference value. |

### Enforcement approach

- Foreign keys guarantee that the stored UUID points to a Reference Value.
- Command functions validate that the value belongs to the correct category, is platform-level, active, and not deleted.
- Table check constraints do not attempt to join Reference Data; PostgreSQL CHECK constraints must not depend on mutable external rows.

## Tenant Integrity Review

### Approved mechanism

1. Add unique constraint uq_hospitals_organization_hospital on public.hospitals(organization_id, id).
2. Add the new table's composite foreign key:

   (organization_id, hospital_id) → public.hospitals(organization_id, id)

3. Every function takes organization_id and hospital_id parameters and scopes its WHERE clauses by both.
4. The command function checks the current Hospital lifecycle and the matching active Organization Partner Enablement.

### Why this is safe

- The added Hospital unique constraint is additive and does not change any row, key value, API contract, or ownership boundary.
- The composite foreign key prevents persisted cross-tenant Hospital references.
- It avoids trusting a supplied organization_id in application code alone.

## Lifecycle and Uniqueness Review

| Rule | SQL implementation |
|---|---|
| UUID is application generated | No default on hospital_insurance_partner_integration_id. |
| One non-retired profile per Hospital/Partner | Partial unique index on (hospital_id, insurance_partner_id) WHERE deleted_at IS NULL. |
| Hospital-scoped integration code | Partial unique index on (hospital_id, integration_code) WHERE deleted_at IS NULL. |
| Optimistic concurrency | Version column default 1; update/status/retire functions match expected version and increment exactly once. |
| Soft delete | Set deleted_by and deleted_at; never issue ordinary DELETE. |
| Retired record cannot mutate | Command function filters deleted_at IS NULL. |

The stronger one-non-retired-profile rule is intentional for the initial release. It is safer than allowing duplicate inactive destinations before a controlled routing-purpose requirement exists.

## Channel and Credential Review

| Concern | Decision |
|---|---|
| Email address format | Application DTO validation plus command-function validation. |
| Portal URL | Application validation plus database check for nonblank HTTPS prefix. |
| Portal username | Nonblank when required by active RPA Portal configuration. |
| Credential reference | Nullable column, nonblank if supplied, required for active RPA/API by command function. |
| Password/token | No table column, SQL parameter, return value, or test fixture. |
| Email/RPA/API execution | Not created by these migrations. |

## Command Function Review

The planned functions are:

| Function | Responsibility |
|---|---|
| create_hospital_insurance_partner_integration | Validate prerequisite state and create Draft/Active aggregate. |
| update_hospital_insurance_partner_integration | Update non-lifecycle configuration using expected version. |
| set_hospital_insurance_partner_integration_status | Activate/deactivate with prerequisite revalidation. |
| soft_delete_hospital_insurance_partner_integration | Soft retire with expected version and tenant scope. |

All functions return the aggregate UUID or NULL when the target is stale, retired, or outside the tenant; the application layer maps that result to established 404/409 behavior.

## Migration Safety Controls

Before constraints are enforced, the migration must verify:

- all referenced base tables exist;
- required Reference Data is present after seeding;
- an audit actor is supplied by commands, not hard-coded;
- no existing Hospital/Insurance/Claims row is updated;
- no new column is added to claims, hospitals, or insurance_entities except the additive Hospital composite-uniqueness support constraint;
- foreign keys use RESTRICT and no migration uses CASCADE deletion;
- migration scripts are idempotent where ClaimNX migration standards require it.

## Review Decision

The physical design is SQL-architecture compliant. Approval was recorded on 2026-08-01 and the reviewed migration scripts were authored locally.

The migration author must not add plaintext secret fields, direct RPA/email execution, claim routing, or an Organization Partner Enablement foreign key without a newly documented business requirement.

## Validation

- Existing Hospital primary-key and tenant conventions were reviewed. ✅
- Existing Claim payer foreign key remains protected. ✅
- Reference Data category validation is delegated to command functions correctly. ✅
- Composite tenant FK has a safe supporting unique constraint. ✅
- Soft delete, audit, concurrency, index, and restrictive deletion standards are complete. ✅
- No migration file or executable SQL has been created or run. ✅

## Approval Record

**Approved by:** ClaimNX Product Owner  
**Approved on:** 2026-08-01  
**Next deliverable:** Review and apply the four PostgreSQL migration scripts in their defined order.

## Previous Approval Prompt (Retained for History)

**Implementation note:** The historical statement that no migration file had been created is superseded. The four reviewed migration files were applied successfully to Supabase on 2026-08-01, including the fail-fast post-migration validation.

**File Path:** D:\Projects\backend\docs\architecture\insurance\insurance-foundation-hospital-payer-integration-sql-architecture-review.md  
**File Name:** insurance-foundation-hospital-payer-integration-sql-architecture-review.md  
**Action:** Review migration units, compatibility, tenant FK, Reference Data, function plan, and safety controls.

Reply exactly:

```text
Approve Hospital–Payer Integration SQL Architecture Review
```

After approval, the next deliverable will be the PostgreSQL migration scripts.
