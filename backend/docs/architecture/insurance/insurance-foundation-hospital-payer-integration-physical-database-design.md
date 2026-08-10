# Insurance Foundation — Hospital–Payer Integration Physical Database Design

| Attribute | Value |
|---|---|
| Module | Insurance Foundation |
| Phase | Phase 7 — Insurance Foundation |
| Version | 1.0 |
| Status | Approved — 2026-08-01 |
| Predecessors | All Hospital–Payer Integration design stages approved through Workflow and Implementation Plan |
| Date | 2026-08-01 |

## Objective

Specify the production-ready PostgreSQL storage design for the approved Hospital–Payer Integration aggregate: columns, foreign keys, constraints, indexes, audit, soft-delete, and tenant isolation.

## Target Table

public.hospital_insurance_partner_integration

The table stores one non-retired operational integration profile for an initial hospital_id + insurance_partner_id pair. Multiple operational purposes for the same pair are intentionally deferred to a separate approved evolution.

## Column Definition

| Column | PostgreSQL type | Required | Purpose |
|---|---|---:|---|
| hospital_insurance_partner_integration_id | UUID | Yes | Application-generated aggregate primary key. |
| organization_id | UUID | Yes | Explicit tenant scope. |
| hospital_id | UUID | Yes | Hospital configured by this profile. |
| insurance_partner_id | UUID | Yes | Referenced platform Insurer or TPA. |
| integration_code | VARCHAR(80) | Yes | Hospital-scoped business identifier. |
| submission_channel_reference_value_id | UUID | Yes | Controlled submission channel. |
| payer_email_address | VARCHAR(320) | No | Payer email destination for the Email channel. |
| notification_email_address | VARCHAR(320) | No | Optional operational notification destination. |
| portal_url | VARCHAR(2048) | No | HTTPS RPA Portal destination. |
| portal_user_name | VARCHAR(255) | No | Non-secret portal identifier. |
| credential_secret_reference | VARCHAR(512) | No | Non-secret reference to external secret storage; never a credential value. |
| operational_status_reference_value_id | UUID | Yes | Controlled Draft / Active / Inactive lifecycle value. |
| created_by / created_at | UUID / TIMESTAMPTZ | Yes | Creation audit; timestamp default NOW(). |
| updated_by / updated_at | UUID / TIMESTAMPTZ | Yes | Update audit; timestamp default NOW(). |
| deleted_by / deleted_at | UUID / TIMESTAMPTZ | No | Soft-delete audit. |
| version | INTEGER | Yes | Optimistic concurrency; default 1. |

UUID rule: the application layer supplies hospital_insurance_partner_integration_id. This business identifier has no database UUID default.

## Tenant Isolation Design

The table persists both organization_id and hospital_id. The later migration will add this additive support constraint on the Hospital root:

UNIQUE (organization_id, id) on public.hospitals

The new integration then has a composite foreign key:

(organization_id, hospital_id) → public.hospitals(organization_id, id)

This prevents a stored integration from naming a Hospital from another Organization without altering Hospital ownership or existing Hospital API behavior.

## Foreign Keys

| Constraint name | Source column(s) | References | Delete rule |
|---|---|---|---|
| fk_hospital_partner_integration_hospital_tenant | organization_id, hospital_id | hospitals(organization_id, id) | RESTRICT |
| fk_hospital_partner_integration_partner | insurance_partner_id | insurance_entities(id) | RESTRICT |
| fk_hospital_partner_integration_channel | submission_channel_reference_value_id | reference_values(id) | RESTRICT |
| fk_hospital_partner_integration_status | operational_status_reference_value_id | reference_values(id) | RESTRICT |
| fk_hospital_partner_integration_created_by_user | created_by | users(id) | RESTRICT |
| fk_hospital_partner_integration_updated_by_user | updated_by | users(id) | RESTRICT |
| fk_hospital_partner_integration_deleted_by_user | deleted_by | users(id) | RESTRICT |

The active Organization Partner Enablement prerequisite is enforced by the application service and database command functions. A normal foreign key cannot enforce the referenced row's lifecycle state safely.

## Required Reference Data

| Category | Values | Purpose |
|---|---|---|
| HOSPITAL_PAYER_INTEGRATION_CHANNEL | EMAIL, RPA_PORTAL, API | Submission route classification. |
| HOSPITAL_PAYER_INTEGRATION_STATUS | DRAFT, ACTIVE, INACTIVE | Aggregate lifecycle classification. |

