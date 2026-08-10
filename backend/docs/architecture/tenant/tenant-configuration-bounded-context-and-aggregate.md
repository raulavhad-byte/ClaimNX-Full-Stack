# Tenant Configuration — Bounded Context and Aggregate Design

| Field | Value |
|---|---|
| Module | Tenant Management |
| Capability | Tenant Configuration |
| Phase | Phase 5 |
| Status | Draft — approval required before ERD |
| Prerequisite | Domain Analysis approved |
| Date | 2026-07-30 |

## Objective

Define the ownership boundary, aggregate root, commands, invariants, and
integration contracts for Tenant Configuration.

## Bounded Context

**Name:** Tenant Configuration

**Purpose:** Manage Organization-specific overrides of platform-governed
configuration definitions and resolve the effective configuration value.

This bounded context does not own Organizations, Users, Roles, Permissions,
Hospitals, workflows, claims, or reference data.

## Context Map

```text
IAM ── authorizes actor ──► Tenant Configuration ◄── owns Organization ── Organization
                                    │
                                    ├── reads definitions/defaults ──► Platform Configuration Catalogue
                                    │
                                    └── supplies effective values ──► Future platform modules
```

## Aggregate Design

### Aggregate Root: Tenant Configuration Override

One aggregate represents one Organization’s override of one Configuration
Definition.

```text
TenantConfigurationOverride
├── organizationId
├── configurationDefinitionId
├── configuredValue
├── status
├── version
└── audit / soft-delete fields
```

There are no child entities in this aggregate. A configuration value is
intentionally atomic: updating it is a single versioned business operation.

### Why this is the Aggregate Root

- Its uniqueness boundary is one Organization plus one Definition.
- Its lifecycle is independent of all other overrides.
- It permits concurrent changes to different configuration keys in the same
  Organization without unnecessary aggregate conflicts.
- It makes tenant isolation explicit on every persistence operation.

## External Domain Concepts

| Concept | Owning context | Relationship |
|---|---|---|
| Organization | Organization/Tenant Management foundation | Tenant Configuration stores an immutable owner reference. |
| Configuration Definition | Platform Configuration Catalogue | Tenant Configuration references an active overridable definition. |
| User / Permission | IAM | Used for authorization and audit only. |
| Hospital | Hospital bounded context | May consume effective configuration; never owns or writes it. |

## Commands

| Command | Preconditions | Result |
|---|---|---|
| Create Override | Active Organization, active overridable definition, valid value, no active duplicate | Active override version 1 |
| Update Override Value | Active override, expected version, valid value | Updated override, version incremented |
| Activate Override | Inactive override, expected version | Active/effective override |
| Deactivate Override | Active override, expected version | Inactive/non-effective override |
| Retire Override | Active or inactive override, expected version | Soft-deleted override |
| Resolve Effective Value | Authorized Organization scope | Active override or platform default |

## Aggregate Invariants

1. `organizationId` is immutable after creation.
2. `configurationDefinitionId` is immutable after creation.
3. A value may change only when it conforms to the referenced Definition.
4. Only an active, non-deleted override can be effective.
5. There is at most one active, non-deleted override for an Organization and
   Definition pair.
6. Every state transition requires the expected `version`.
7. Retirement is soft deletion; physical deletion is prohibited.
8. The Aggregate cannot grant access, add members, or modify Hospital data.

## Lifecycle Transition Rules

| From | Action | To | Valid |
|---|---|---|---|
| None | Create Override | Active | Yes |
| Active | Update Value | Active | Yes |
| Active | Deactivate | Inactive | Yes |
| Inactive | Activate | Active | Yes |
| Active/Inactive | Retire | Retired | Yes |
| Retired | Any normal operation | — | No |

## Consistency Boundary

The following are committed atomically in one transaction:

- Configuration value and status change
- Expected-version comparison and version increment
- Audit fields
- Soft-delete fields when retiring

Definition validation and Organization membership validation occur before the
write. The database must still enforce tenant ownership and active uniqueness.

## Integration Contract

Future consumers call an application-level effective-configuration resolver
with an Organization ID and a known definition key. They must not query the
override table directly or use arbitrary client-supplied keys.

## Validation

- Aggregate ownership is narrow and concurrent-safe.
- Hospital and IAM aggregate boundaries remain intact.
- The design supports controlled configuration evolution.
- No ERD, schema, API, or SQL has been created.

## Pause for Approval

Approve or amend this Bounded Context and Aggregate Design. The next step is
the logical ERD and data model.
