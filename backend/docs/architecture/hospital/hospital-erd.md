# Hospital Entity Relationship Diagram (ERD)

---

## 1. Document Information

| Property | Value |
|----------|-------|
| Document Name | Hospital Entity Relationship Diagram |
| Version | 1.0 |
| Module | Hospital |
| Phase | Phase 5 – Tenant Management |
| Status | Draft |
| Owner | Solution Architecture |
| Last Updated | 2026-07-28 |

---

# 2. Purpose

## Overview

This document defines the logical data model for the Hospital domain within the ClaimNX platform.

It serves as the authoritative reference for:

- Entity definitions
- Aggregate ownership
- Entity relationships
- Cardinality
- Referential integrity
- Future database schema implementation

This document intentionally excludes physical database implementation details such as SQL data types, indexes, constraints, and migration scripts. Those artifacts will be defined after the logical model is approved.

---

# 3. Scope

The Hospital ERD covers the logical entities owned by the Hospital bounded context.

Included:

- Hospital
- Hospital Address
- Hospital Contact
- Hospital Department

Excluded:

- Organization
- Users
- Roles
- Insurance Companies
- TPAs
- Claims
- Financial Transactions
- Workflow Tasks

These external domains are referenced through identifiers and remain under the ownership of their respective bounded contexts.

---

# 4. Design Principles

The Hospital ERD follows the architectural principles established in `hospital-platform-v1.md`.

## Principles

- One Aggregate Root per Hospital.
- Child entities exist only within the Hospital aggregate.
- Each entity has a single owner.
- Cross-domain references use identifiers rather than direct ownership.
- Logical relationships precede physical implementation.
- Referential integrity shall be enforced during database implementation.
- The model shall support future expansion without structural redesign.

---

# 5. Aggregate Overview

The Hospital aggregate is composed of the following logical entities.

| Entity | Role | Aggregate Ownership |
|--------|------|---------------------|
| Hospital | Aggregate Root | Hospital |
| Hospital Address | Child Entity | Hospital |
| Hospital Contact | Child Entity | Hospital |
| Hospital Department | Child Entity | Hospital |

The Hospital entity is the only Aggregate Root. All child entities have lifecycle dependency on their pare

# 6. Entity Catalogue

## 6.1 Overview

One entity acts as the Aggregate Root, while the remaining entities are lifecycle-dependent child entities.

---

## 6.2 Hospital

Hospital Lifecycle

The onboarding process is represented as lifecycle states of the Hospital
aggregate rather than as a separate entity.

Future platform phases may introduce a dedicated onboarding workflow if
business requirements evolve to include multi-step approvals, document
verification, task assignment, SLA tracking or workflow orchestration.


### Business Purpose

Represents a healthcare institution registered within an Organization (Tenant). The Hospital entity is the central business object through which all hospital-related operations are performed.

### Responsibilities

- Maintain hospital master information.
- Manage operational status.
- Own addresses, contacts, and departments.
- Provide hospital identity to downstream domains.
- Enforce tenant ownership.

### Notes

- Every Hospital belongs to exactly one Organization.
- Child entities cannot exist without a Hospital.

---

## 6.3 Hospital Address

| Property | Value |
|----------|-------|
| Entity Type | Child Entity |
| Parent Entity | Hospital |
| Owned By | Hospital Domain |
| Lifecycle | Dependent |

### Business Purpose

Represents a physical or mailing address associated with a Hospital.

### Responsibilities

- Store hospital location details.
- Support multiple address types.
- Integrate with the Location Management module.
- Maintain address history if required in future phases.

### Notes

- A Hospital may own multiple addresses.
- An address cannot exist independently.

---

## 6.4 Hospital Contact

| Property | Value |
|----------|-------|
| Entity Type | Child Entity |
| Parent Entity | Hospital |
| Owned By | Hospital Domain |
| Lifecycle | Dependent |

### Business Purpose

Represents contact information associated with a Hospital, such as administrative, operational, or emergency contacts.

### Responsibilities

- Store contact information.
- Support multiple contact types.
- Identify primary contact information.
- Provide communication details for business operations.

### Notes

- Multiple contacts may exist for a Hospital.
- Contacts have no independent lifecycle.

---

## 6.5 Hospital Department

| Property | Value |
|----------|-------|
| Entity Type | Child Entity |
| Parent Entity | Hospital |
| Owned By | Hospital Domain |
| Lifecycle | Dependent |

### Business Purpose

Represents an operational department within a Hospital.

### Responsibilities

- Maintain department master data.
- Support operational workflows.
- Enable assignment of users and future business processes.
- Provide organizational structure within a Hospital.

