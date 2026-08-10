# Hospital Physical Database Design

## 1. Document Information

| Property | Value |
|---|---|
| Module | Hospital |
| Phase | Phase 5 – Tenant Management |
| Version | 1.0 |
| Status | Approved and implemented - validated in Supabase on 2026-07-30 |
| Database | PostgreSQL on Supabase |
| Purpose | Physical design for the Hospital Aggregate |

## 2. Objective and Scope

This document translates the approved Hospital logical model into a safe PostgreSQL design. Hospital is the Aggregate Root. Hospital Address, Hospital Contact, and Hospital Department are lifecycle-dependent child entities.

Included: tables, columns, foreign keys, uniqueness, indexes, checks, migration strategy, and approved migration implementation. Excluded: API code and frontend implementation.

## 3. Governing Standards

- UUID identifiers are generated in the application layer for all new business entities.
- Every business entity has `created_by`, `created_at`, `updated_by`, `updated_at`, `deleted_by`, `deleted_at`, and `version`.
- Normal business deletion is soft deletion only.
- `version` starts at `1` and supports optimistic concurrency.
- Tenant filtering is mandatory in the database access, service, and API layers.
- Reference Data, Location Management, Organization, and IAM retain ownership of their own records.

## 4. Existing Database Compatibility Decision

The existing root table `public.hospitals(id)` is referenced by Claims, Orders, Users, Workflow, Audit Logs, Patient Documents, Departments, and other platform tables. It must not be renamed, dropped, or recreated.

`public.hospitals(id)` is therefore an approved compatibility exception to the new naming standard. New child tables use the approved singular naming convention.

The existing `hospital_profiles` migration is not approved and must not be executed:

`supabase/migrations/20260726134000_create_hospital_profiles.sql`

There is no Hospital Profile entity in the approved aggregate.

## 5. Hospital Root Physical Design

### 5.1 Objective

Evolve `public.hospitals` without breaking existing foreign-key dependencies or losing the two existing Hospital records.

### 5.2 Target Fields

| Field | Type | Required | Purpose |
|---|---|---|---|
| `id` | UUID | Yes | Existing Hospital identifier |
| `organization_id` | UUID | Yes | Tenant owner |
| `hospital_code` | VARCHAR(50) | Yes | Organization-scoped business identifier |
| `hospital_name` | VARCHAR(200) | Yes | Official Hospital name |
| `legal_name` | VARCHAR(250) | No | Registered legal name |
| `display_name` | VARCHAR(250) | No | Operational display name |
| `registration_number` | VARCHAR(100) | No | Standardized regulatory registration number |
| `hospital_type_reference_value_id` | UUID | Yes after backfill | Hospital Type Reference Value |
| `ownership_type_reference_value_id` | UUID | Yes after backfill | Ownership Type Reference Value |
| `operational_status_reference_value_id` | UUID | Yes after backfill | Operational Status Reference Value |
| `primary_address_id` | UUID | No | Selected primary Address child |
| `primary_contact_id` | UUID | No | Selected primary Contact child |
| `remarks` | VARCHAR(1000) | No | Operational notes |
| Audit and version fields | Standard | Yes | Platform audit and concurrency |

### 5.3 Legacy Fields

Address, contact, `registration_no`, `hospital_type`, `status`, `gst_no`, `pan_no`, `wallet_balance`, `parent_hospital_id`, and `is_deleted` are preserved during migration. `wallet_balance` remains owned by Financial Management. `parent_hospital_id` is preserved but is not part of the approved Hospital Aggregate.

## 6. Hospital Address Physical Design

### 6.1 Table and Ownership

Table: `hospital_address`.

Hospital Address is owned by Hospital and cannot exist without `public.hospitals(id)`.

### 6.2 Columns

| Column | Type | Required | Purpose |
|---|---|---|---|
| `hospital_address_id` | UUID | Yes | Application-generated primary key |
| `hospital_id` | UUID | Yes | Parent Hospital |
| `address_type_reference_value_id` | UUID | Yes | Address Type Reference Value |
| `address_line1` | VARCHAR(255) | Yes | Main address |
| `address_line2` | VARCHAR(255) | No | Additional address |
| `landmark` | VARCHAR(255) | No | Nearby landmark |
| `country_id` | UUID | Yes | Location Management Country |
| `state_id` | UUID | Yes | Location Management State |
| `city_id` | UUID | Yes | Location Management City |
| `postal_code` | VARCHAR(20) | Yes | Postal or PIN code |
| `is_primary` | BOOLEAN | Yes | Primary-address flag; defaults to `false` |
| Audit and version fields | Standard | Yes | Platform audit and concurrency |

