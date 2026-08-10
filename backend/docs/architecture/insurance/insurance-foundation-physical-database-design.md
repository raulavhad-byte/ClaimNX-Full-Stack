# Insurance Foundation — Physical Database Design

| Field | Value |
| --- | --- |
| Module | Insurance Foundation |
| Phase | Phase 7 — Insurance Foundation |
| Status | Draft — approval required before SQL Architecture Review |
| Database | PostgreSQL / Supabase |
| Date | 2026-07-30 |
| Approval | Approved by Product Owner on 2026-07-30 |

## Objective

Define the production-ready physical database design for the approved Insurance Partner, Partner Contact, Product/Plan, and Organization Partner Enablement aggregates.

## Why

The approved logical model must be translated into a safe PostgreSQL schema without breaking `claims.payer_id -> insurance_entities.id` or allowing tenant data to mutate platform master data.

## Legacy Compatibility Decision

`public.insurance_entities` is the existing compatibility root and will be evolved in place as the canonical **Insurance Partner** table. Its table name and UUID `id` remain unchanged because `public.claims.payer_id` references it and the existing Blue Cross record has one dependent claim.

Legacy columns remain readable during the compatibility period. New Phase 7 writes use the approved columns below; dual-write/backfill behaviour is specified only in the later migration design.

## 1. Insurance Partner Root — `public.insurance_entities`

### Existing compatibility columns retained

`id`, `name`, `email_id`, `portal_link`, `type`, `automation_type`, `on_panel`, `rpa_supported`, `auto_email_enabled`, `template_name`, `data`, `created_at`, `updated_at`.

### Approved Phase 7 columns to add

| Column | PostgreSQL type | Required after remediation | Purpose |
| --- | --- | --- | --- |
| `partner_code` | `VARCHAR(50)` | Yes | Platform operational identifier. |
| `display_name` | `VARCHAR(200)` | Yes | Canonical business-facing Partner name. |
| `legal_name` | `VARCHAR(300)` | No | Registered legal name. |
| `partner_type_reference_value_id` | `UUID` | Yes | Controlled `INSURANCE_PARTNER_TYPE` value. |
| `operational_status_reference_value_id` | `UUID` | Yes | Controlled lifecycle status: Draft, Active, Suspended. |
| `registration_number` | `VARCHAR(100)` | No | External registration identifier; no uniqueness rule yet. |
| `created_by` | `UUID` | Yes | Creation audit actor, references `public.users(id)`. |
| `updated_by` | `UUID` | Yes | Last-update audit actor, references `public.users(id)`. |
| `deleted_by` | `UUID` | No | Soft-delete audit actor, references `public.users(id)`. |
| `deleted_at` | `TIMESTAMPTZ` | No | Soft-delete timestamp. |
| `is_deleted` | `BOOLEAN` | Yes | Legacy-compatible deletion flag; default `FALSE`. |
| `version` | `INTEGER` | Yes | Optimistic-concurrency counter; default `1`. |

### Root rules

- `id` remains the Insurance Partner UUID and the existing Claim payer reference.
- Partner master data has **no `organization_id`**; it is platform governed.
- `partner_code` and `display_name` are unique for active, non-deleted Partners.
- `version >= 1`.
- Active uniqueness means `deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = FALSE`.
- Status/category correctness is validated by approved command functions/application logic, not copied as uncontrolled text.
- No physical deletion is permitted.

## 2. Insurance Partner Contact — `public.insurance_partner_contact`