### Notes

- Departments exist only within a Hospital.
- Future phases may extend departments with specialties, services, and workflow assignments.

---

## 6.6 Aggregate Ownership Summary

| Entity | Aggregate Root | Lifecycle |
|---------|----------------|-----------|
| Hospital | Yes | Independent |
| Hospital Address | No | Dependent |
| Hospital Contact | No | Dependent |
| Hospital Department | No | Dependent |

The Hospital Aggregate Root owns and controls the lifecycle of all child entities. Child entities sha

# 7. Entity Relationships & Cardinality

## 7.1 Overview

The Hospital aggregate follows a parent-child relationship model.

The Hospital entity is the Aggregate Root and owns the lifecycle of all child entities. Child entities cannot exist independently and shall always be associated with exactly one Hospital.

---

## 7.2 Internal Relationships

| Parent Entity | Child Entity | Cardinality | Relationship Type | Ownership |
|---------------|--------------|-------------|-------------------|-----------|
| Hospital | Hospital Address | One-to-Many (1:N) | Composition | Hospital |
| Hospital | Hospital Contact | One-to-Many (1:N) | Composition | Hospital |
| Hospital | Hospital Department | One-to-Many (1:N) | Composition | Hospital |

### Relationship Rules

- A Hospital may have zero or many Addresses.
- A Hospital may have zero or many Contacts.
- A Hospital may have zero or many Departments.
- Every Address must belong to exactly one Hospital.
- Every Contact must belong to exactly one Hospital.
- Every Department must belong to exactly one Hospital.

---

## 7.3 Cross-Domain References

The Hospital domain references entities owned by other bounded contexts through identifiers only.

| External Domain | Referenced Entity | Relationship | Ownership |
|-----------------|-------------------|--------------|-----------|
| Organization | Organization | Many Hospitals belong to one Organization | Organization Domain |
| Reference Data | Status, Type, Category | Lookup Reference | Reference Data Domain |
| Location Management | Country, State, City | Lookup Reference | Location Management Domain |

The Hospital domain shall not own or modify data managed by external domains.

---

## 7.4 Relationship Diagram

```text
                   Organization
                         │
                         │ 1
                         │
                         ▼
                  +---------------+
                  |   Hospital    |
                  +---------------+
                    │     │     │
          1:N       │     │     │      1:N
                    ▼     ▼     ▼
          +-----------+ +-----------+ +------------------+
          | Address   | | Contact   | | Department       |
          +-----------+ +-----------+ +------------------+

External References

Hospital
   ├── Reference Data
   └── Location Management
```

---

## 7.5 Relationship Constraints

The following logical constraints apply:

- Child entities shall not exist without a parent Hospital.
- Deleting a Hospital shall remove or archive dependent child entities according to business policy.
- Cross-domain relationships shall be maintained through identifiers rather than aggregate ownership.
- Aggregate boundaries shall not be bypassed by direct child entity manipulation.

---

## 7.6 Future Relationship Extensions

Future phases may introduce additional logical relationships, including:

| Future Entity | Relationship |
|---------------|--------------|
| Hospital User Assignment | Hospital → User Assignment (1:N) |
| Hospital Insurance Network | Hospital → Insurance Network (1:N) |
| Hospital Service | Hospital → Service (1:N) |
| Hospital Specialty | Hospital → Specialty (1:N) |
| Hospital Facility | Hospital → Facility (1:N) |

These future entities shall remain separate from the current aggregate until their respective phase

# 8. Business Rules & Entity Constraints

## 8.1 Overview

This section defines the business rules governing the Hospital aggregate and its child entities.

These rules represent logical constraints and business policies. They are independent of implementation technology and shall be enforced consistently across the application.

---

## 8.2 Hospital Rules

| Rule ID | Business Rule |
|----------|---------------|
| BR-001 | Every Hospital shall belong to exactly one Organization (Tenant). |
| BR-002 | A Hospital cannot exist without an Organization. |
| BR-003 | A Hospital name shall be unique within an Organization. |
| BR-004 | A Hospital shall have exactly one operational status at any point in time. |
| BR-005 | A Hospital may transition between Active and Inactive states according to business policy. |
| BR-006 | Soft-deleted Hospitals shall not be available for operational use. |

---

## 8.3 Address Rules

| Rule ID | Business Rule |
|----------|---------------|
| BR-101 | Every Address shall belong to exactly one Hospital. |
| BR-102 | A Hospital may have multiple Addresses. |
| BR-103 | Address type shall be selected from approved reference data. |
| BR-104 | Address records shall not exist independently of a Hospital. |