### 6.3 Rules

- Only one active primary Address may exist per Hospital.
- City, State, and Country must form a valid Location Management hierarchy.
- The two existing Hospital address records will be migrated after location mapping is validated.

## 7. Hospital Contact Physical Design

### 7.1 Table and Ownership

Table: `hospital_contact`.

Hospital Contact is owned by Hospital and cannot exist without `public.hospitals(id)`.

### 7.2 Columns

| Column | Type | Required | Purpose |
|---|---|---|---|
| `hospital_contact_id` | UUID | Yes | Application-generated primary key |
| `hospital_id` | UUID | Yes | Parent Hospital |
| `contact_type_reference_value_id` | UUID | Yes | Contact Type Reference Value |
| `contact_name` | VARCHAR(200) | Yes | Contact person name |
| `designation` | VARCHAR(150) | No | Business designation |
| `email_address` | VARCHAR(320) | No | Business email address |
| `phone_number` | VARCHAR(30) | Yes | Primary business telephone number |
| `mobile_number` | VARCHAR(30) | No | Mobile telephone number |
| `is_primary` | BOOLEAN | Yes | Primary Contact for its Contact Type; defaults to `false` |
| Audit and version fields | Standard | Yes | Platform audit and concurrency |

### 7.3 Rules

- Only one active primary Contact may exist per Hospital and Contact Type.
- Email and telephone formats are validated in the application layer.
- Existing `contact_person`, `email`, and `phone` values will be migrated into one primary Contact for each Hospital.

## 8. Hospital Department Physical Design

### 8.1 Target Table and Ownership

Target table: `hospital_department`.

Hospital Department is owned by Hospital and cannot exist without `public.hospitals(id)`.

### 8.2 Columns

| Column | Type | Required | Purpose |
|---|---|---|---|
| `hospital_department_id` | UUID | Yes | Application-generated primary key |
| `hospital_id` | UUID | Yes | Parent Hospital |
| `department_code` | VARCHAR(50) | Yes | Hospital-scoped business identifier |
| `department_name` | VARCHAR(200) | Yes | Official department name |
| `department_type_reference_value_id` | UUID | No | Department Type Reference Value |
| `operational_status_reference_value_id` | UUID | Yes | Operational Status Reference Value |
| `description` | TEXT | No | Operational information |
| Audit and version fields | Standard | Yes | Platform audit and concurrency |

### 8.3 Compatibility Rule

`public.departments` has zero records and `hospital_members` is its only identified dependency. It will be renamed in place to `public.hospital_department`; PostgreSQL preserves the existing foreign-key relationship during this rename. The legacy `hospital_members.department_id` column remains unchanged as a compatibility boundary owned by the Organization/IAM domain. No Department table will be dropped.

## 9. Foreign Key Design

### 9.1 Root and Child Relationships

| Source | Target | Delete Rule |
|---|---|---|
| `hospitals.organization_id` | `organizations.id` | RESTRICT |
| `hospital_address.hospital_id` | `hospitals.id` | RESTRICT |
| `hospital_contact.hospital_id` | `hospitals.id` | RESTRICT |
| `hospital_department.hospital_id` | `hospitals.id` | RESTRICT |
| Reference-value fields | `reference_values.id` | RESTRICT |
| Address location fields | `countries.id`, `states.id`, `cities.id` | RESTRICT |
| Audit actor fields | `users.id` | RESTRICT |

### 9.2 Primary Address and Contact Integrity

The Hospital root may select `primary_address_id` and `primary_contact_id`. The final migration must enforce that the selected child belongs to the same Hospital through composite foreign keys and deferred validation.

This is implemented by `20260730095000_enforce_hospital_primary_child_integrity.sql`.

## 10. Unique Constraint Design

