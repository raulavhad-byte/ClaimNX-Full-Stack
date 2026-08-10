# Tenant Configuration Initial Catalogue Proposal

## Objective

Propose the smallest production-safe set of platform-governed Tenant
Configuration Definitions required to prove the Tenant Configuration capability
without crossing into Claims, Financial, Insurance, or Workflow ownership.

## Why

The catalogue controls which keys an Organization may override. It must be
approved before data is seeded or APIs are implemented; ad-hoc configuration
keys would weaken governance and tenant isolation.

## File Path

`docs/architecture/tenant/tenant-configuration-initial-catalogue.md`

## Proposed Definitions

| Configuration Key | Category | Type | Default | Organization Override | Purpose |
|---|---|---|---|---|---|
| `platform.time_zone` | Platform | STRING | `Asia/Kolkata` | Yes | IANA time zone used when displaying tenant-local dates and times. |
| `platform.default_currency` | Platform | STRING | `INR` | Yes | ISO 4217 currency code used as a future default; it does not create financial calculations. |
| `platform.date_format` | Platform | ENUM | `DD/MM/YYYY` | Yes | Presentation preference for future user interfaces and exports. |
| `platform.feature.document_uploads_enabled` | Feature Management | BOOLEAN | `true` | Yes | Enables a future document-upload capability for an Organization. |
| `platform.feature.notifications_enabled` | Feature Management | BOOLEAN | `true` | Enables a future notification capability for an Organization. |

## Validation Rules

| Configuration Key | Validation Rule |
|---|---|
| `platform.time_zone` | Must be an approved IANA time zone. Application-level validation will use a controlled list. |
| `platform.default_currency` | Must be an uppercase ISO 4217 three-letter code. Application-level validation will use a controlled list. |
| `platform.date_format` | Allowed values: `DD/MM/YYYY`, `MM/DD/YYYY`, `YYYY-MM-DD`. |
| `platform.feature.document_uploads_enabled` | Boolean literal: `true` or `false`. |
| `platform.feature.notifications_enabled` | Boolean literal: `true` or `false`. |

## Explicit Exclusions

- No claim-adjudication thresholds.
- No settlement, tax, billing, or financial policy.
- No insurer-specific rules.
- No clinical, patient, or hospital operational rules.
- No Workflow SLA or assignment rules.

Those keys will be proposed only when their owning bounded context is approved.

## Seed Strategy

The seed migration will insert these Definition records with:

- application-generated UUIDs supplied by the migration as fixed UUID literals;
- the existing platform administrator as both `created_by` and `updated_by`;
- `status = ACTIVE`, `version = 1`, and no Organization override records.

The migration will be idempotent by active configuration key. It will not alter
an existing approved definition.

## Validation

Before applying the seed migration, confirm:

1. The approved platform administrator user still exists.
2. No active Definition already uses one of these keys.
3. The list above is business-approved.

## Approval Gate

Await explicit approval of this initial catalogue before creating the seed
migration or Tenant Configuration domain code.