| Column | PostgreSQL type | Required | Purpose |
| --- | --- | --- | --- |
| `insurance_partner_contact_id` | `UUID` | Yes | Application-generated primary key. |
| `insurance_partner_id` | `UUID` | Yes | Parent `insurance_entities(id)`. |
| `contact_type_reference_value_id` | `UUID` | Yes | Controlled Contact Type. |
| `contact_name` | `VARCHAR(200)` | Yes | Business contact name. |
| `designation` | `VARCHAR(150)` | No | Role/title. |
| `email_address` | `VARCHAR(320)` | No | Business email. |
| `phone_number` | `VARCHAR(30)` | Yes | Primary business telephone. |
| `mobile_number` | `VARCHAR(30)` | No | Mobile telephone. |
| `is_primary` | `BOOLEAN` | Yes | Defaults to `FALSE`. |
| `created_by`, `updated_by` | `UUID` | Yes | Audit actors. |
| `created_at`, `updated_at` | `TIMESTAMPTZ` | Yes | Audit timestamps. |
| `deleted_by`, `deleted_at` | `UUID`, `TIMESTAMPTZ` | No | Soft-delete audit. |
| `version` | `INTEGER` | Yes | Defaults to `1`. |

Rules: Contacts are children of the Partner aggregate. One active primary Contact is allowed per `(insurance_partner_id, contact_type_reference_value_id)`. A contact cannot be reassigned to another Partner.

## 3. Insurance Product Plan — `public.insurance_product_plan`

| Column | PostgreSQL type | Required | Purpose |
| --- | --- | --- | --- |
| `insurance_product_plan_id` | `UUID` | Yes | Application-generated primary key. |
| `insurance_partner_id` | `UUID` | Yes | Owning Partner reference. |
| `plan_code` | `VARCHAR(80)` | Yes | Partner-scoped business identifier. |
| `plan_name` | `VARCHAR(200)` | Yes | Business-facing plan name. |
| `description` | `TEXT` | No | Informational description only. |
| `operational_status_reference_value_id` | `UUID` | Yes | Controlled Plan status. |
| `created_by`, `updated_by` | `UUID` | Yes | Audit actors. |
| `created_at`, `updated_at` | `TIMESTAMPTZ` | Yes | Audit timestamps. |
| `deleted_by`, `deleted_at` | `UUID`, `TIMESTAMPTZ` | No | Soft-delete audit. |
| `version` | `INTEGER` | Yes | Defaults to `1`. |

Rules: a Plan is independently versioned. Active `plan_code` and active `plan_name` are each unique within a Partner. No benefit, coverage, eligibility, tariff, or contract fields belong here.

## 4. Organization Partner Enablement — `public.organization_insurance_partner_enablement`

| Column | PostgreSQL type | Required | Purpose |
| --- | --- | --- | --- |
| `organization_insurance_partner_enablement_id` | `UUID` | Yes | Application-generated primary key. |
| `organization_id` | `UUID` | Yes | Tenant owner, references `organizations(id)`. |
| `insurance_partner_id` | `UUID` | Yes | Platform Partner being enabled. |
| `tenant_partner_code` | `VARCHAR(80)` | No | Tenant-local operational alias; not a Partner identifier. |
| `operational_status_reference_value_id` | `UUID` | Yes | Controlled Enablement status. |
| `created_by`, `updated_by` | `UUID` | Yes | Audit actors. |
| `created_at`, `updated_at` | `TIMESTAMPTZ` | Yes | Audit timestamps. |
| `deleted_by`, `deleted_at` | `UUID`, `TIMESTAMPTZ` | No | Soft-delete audit. |
| `version` | `INTEGER` | Yes | Defaults to `1`. |

Rules: this is the sole Organization/Partner relationship. One active, non-deleted Enablement is allowed per `(organization_id, insurance_partner_id)`. It must never modify Partner master fields.

## Foreign Key Design