| Name | Rule |
|---|---|
| `uq_hospitals_organization_hospital_code_active` | Active Hospital Code is unique within an Organization |
| `uq_hospitals_organization_hospital_name_active` | Active Hospital Name is unique within an Organization |
| `uq_hospital_address_primary_active` | One active primary Address per Hospital |
| `uq_hospital_contact_primary_type_active` | One active primary Contact per Hospital and Contact Type |

The Hospital root constraints and active indexes are implemented by
`20260730095500_enforce_hospital_root_integrity.sql`.
| `uq_hospital_department_code` | Department Code is unique within a Hospital |
| `uq_hospital_department_name` | Department Name is unique within a Hospital |

Active uniqueness means `deleted_at IS NULL`. During root-table transition, it also respects legacy `is_deleted = false`.

## 11. Index Strategy

- `idx_hospitals_organization_active` supports active Hospital lists within an Organization.
- `idx_hospitals_operational_status_active` supports active Hospital status filtering.
- `idx_hospital_address_hospital_active` supports Address retrieval by Hospital.
- `idx_hospital_address_city_id` supports approved location search.
- `idx_hospital_contact_hospital_active` supports Contact retrieval by Hospital.
- `idx_hospital_department_hospital_active` supports Department retrieval by Hospital.
- `idx_hospital_department_operational_status_active` supports approved Department status filtering.

Audit fields are not indexed without an approved reporting requirement.

## 12. Check Constraint Design

| Constraint | Rule |
|---|---|
| `ck_hospitals_version` | `version >= 1` |
| `ck_hospitals_hospital_code_not_blank` | Hospital Code is not empty or whitespace |
| `ck_hospitals_hospital_name_not_blank` | Hospital Name is not empty or whitespace |
| `ck_hospital_address_version` | `version >= 1` |
| `ck_hospital_address_line1_not_blank` | Address Line 1 is not empty or whitespace |
| `ck_hospital_address_postal_code_not_blank` | Postal Code is not empty or whitespace |
| `ck_hospital_contact_version` | `version >= 1` |
| `ck_hospital_contact_name_not_blank` | Contact Name is not empty or whitespace |
| `ck_hospital_contact_phone_not_blank` | Phone Number is not empty or whitespace |
| `ck_hospital_department_version` | `version >= 1` |
| `ck_hospital_department_code_not_blank` | Department Code is not empty or whitespace |
| `ck_hospital_department_name_not_blank` | Department Name is not empty or whitespace |

Reference Value category checks, email validation, phone validation, and location-hierarchy validation are enforced in application services.

## 13. Migration Strategy

### 13.1 Source of Truth

Approved Hospital migrations are stored in `src/database/migrations`, committed to GitHub, and applied through the controlled Supabase SQL workflow.

### 13.2 Safe Order

1. Create missing Reference Data categories and values: Ownership Type, Operational Status, Hospital Address Type, and Hospital Contact Type.
2. Add nullable target fields to `public.hospitals`.
3. Backfill Hospital Reference Data identifiers.
4. Create `hospital_address` and migrate legacy address data after location preflight validation.
5. Create `hospital_contact` and migrate legacy contact data.
6. Evolve the empty Department structure after dependency review.
7. Add final foreign keys, partial unique indexes, and check constraints.
8. Validate data counts and application compatibility.

### 13.3 Validation Requirements

- Hospital count remains `2`.
- Primary Address count becomes `2`.
- Primary Contact count becomes `2`.
- Department count remains `0`.
- Tenant ownership, dependent foreign keys, and legacy values are preserved.

### 13.4 Rollback Rule

Migrations are forward-only. A failed transaction rolls back. A completed migration is corrected with a new reviewed migration; it is never edited or rerun.

## 14. Architecture Review and Approval Gate

### Objective

Confirm that the physical design is complete and safe before any SQL migration is written.

### Review Checklist

- Aggregate boundaries are preserved.
- Tenant isolation is enforced through `organization_id` and `hospital_id`.
- Audit, soft deletion, and optimistic concurrency are specified.
- Cross-domain ownership boundaries are preserved.
- Existing Hospital data and dependencies are protected.
- Reference Data and Location Management dependencies are documented.
- Foreign keys, uniqueness, indexes, checks, and migration sequencing are defined.

### Pause for Approval

No SQL migration, NestJS code, API, or test implementation may begin until this document is reviewed and approved.