---

## 8.4 Contact Rules

| Rule ID | Business Rule |
|----------|---------------|
| BR-201 | Every Contact shall belong to exactly one Hospital. |
| BR-202 | A Hospital may have multiple Contacts. |
| BR-203 | Contact type shall be selected from approved reference data. |
| BR-204 | At most one Contact of a given type may be designated as the primary contact. |

---

## 8.5 Department Rules

| Rule ID | Business Rule |
|----------|---------------|
| BR-301 | Every Department shall belong to exactly one Hospital. |
| BR-302 | A Hospital may contain multiple Departments. |
| BR-303 | Department names shall be unique within a Hospital. |
| BR-304 | Departments cannot exist independently of a Hospital. |

---

## 8.6 Aggregate Rules

The Hospital Aggregate shall enforce the following rules:

- Child entities shall always be managed through the Hospital Aggregate Root.
- Child entities shall not be reassigned to another Hospital after creation.
- Aggregate consistency shall be maintained within a single business transaction.
- Cross-aggregate updates shall occur through application services rather than direct entity manipulation.

---

## 8.7 Tenant Isolation Rules

The Hospital domain shall enforce strict tenant isolation.

- Organizations shall access only their own Hospitals.
- Child entities shall inherit the tenant context of their parent Hospital.
- Cross-tenant relationships are prohibited.
- Tenant ownership shall be validated before any create, update, delete, or read operation.

---

## 8.8 Soft Deletion Policy

The Hospital domain adopts a soft deletion strategy.

Business expectations include:

- Deleted records remain available for audit purposes.
- Soft-deleted Hospitals are excluded from operational workflows.
- Child entity handling during deletion shall follow the platform retention policy.
- Restoration procedures, if supported, shall preserve aggregate consistency.

---

## 8.9 Future Business Rules

Future phases may introduce additional constraints related to:

- Insurance network participation
- Department specialties
- Hospital accreditation
- Workflow eligibility
- Financial settlement eligibility
- AI-driven validation policies

These rules shall extend the aggregate without changing its ownership model.

# 9. Logical Data Dictionary

## 9.1 Overview

The logical data dictionary defines the business attributes owned by each entity within the Hospital aggregate.

These attributes describe business information only and intentionally exclude physical implementation details such as SQL data types, column sizes, indexes, or storage mechanisms.

---

## 9.2 Hospital

| Attribute | Required | Description |
|-----------|----------|-------------|
| Organization Identifier | Yes | Identifies the owning Organization (Tenant). |
| Hospital Code | Yes | Business identifier for the Hospital. |
| Hospital Name | Yes | Official name of the Hospital. |
| Display Name | No | User-friendly display name. |
| Registration Number | No | Government or regulatory registration identifier. |
| Hospital Type | Yes | Classification of the Hospital from Reference Data. |
| Ownership Type | Yes | Ownership category from Reference Data. |
| Operational Status | Yes | Current operational status. |
| Primary Address Identifier | No | Identifies the primary address. |
| Primary Contact Identifier | No | Identifies the primary contact. |
| Remarks | No | Additional operational notes. |

---

## 9.3 Hospital Address

| Attribute | Required | Description |
|-----------|----------|-------------|
| Hospital Identifier | Yes | Parent Hospital reference. |
| Address Type | Yes | Type of address from Reference Data. |
| Address Line 1 | Yes | Primary street address. |
| Address Line 2 | No | Additional address information. |
| Landmark | No | Nearby landmark. |
| Country Identifier | Yes | Country reference. |
| State Identifier | Yes | State or Province reference. |
| City Identifier | Yes | City reference. |
| Postal Code | Yes | Postal or ZIP code. |
| Primary Address Flag | Yes | Indicates whether this is the primary address. |

---

## 9.4 Hospital Contact

| Attribute | Required | Description |
|-----------|----------|-------------|
| Hospital Identifier | Yes | Parent Hospital reference. |
| Contact Type | Yes | Administrative, Billing, Emergency, etc. |
| Contact Name | Yes | Name of the contact person. |
| Designation | No | Job title or designation. |
| Email Address | No | Business email address. |
| Phone Number | Yes | Primary phone number. |
| Mobile Number | No | Mobile phone number. |
| Primary Contact Flag | Yes | Indicates whether this is the primary contact. |

---

## 9.5 Hospital Department

| Attribute | Required | Description |
|-----------|----------|-------------|
| Hospital Identifier | Yes | Parent Hospital reference. |
| Department Code | Yes | Business identifier for the department. |
| Department Name | Yes | Official department name. |
| Department Type | No | Department classification from Reference Data. |
| Operational Status | Yes | Current department status. |
| Description | No | Additional department information. |

