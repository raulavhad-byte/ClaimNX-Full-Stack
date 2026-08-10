# Insurance Foundation — Domain Analysis

| Field | Value |
| --- | --- |
| Module | Insurance Foundation |
| Phase | Phase 7 — Insurance Foundation |
| Status | Approved — 2026-07-30 |
| Owner | Solution Architecture |
| Date | 2026-07-30 |

## Objective

Translate the approved Insurance Foundation business understanding into domain concepts, responsibilities, invariants, lifecycle language, and cross-context relationships without deciding physical tables or implementation.

## Why

Claims need a stable, unambiguous answer to three questions: who is the partner, what role do they perform, and which governed product/plan is referenced. Domain analysis prevents those meanings from being mixed with Organization ownership, Hospital contracts, patient coverage, or claim adjudication.

## Ubiquitous Language

| Term | Meaning | Owner |
| --- | --- | --- |
| Insurance Partner | Platform-governed business party classified as an Insurer, TPA, or Scheme. | Insurance Foundation |
| Partner Type | Controlled Reference Data classification that identifies the Partner's role. | Reference Data |
| Partner Code | Human-readable, immutable operational identifier for an Insurance Partner. | Insurance Foundation |
| Partner Contact | Contact method/person used for operational, billing, escalation, or integration communication. | Insurance Foundation |
| Insurance Product/Plan | Partner-owned offering that can later be referenced by coverage and claims. | Insurance Foundation |
| Organization Partner Enablement | A tenant's authorized operational use of an active Partner. | Insurance Foundation, subject to aggregate approval |
| Payer | The legal entity financially responsible for a claim. It may be an Insurer or Scheme; it must not be inferred from TPA type alone. | Claim Processing later |
| Administrator | A party, such as a TPA, acting operationally for a payer. | Insurance Foundation relationship, when required |
| Coverage | Patient/member eligibility and benefit relationship. | Future Coverage/Claims domain |
| Cashless Network Contract | Hospital/Partner commercial empanelment, tariffs, and routing terms. | Future Insurance Network/Contract capability |

## Domain Responsibilities

### Insurance Foundation owns

- A canonical Insurance Partner identity and controlled Partner Type.
- Partner lifecycle, code, legal/operational identifiers, and business contacts.
- Partner-owned Product/Plan identity and lifecycle.
- The explicit tenant enablement decision, if approved as part of this context.
- Validation that children retain the ownership and lifecycle boundary of their Partner.

### Insurance Foundation consumes but does not own

- Reference Data values for Partner Type, Contact Type, and lifecycle status.
- Location records for Partner Addresses, if Address support is later approved.
- IAM identity, roles, permissions, and Organization Membership.
- Organization identity used by enablement.
- Hospital identity used later by cashless-network/contract capabilities.

### Insurance Foundation must not own

- Patient policy, eligibility, benefits, balance, or member-card data.
- Claim status, pre-authorization, adjudication, denial, payment, or settlement.
- Hospital tariffs, empanelment terms, or service-level contracts.
- User access roles or tenant membership.

## Domain Concepts and Lifecycle

### Insurance Partner

An Insurance Partner is created as `DRAFT`, reviewed, and activated when it is operationally approved. It may be `SUSPENDED` when temporarily unavailable. Retirement uses soft deletion and preserves historical claim references.

Candidate lifecycle: `DRAFT → ACTIVE ↔ SUSPENDED → RETIRED`.

`RETIRED` is represented operationally through soft deletion; it is not a normal active lifecycle value for selection.

### Insurance Product/Plan

A Product/Plan is owned by exactly one Partner. It may be maintained while its Partner is in draft, but it may not be selected by downstream operations until both the Product/Plan and Partner are active.

Candidate lifecycle: `DRAFT → ACTIVE ↔ INACTIVE → RETIRED`.

### Partner Contact

A Partner Contact belongs to exactly one Partner. It is operational information, not a standalone party. A Contact may be marked primary for a controlled Contact Type; only one active primary Contact of a type is permitted per Partner.

### Organization Partner Enablement

Enablement grants a specific Organization permission to use a Partner. It does not alter the Partner's platform lifecycle. An enabled relationship is valid only when both the Organization is active and the Partner is active.

Candidate lifecycle: `ACTIVE ↔ SUSPENDED → RETIRED`.

## Domain Invariants

1. A Partner Code is unique among active, non-deleted Insurance Partners.
2. Partner Type comes from approved Reference Data and cannot be an arbitrary client value.
3. A Partner's type cannot change after it has been activated without a reviewed business migration.
4. A Product/Plan cannot exist independently of its Partner or be reassigned to a different Partner.
5. Product/Plan Code is unique among active, non-deleted Products/Plans of the same Partner.
6. A Contact cannot exist independently of its Partner or be reassigned to another Partner.
7. At most one active primary Contact exists for each `(partner, contact type)` pair.
8. An active Organization Partner Enablement requires an active, non-deleted Partner.
9. At most one active enablement exists for each `(organization, partner)` pair.
10. Retiring a Partner does not physically delete a Product/Plan, Contact, Enablement, claim reference, or historical audit record.
11. Every mutable aggregate uses audit fields and optimistic concurrency.
12. A downstream claim records a stable Partner/Product reference or snapshot and is not retroactively rewritten by master-data changes.

## Cross-Context Events and Queries

| Trigger | Insurance Foundation responsibility | Consumer |
| --- | --- | --- |
| Partner activated | Make the Partner eligible for Organization enablement and future selection. | Tenant/Claims |
| Partner suspended | Reject new operational selections; preserve historic references. | Coverage/Claims/Integrations |
| Product activated | Make it eligible for future coverage/claim selection when its Partner is active. | Coverage/Claims |
| Enablement changed | Determine whether the Organization may use the Partner. | Claim Processing |
| Claim created later | Provide validated Partner/Product identity; do not own the Claim. | Claim Processing |

## Risk and Boundary Decisions

- A TPA is not automatically a payer. Routing and settlement responsibility require an explicit Payer–Administrator relationship when a real requirement exists.
- A Plan is a master identity only in Phase 7. Benefits, exclusions, eligibility, and pricing are intentionally deferred.
- Cashless empanelment is not modeled as a flag on a Partner or Hospital. It is a future commercial relationship needing its own aggregate and audit history.
- Organization enablement is deliberately separate from Partner lifecycle; a global Partner may be active while disabled for a particular tenant.

## Validation

- The analysis preserves the approved boundary and keeps Claim, Hospital, IAM, Organization, and Reference Data ownership separate.
- No logical ERD, physical table, migration, API, or code has been created.
- All proposed lifecycle rules preserve audit history and downstream claim evidence.

## Approval Record

Approved on 2026-07-30. The next step is **Insurance Foundation — Bounded Context and Aggregate Design**.
