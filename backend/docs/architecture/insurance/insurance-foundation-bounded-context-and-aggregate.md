# Insurance Foundation — Bounded Context and Aggregate Design

| Field | Value |
| --- | --- |
| Module | Insurance Foundation |
| Phase | Phase 7 — Insurance Foundation |
| Status | Approved — 2026-07-30 |
| Owner | Solution Architecture |
| Date | 2026-07-30 |

## Objective

Define the bounded-context boundary, aggregate roots, child ownership, cross-aggregate references, consistency rules, and lifecycle responsibilities for Insurance Foundation.

## Why

Insurance Partner data is platform master data, while tenant permission to use a partner is Organization-specific. Combining them in one aggregate would either duplicate a Partner per tenant or let a tenant mutate shared payer data. Separating the aggregates preserves master-data governance, tenant isolation, and safe future claim references.

## Bounded Context

**Context name:** Insurance Foundation

**Responsibility:** Govern reusable payer/administrator master data and the explicit tenant enablement required to use that data operationally.

**Published capabilities:**

- Partner identity and lifecycle validation.
- Partner contact management.
- Insurance Product/Plan lifecycle validation.
- Organization–Partner enablement validation.
- Read models that safely expose a Partner and only the requesting tenant's enablements.

## Approved Aggregate Model — For Approval

```text
Insurance Foundation
├── Insurance Partner                 (platform aggregate root)
│   └── Insurance Partner Contact      (owned child entity)
├── Insurance Product / Plan           (platform aggregate root; references Partner)
└── Organization Partner Enablement    (tenant aggregate root; references Partner and Organization)
```

### 1. Insurance Partner Aggregate

**Aggregate root:** Insurance Partner

**Owned child entity:** Insurance Partner Contact

**Identity:** Application-generated UUID.

**Owns:**

- Partner Code, legal/display name, approved Partner Type, registration/operational identifiers, and lifecycle.
- Partner Contacts, including primary-contact-per-contact-type rule.
- Partner-level audit, soft deletion, and optimistic concurrency.

**Does not own:**

- Products/Plans, Organization enablements, Hospital contracts, patient coverage, claims, or settlements.

**Consistency boundary:** A Contact is added, changed, made primary, or retired only through the Insurance Partner Aggregate Root. A Partner and its owned Contacts are consistent inside one transaction.

### 2. Insurance Product / Plan Aggregate

**Aggregate root:** Insurance Product / Plan

**Identity:** Application-generated UUID.

**References:** one Insurance Partner by ID.

**Owns:**

- Product/Plan Code, name, description, lifecycle, and version.
- The invariant that the referenced Partner is active when a Product/Plan is activated.

**Why it is its own aggregate:** A Product/Plan is independently managed, may become highly referenced by future coverage and claim records, and must not require loading every Product/Plan when an unrelated Partner Contact changes.

**Does not own:**

- Benefits, exclusions, eligibility, tariffs, utilization rules, patient coverage, or claims.

### 3. Organization Partner Enablement Aggregate

**Aggregate root:** Organization Partner Enablement

**Identity:** Application-generated UUID.

**References:** one Organization ID and one Insurance Partner ID.

**Owns:**

- The tenant's authorization to use a Partner.
- Enablement lifecycle, optional tenant operational identifier, audit, soft deletion, and version.

**Consistency boundary:** Enablement operations verify active Organization Membership for the actor and that the Partner is active. They never modify Partner master data.

**Does not own:**

- Organization identity/membership, Partner contacts/products, Hospital-specific empanelment, or claims.

## Cross-Aggregate Rules

1. Aggregates reference each other by UUID; no aggregate contains another aggregate's mutable state.
2. Partner activation does not automatically enable it for every Organization.
3. Partner suspension prevents new or reactivated Organization enablements and new Product/Plan activation, but preserves history.
4. Partner retirement is blocked while active Product/Plans or active Organization Enablements exist; those relationships must first be retired through their own lifecycle.
5. Product/Plan retirement does not alter historic Claim references.
6. Organization Enablement retirement does not alter the Partner or any other tenant's enablement.
7. A future claim checks both the Partner and its Organization Enablement at creation time, then stores a stable business reference/snapshot.
8. Hospital–Partner cashless contracts are a future aggregate and must not be added as columns to any Phase 7 aggregate.

## Aggregate Commands

| Aggregate | Commands |
| --- | --- |
| Insurance Partner | Create, update root attributes, add/update/retire Contact, set primary Contact, activate, suspend, retire. |
| Insurance Product/Plan | Create, update, activate, deactivate, retire. |
| Organization Partner Enablement | Enable, update tenant operational settings, suspend, reactivate, retire. |

## Consistency and Concurrency

- Each aggregate has its own `version`; updates require the client's expected version.
- Partner Contact mutations increment the parent Partner version because Contacts are children of that aggregate.
- Product/Plan and Enablement versions advance independently.
- Cross-aggregate lifecycle validation is enforced at the application/transaction boundary and later reinforced by database constraints/command functions where applicable.
- No normal operation performs physical deletion.

## Context Integration Boundaries

| External context | Interaction | Rule |
| --- | --- | --- |
| Reference Data | Partner Type, Contact Type, status values | Insurance Foundation references controlled values only. |
| Organization / IAM | Tenant identity, active Membership, permissions | Insurance Foundation verifies; it does not manage either. |
| Hospital | Future hospital network/contract reference | Hospital data is read/referenced only in a later capability. |
| Workflow | Optional future approval/lifecycle tasks | Workflow may orchestrate but does not own Insurance records. |
| Claims | Validated Partner/Plan references | Claims own historical claim values and status. |
| Financial | Payer settlement references | Financial owns receivables and settlement facts. |

## Validation

- Shared Partner master data and Organization-specific enablement are separate aggregates.
- Partner Contacts remain children and cannot exist independently.
- Product/Plans are independent roots to support independent lifecycle and future high-volume references.
- No table, field, SQL migration, API, or code has been designed or created.

## Approval Record

Approved on 2026-07-30. The next step is **Insurance Foundation — Logical ERD**.
