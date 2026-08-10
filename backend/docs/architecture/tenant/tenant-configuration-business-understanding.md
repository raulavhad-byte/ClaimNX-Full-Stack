# Tenant Configuration — Business Understanding

| Field | Value |
|---|---|
| Module | Tenant Management |
| Capability | Tenant Configuration |
| Phase | Phase 5 |
| Status | Draft — approval required before domain analysis |
| Owner | Solution Architecture |
| Date | 2026-07-30 |

## Objective

Define the business purpose, ownership boundary, and approved scope for
tenant-specific configuration in ClaimNX before aggregate, ERD, API, or SQL
design begins.

## Why

ClaimNX serves multiple healthcare organizations. A configuration belonging to
one Organization must never alter the behavior or data visible to another
Organization. Uncontrolled free-form settings would create inconsistent
behavior, weaken validation, and make future insurance, claim, workflow, and
financial modules difficult to govern.

## Existing Foundation

The existing `public.organization_configurations` table is a legacy platform
foundation. It already contains Organization ownership, audit columns, soft
delete fields, status, and a version. It is **not** approved as the final
physical design for this capability and must not be modified until the later
physical database design stage.

## Business Problem

Platform administrators need to configure approved tenant-specific behavior
without changing application code or affecting other organizations. Examples
may include approved workflow defaults, operational preferences, or future
feature enablement. The precise configuration catalogue is not yet approved.

## In Scope

- Organization-owned configuration entries.
- Tenant isolation for every read and write.
- Authorized configuration administration.
- Versioned updates, audit history, and soft deletion.
- An approved configuration catalogue with data type and validation rules.
- Future consumption by Workflow, Insurance, Claims, Financial, and Reporting
  modules without those modules owning tenant configuration.

## Explicitly Out of Scope

- Hospital Address, Contact, Department, or Hospital lifecycle management.
- Organization Member and user assignment management; those remain owned by
  the Organization/IAM domain.
- User preferences and personal notification settings.
- Workflow state definitions, insurance rules, claim adjudication rules, or
  financial settlement rules.
- A generic ungoverned key/value store.

## Proposed Domain Boundary — For Approval

**Bounded Context:** Tenant Management

**Proposed Aggregate Root:** Tenant Configuration

**Proposed ownership:** One configuration entry belongs to exactly one
Organization. It cannot be reassigned to another Organization.

The Organization owns tenant identity and membership. Tenant Configuration
owns only approved configuration values scoped to that Organization. Hospital
remains a separate aggregate and consumes configuration only when an approved
business requirement permits it.

## Candidate Business Capabilities

| Capability | Business outcome |
|---|---|
| Read effective configuration | An authorized user can retrieve approved active configuration for their Organization. |
| Manage approved configuration | An authorized administrator can create or update only catalogue-defined configuration keys. |
| Disable configuration | A configuration entry can be made inactive or soft-deleted while retaining audit history. |
| Validate configuration | Values must satisfy the configured type, allowed values, and business constraints. |
| Audit configuration changes | Every change identifies the actor, time, previous version, and resulting version. |

## Initial Business Rules — For Approval

1. Every Tenant Configuration belongs to exactly one Organization.
2. Tenant isolation is enforced in the database, service layer, and API layer.
3. A configuration key is unique within an Organization among active,
   non-deleted entries.
4. Configuration keys must come from an approved catalogue; clients cannot
   invent arbitrary keys.
5. Values must validate against the catalogue-defined data type and allowed
   values before persistence.
6. Configuration changes require optimistic concurrency using `version`.
7. Normal removal is soft deletion only.
8. A configuration cannot be reassigned to another Organization.
9. Organization/IAM authorization determines who may read or administer a
   configuration; configuration records do not manage members or permissions.

## Decisions Needed Before Domain Analysis

1. Which configuration categories are needed in Phase 5?
   - Recommended initial categories: tenant operational defaults, approved
     feature flags, and document/numbering preferences.
2. Which roles can read and manage configuration?
   - Recommended: read for authorized tenant users; write for a dedicated
     tenant administrator permission.
3. Should a catalogue entry provide a platform default when an Organization has
   no override?
   - Recommended: yes, but model defaults separately from Organization
     overrides.
4. Is configuration activation an independent lifecycle (`ACTIVE`/`INACTIVE`)
   or is soft deletion sufficient?
   - Recommended: retain both; inactive means intentionally disabled, while
     soft deletion is retirement.

## Validation

- Capability is listed as `Tenant Configuration` in the approved Hospital
  platform business architecture.
- Ownership boundary does not cross into Hospital or Organization Member/IAM
  responsibilities.
- No SQL, migration, API, or implementation has been created.

## Pause for Approval

Approve or amend this Business Understanding. After approval, the next step is
Domain Analysis for Tenant Configuration.