---

## 9.6 Common Platform Attributes

The following logical attributes shall be present on all entities as part of the platform standards.

| Attribute | Purpose |
|-----------|---------|
| Entity Identifier | Unique identifier for the entity. |
| Tenant Identifier | Supports tenant isolation. |
| Created By | User who created the record. |
| Created On | Creation timestamp (UTC). |
| Updated By | User who last modified the record. |
| Updated On | Last modification timestamp (UTC). |
| Deleted By | User who performed soft deletion, if applicable. |
| Deleted On | Soft deletion timestamp, if applicable. |
| Version | Supports optimistic concurrency. |

---

## 9.7 Reference Data Dependencies

The Hospital aggregate depends on standardized reference data for the following logical attributes:

| Entity | Attribute |
|---------|-----------|
| Hospital | Hospital Type |
| Hospital | Ownership Type |
| Hospital | Operational Status |
| Hospital Address | Address Type |
| Hospital Contact | Contact Type |
| Hospital Department | Department Type |
| Hospital Department | Operational Status |

Reference values are owned and managed by the Reference Data bounded context.

---

## 9.8 Design Notes

The logical data dictionary shall serve as the authoritative source for:

- Physical database schema
- SQL migration scripts
- Domain entities
- DTO definitions
- API contracts
- Validation rules

Any future additions or modifications to entity attributes shall first be reflected in this document

# 10. ERD Diagram & Aggregate Visualization

## 10.1 Overview

The following logical ERD represents the Hospital aggregate within the Hospital bounded context.

The diagram illustrates ownership, aggregate boundaries, child entities, and external references. It is a conceptual model intended to guide implementation and does not represent the physical database schema.

---

## 10.2 Aggregate Boundary

```text
┌───────────────────────────────────────────────────────────────┐
│                    Hospital Aggregate                         │
│                                                               │
│  ┌──────────────────────────────┐                             │
│  │          Hospital            │                             │
│  │      (Aggregate Root)        │                             │
│  └──────────────┬───────────────┘                             │
│                 │                                             │
│      ┌──────────┼──────────┐                                  │
│      │          │          │                                  │
│      ▼          ▼          ▼                                  │
│ ┌──────────┐ ┌──────────┐ ┌────────────────┐                  │
│ │ Address  │ │ Contact  │ │ Department     │                  │
│ └──────────┘ └──────────┘ └────────────────┘                  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## 10.3 Logical Entity Relationships

| Parent | Child | Cardinality | Ownership |
|---------|-------|-------------|-----------|
| Hospital | Hospital Address | 1 : N | Hospital |
| Hospital | Hospital Contact | 1 : N | Hospital |
| Hospital | Hospital Department | 1 : N | Hospital |

All child entities are lifecycle-dependent on the Hospital aggregate root.

---

## 10.4 External Domain References

```text
                    +------------------------+
                    |    Organization        |
                    +-----------+------------+
                                |
                                |
                                ▼
                        +---------------+
                        |   Hospital    |
                        +---------------+
                           ▲     ▲
                           │     │
                           │     │
              +------------+     +-------------+
              |                              |
              ▼                              ▼
     Reference Data                 Location Management
```

External domains provide reference information only. They do not own or modify Hospital entities.

---

## 10.5 Aggregate Ownership Matrix

| Entity | Aggregate Root | Parent | Independent Lifecycle |
|---------|----------------|--------|------------------------|
| Hospital | Yes | None | Yes |
| Hospital Address | No | Hospital | No |
| Hospital Contact | No | Hospital | No |
| Hospital Department | No | Hospital | No |

---

## 10.6 Implementation Guidance

The logical ERD establishes the following implementation principles:

- The Hospital entity shall be implemented as the Aggregate Root.
- Child entities shall always be created, updated, and removed through the Hospital aggregate.
- Cross-domain references shall use identifiers rather than shared ownership.
- Physical foreign keys, indexes, and constraints shall be defined during database schema design.
- Future extensions shall preserve the aggregate boundary and avoid introducing cyclic dependencies.

---

## 10.7 ERD Review Checklist

Before beginning physical database design, confirm that:

- All entities have a clearly defined business purpose.
- Aggregate ownership is unambiguous.
- Relationships match documented business rules.
- Cross-domain references are identifier-based.
- No child entity has an independent lifecycle.
- Logical attributes are complete.
- Future extensibility has been considered.

Approval of this checklist signifies that the logical ERD is ready to be translated into the phy