| Constraint | Source | Target | Delete rule |
| --- | --- | --- | --- |
| `fk_insurance_partner_created_by_user` | `insurance_entities.created_by` | `users(id)` | `RESTRICT` |
| `fk_insurance_partner_updated_by_user` | `insurance_entities.updated_by` | `users(id)` | `RESTRICT` |
| `fk_insurance_partner_deleted_by_user` | `insurance_entities.deleted_by` | `users(id)` | `RESTRICT` |
| `fk_insurance_partner_type` | `insurance_entities.partner_type_reference_value_id` | `reference_values(id)` | `RESTRICT` |
| `fk_insurance_partner_status` | `insurance_entities.operational_status_reference_value_id` | `reference_values(id)` | `RESTRICT` |
| `fk_insurance_partner_contact_partner` | `insurance_partner_contact.insurance_partner_id` | `insurance_entities(id)` | `RESTRICT` |
| `fk_insurance_product_plan_partner` | `insurance_product_plan.insurance_partner_id` | `insurance_entities(id)` | `RESTRICT` |
| `fk_organization_partner_enablement_organization` | Enablement `organization_id` | `organizations(id)` | `RESTRICT` |
| `fk_organization_partner_enablement_partner` | Enablement `insurance_partner_id` | `insurance_entities(id)` | `RESTRICT` |

Every child table also has `created_by`, `updated_by`, and `deleted_by` foreign keys to `public.users(id)`, plus its declared Reference Data foreign key. All physical deletion rules are `RESTRICT`; normal lifecycle uses soft delete.

## Unique Constraints and Index Strategy

| Name | Table | Columns | Predicate / purpose |
| --- | --- | --- | --- |
| `uq_insurance_entities_partner_code_active` | `insurance_entities` | `partner_code` | Active Partner code. |
| `uq_insurance_entities_display_name_active` | `insurance_entities` | `LOWER(display_name)` | Case-insensitive active Partner name. |
| `idx_insurance_entities_status_active` | `insurance_entities` | `operational_status_reference_value_id` | Active status filtering. |
| `idx_insurance_partner_contact_partner_active` | Contact | `insurance_partner_id` | Retrieve active Contacts for a Partner. |
| `uq_insurance_partner_contact_primary_type_active` | Contact | Partner + Contact Type | Only when `is_primary = TRUE` and active. |
| `idx_insurance_product_plan_partner_active` | Plan | `insurance_partner_id` | Retrieve active plans for a Partner. |
| `uq_insurance_product_plan_partner_code_active` | Plan | Partner + `plan_code` | Active Plan code. |
| `uq_insurance_product_plan_partner_name_active` | Plan | Partner + `LOWER(plan_name)` | Active Plan name. |
| `idx_organization_partner_enablement_organization_active` | Enablement | `organization_id` | Tenant-scoped lookup. |
| `uq_organization_partner_enablement_active` | Enablement | Organization + Partner | One active relationship. |

## Check Constraints

- `ck_insurance_entities_version`: `version >= 1`.
- `ck_insurance_entities_soft_delete_consistency`: `deleted_at IS NULL` must agree with `is_deleted = FALSE`.
- Equivalent version and soft-delete consistency checks are required on each new table.
- Required text values are validated with `NULLIF(BTRIM(value), '') IS NOT NULL` checks where appropriate.

## Migration Strategy

1. Validate required Reference Data and a known valid audit actor.
2. Add root columns as nullable/defaulted, preserving current applications.
3. Deterministically map Blue Cross `name/type` to new display/type/status/audit/version fields.
4. Validate no Partner violates required Phase 7 rules; only then add `NOT NULL`, foreign keys, checks, and indexes.
5. Create the three new tables with all constraints before exposing commands.
6. Retain legacy columns and the claim payer foreign key; add compatibility comments.
7. Create migrations in small, reviewed, backward-compatible steps with post-migration validation.

## Validation

- Aggregate boundaries are preserved: Contacts are children; Plans and Enablements are independent roots.
- Tenant isolation occurs only in Organization Partner Enablement; platform Partner data has no tenant owner.
- Existing payer UUIDs and the Claim foreign key are preserved.
- Audit, soft delete, UUID, and optimistic concurrency standards are present on every new or evolved business table.

## Pause for Approval

Approve or amend this physical design. After approval, the next step is **Insurance Foundation SQL Architecture Review**; no migration will be run before that approval.
