# Tenant Configuration — Domain Analysis

| Field | Value |
|---|---|
| Module | Tenant Management |
| Capability | Tenant Configuration |
| Phase | Phase 5 |
| Status | Draft — approval required before bounded-context design |
| Prerequisite | Tenant Configuration Business Understanding approved |
| Date | 2026-07-30 |

## Objective

Translate the approved Tenant Configuration business understanding into domain
concepts, responsibilities, lifecycle language, invariants, and events before
bounded context and aggregate design.

## Ubiquitous Language

| Term | Meaning |
|---|---|
| Organization | The tenant owner of configuration overrides. |
| Configuration Catalogue | Platform-governed definitions of allowed configuration keys, types, defaults, and validation rules. |
| Configuration Definition | One catalogue entry; it is not tenant-owned. |
| Tenant Configuration | An Organization-specific override of one configuration definition. |
| Effective Configuration | The resolved value: active tenant override when present, otherwise the platform default. |
| Platform Default | The default value supplied by a configuration definition. |
| Override | An explicit active configuration value supplied by an Organization. |
| Inactive Configuration | A retained override that is intentionally not effective. |
| Retired Configuration | A soft-deleted override that normal reads exclude. |
| Configuration Value Type | The expected representation and validation rule for a configuration value. |

## Core Domain Concepts

### Configuration Definition

The Configuration Definition is platform-governed reference metadata. It
defines the stable key, display name, category, value type, validation rule,
default value, and whether Organization overrides are permitted. It is not
owned by an Organization and cannot contain tenant-specific values.

### Tenant Configuration

Tenant Configuration is the Organization-owned business record that stores an
approved override for exactly one Configuration Definition. It contains no
membership, Hospital, workflow, insurance, or claim data.

### Effective Configuration Resolution

Effective configuration is a read decision, not a record copied into every
tenant. The resolution order is:

```text
Active, non-deleted Organization override
        ↓ otherwise
Active platform default from Configuration Definition
```

An inactive or soft-deleted override does not hide the platform default.

## Lifecycle

```text
No override
    ↓ create
Active override
    ├── update → Active override (new version)
    ├── deactivate → Inactive override
    └── retire → Retired override (soft delete)

Inactive override
    ├── activate → Active override (new version)
    └── retire → Retired override (soft delete)
```

## Domain Responsibilities

| Responsibility | Owner |
|---|---|
| Define allowed keys, types, validation and defaults | Configuration Catalogue / Platform governance |
| Store tenant override | Tenant Configuration |
| Resolve effective value | Tenant Configuration application service |
| Validate Organization membership | Organization/IAM service |
| Authorize an action | IAM authorization |
| Manage Hospital operational data | Hospital Aggregate |

## Proposed Value Types

The initial approved value types are deliberately small and extensible:

| Type | Examples | Validation approach |
|---|---|---|
| `BOOLEAN` | Feature enabled | `true` or `false` |
| `INTEGER` | Numeric threshold | Integer range where defined |
| `STRING` | Prefix or label | Length/pattern where defined |
| `ENUM` | Approved operational option | Must be one catalogue allowed value |
| `JSON` | Structured future configuration | Valid JSON constrained by catalogue schema in a later enhancement |

No secret, password, API key, or credential may be stored as Tenant
Configuration.

## Domain Invariants

1. A Tenant Configuration belongs to exactly one Organization for its full
   lifecycle.
2. A Tenant Configuration references exactly one active Configuration
   Definition.
3. There may be at most one active, non-deleted override per Organization and
   Configuration Definition.
4. A tenant value must match the data type and validation rule of its
   Configuration Definition.
5. A configuration definition marked non-overridable cannot have a Tenant
   Configuration override.
6. Inactive and soft-deleted overrides are not effective.
7. Updates, activation, deactivation, and retirement require the expected
   version and increment it after success.
8. Audit actor and timestamps are mandatory for every tenant configuration
   write.
9. Effective configuration resolution never returns an override belonging to
   another Organization.

## Domain Events

| Event | Meaning |
|---|---|
| `TENANT_CONFIGURATION_OVERRIDDEN` | An Organization created an approved override. |
| `TENANT_CONFIGURATION_UPDATED` | An existing override value changed. |
| `TENANT_CONFIGURATION_ACTIVATED` | An inactive override became effective. |
| `TENANT_CONFIGURATION_DEACTIVATED` | An override stopped being effective. |
| `TENANT_CONFIGURATION_RETIRED` | An override was soft-deleted. |

Events are business facts. Phase 5 will record audit information; publishing
events to an asynchronous broker remains a future Workflow Platform concern.

## Anti-Corruption Rules

- Do not read arbitrary `config_key` strings directly from feature code.
- Do not let a Hospital write an Organization configuration.
- Do not copy configuration values into Hospital, Claim, or Workflow tables.
- Do not use configuration entries as a substitute for Reference Data.
- Do not use configuration for secrets or credentials.

## Validation

- The domain separates platform definitions from tenant overrides.
- It preserves Organization and IAM ownership boundaries.
- It supports future modules without giving them ownership of configuration.
- No aggregate, ERD, API, SQL, or implementation decision has been made.

## Pause for Approval

Approve or amend this Domain Analysis. The next step is Bounded Context and
Aggregate Design.
