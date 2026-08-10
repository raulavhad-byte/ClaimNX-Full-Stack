# Insurance Foundation — Logical ERD

| Field | Value |
| --- | --- |
| Module | Insurance Foundation |
| Phase | Phase 7 — Insurance Foundation |
| Status | Approved — 2026-07-30 |
| Owner | Solution Architecture |
| Date | 2026-07-30 |

## Objective

Define the approved business entities, relationships, cardinality, logical identifiers, and lifecycle boundaries for Insurance Foundation before physical database design.

## Why

The logical ERD makes the approved aggregate model visible to every later stage. It prevents tenant enablement from being confused with a shared Partner master and prevents Product/Plan, Contact, and future Contract/Coverage responsibilities from being stored in the wrong entity.

## Logical ERD

```text
Organization (existing; owned by Organization context)
     1
     | enables
     | 0..*
Organization Partner Enablement
     0..*                    1
     |                       |
     | references            | owns Contacts
     |                       | 0..*
Insurance Partner -------- Insurance Partner Contact
     1
     | owns
     | 0..*
Insurance Product / Plan

Reference Data (existing) ---> Partner Type / Contact Type / lifecycle classifications
IAM User (existing) ---------> audit actors only
```

## Entity Definitions

### Insurance Partner

**Purpose:** The canonical platform master for an Insurer, TPA, or future scheme.

| Logical attribute | Meaning |
| --- | --- |
| Insurance Partner ID | Stable system identity. |
| Partner Code | Approved, human-readable operational identifier. |
| Display Name | Business-facing Partner name. |
| Legal Name | Optional registered legal name. |
| Partner Type | Controlled Reference Data classification. |
| Registration Identifier | Optional regulated/operational registration identifier. |
| Lifecycle Status | Draft, active, suspended, or retired state. |
| Audit / Version / Deletion state | ClaimNX standard record governance. |

### Insurance Partner Contact

**Purpose:** A business communication point owned by one Insurance Partner.

| Logical attribute | Meaning |
| --- | --- |
| Insurance Partner Contact ID | Stable child identity. |
| Insurance Partner ID | Required parent relationship. |
| Contact Type | Controlled classification such as operational, billing, escalation, or integration. |
| Contact Name | Named business contact. |
| Designation | Optional business role/title. |
| Email Address | Optional business email. |
| Phone / Mobile | Operational telephone values. |
| Is Primary | Marks one active primary Contact for a Partner and Contact Type. |
| Audit / Version / Deletion state | ClaimNX standard record governance. |

### Insurance Product / Plan

**Purpose:** A reusable Partner-owned product/plan identity for future coverage and claim references.

| Logical attribute | Meaning |
| --- | --- |
| Insurance Product Plan ID | Stable independent aggregate identity. |
| Insurance Partner ID | Required owning Partner reference. |
| Plan Code | Partner-scoped business identifier. |
| Plan Name | Business-facing product/plan name. |
| Description | Optional informational description. |
| Lifecycle Status | Draft, active, inactive, or retired state. |
| Audit / Version / Deletion state | ClaimNX standard record governance. |

### Organization Partner Enablement

**Purpose:** The explicit tenant operational permission to use a platform Insurance Partner.

| Logical attribute | Meaning |
| --- | --- |
| Organization Partner Enablement ID | Stable independent aggregate identity. |
| Organization ID | Required reference to Organization context. |
| Insurance Partner ID | Required reference to Insurance Foundation Partner master. |
| Tenant Partner Code | Optional tenant-local operational alias, if later approved. |
| Lifecycle Status | Active, suspended, or retired state. |
| Audit / Version / Deletion state | ClaimNX standard record governance. |

## Relationship and Cardinality Rules

| Parent / reference | Child / dependent | Cardinality | Rule |
| --- | --- | --- | --- |
| Insurance Partner | Insurance Partner Contact | 1 to 0..many | Contact cannot exist without one Partner. |
| Insurance Partner | Insurance Product / Plan | 1 to 0..many | Each Plan references exactly one Partner; it is independently versioned. |
| Organization | Organization Partner Enablement | 1 to 0..many | Each Enablement belongs to one Organization. |
| Insurance Partner | Organization Partner Enablement | 1 to 0..many | A Partner may be enabled by many Organizations. |
| Reference Data | Partner / Contact | 1 to 0..many | Controlled values are referenced, never owned or copied. |
| IAM User | Mutable entities | 1 to 0..many | User is an audit actor, not an Insurance child. |

## Logical Uniqueness Rules

1. Partner Code is unique among active, non-retired Insurance Partners.
2. Contact primary designation is unique per active `(Insurance Partner, Contact Type)`.
3. Plan Code is unique among active, non-retired Plans of the same Partner.
4. Organization Partner Enablement is unique among active, non-retired `(Organization, Insurance Partner)` pairs.
5. Registration Identifier has no uniqueness rule until the business confirms whether it is jurisdictional, global, or optional.

## Explicit Non-Relationships

- A Patient, Policy, Coverage, Benefit, or Claim is not an Insurance Foundation entity in Phase 7.
- A Hospital is not linked directly to a Partner in this ERD; cashless empanelment and tariff agreements are future contract aggregates.
- A TPA–Insurer administration relationship is not inferred or stored until a verified routing/settlement requirement exists.
- Organization Membership, Roles, and Permissions are not owned by this ERD; they are authorization dependencies.

## Validation

- The ERD has one shared platform Partner master and separate tenant enablement records.
- Contacts remain owned children, while Plan and Enablement remain separate aggregate roots.
- No physical table names, column types, indexes, foreign-key implementation, SQL migration, API, or code has been created.

## Approval Record

Approved on 2026-07-30. The next step is **Insurance Foundation — Architecture Review**.