API is a reserved future channel. Its presence does not authorize an API connector or secret implementation.

## Check Constraints

| Constraint name | Rule |
|---|---|
| ck_hospital_partner_integration_version | version >= 1. |
| ck_hospital_partner_integration_code_not_blank | BTRIM(integration_code) <> ''. |
| ck_hospital_partner_integration_payer_email_not_blank | A non-null payer email cannot be whitespace-only. |
| ck_hospital_partner_integration_notification_email_not_blank | A non-null notification email cannot be whitespace-only. |
| ck_hospital_partner_integration_portal_url_not_blank | A non-null portal URL cannot be whitespace-only. |
| ck_hospital_partner_integration_portal_url_https | A non-null portal URL begins with https://. |
| ck_hospital_partner_integration_portal_user_not_blank | A non-null portal user name cannot be whitespace-only. |
| ck_hospital_partner_integration_secret_reference_not_blank | A non-null secret reference cannot be whitespace-only. |
| ck_hospital_partner_integration_soft_delete_audit | deleted_at IS NULL iff deleted_by IS NULL. |

Channel completeness and permitted status/Partner-type values depend on Reference Data. They are mandatory checks in reviewed database command functions and application services.

## Unique Constraints and Index Strategy

| Name | Definition / purpose |
|---|---|
| uq_hospitals_organization_hospital | Additive support constraint on hospitals(organization_id, id) for composite tenant FK. |
| uq_hospital_partner_integration_hospital_code_active | Unique (hospital_id, integration_code) where deleted_at IS NULL. |
| uq_hospital_partner_integration_hospital_partner_active | Unique (hospital_id, insurance_partner_id) where deleted_at IS NULL. Initial scope permits one non-retired profile for the pair. |
| idx_hospital_partner_integration_organization_hospital_active | (organization_id, hospital_id) where deleted_at IS NULL; primary list/read path. |
| idx_hospital_partner_integration_partner_active | (insurance_partner_id) where deleted_at IS NULL; governance and future routing lookup. |
| idx_hospital_partner_integration_status_active | (operational_status_reference_value_id) where deleted_at IS NULL; operational filtering. |

No index is created on credential_secret_reference, portal user name, or email address until an approved query requirement exists.

## Command Function Enforcement Requirements

Later SQL command functions must enforce transactionally:

1. Actor exists, is active, and is an active Organization Member.
2. Hospital exists, is active, and matches supplied Organization.
3. Partner exists, is active, and has INSURER or TPA Partner Type.
4. Organization Partner Enablement exists and is Active for supplied Organization and Partner.
5. Submitted channel and lifecycle values are from their approved categories.
6. An ACTIVE Email profile has a valid payer email.
7. An ACTIVE RPA Portal profile has HTTPS URL, portal user name, and credential secret reference.
8. No command accepts a plaintext secret value.
9. Updates use expected version and increment it once.
10. Reads and mutations scope by Organization and Hospital; retire is soft deletion only.

## Migration Sequence

1. Read-only preflight validates dependent tables and active audit actor availability.
2. Add uq_hospitals_organization_hospital if absent.
3. Seed the two controlled Reference Data categories and values.
4. Create hospital_insurance_partner_integration with constraints and comments.
5. Create supporting indexes.
6. Create database command functions.
7. Run post-migration validation proving tenant FKs, Reference Data, audit, version, and uniqueness structures.

Every migration is additive. No existing table is dropped or renamed, and no existing claim payer reference changes.

## Security and Data Classification

- credential_secret_reference is a sensitive reference, not a secret. It must not be returned by ordinary API reads or logged.
- Portal URL, portal user name, and payer email are confidential operational configuration requiring tenant-scoped authorization.
- Plaintext password, API token, mailbox credential, browser cookie, and session information have no column in this design.

## Validation

- Explicit organization scope is enforced by a composite Hospital tenant FK. ✅
- Existing Insurance Partner and Organization Enablement data remains unchanged. ✅
- Reference Data owns channel and lifecycle values. ✅
- Audit, soft-delete, and optimistic concurrency standards are complete. ✅
- Indexes support organization/hospital reads and governance paths. ✅
- No SQL migration or NestJS implementation has been created. ✅

## Approval Record

Approved on 2026-08-01. The next deliverable is the Hospital–Payer Integration SQL Architecture Review.
