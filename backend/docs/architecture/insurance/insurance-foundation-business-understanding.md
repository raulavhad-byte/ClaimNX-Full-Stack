# Insurance Foundation — Business Understanding

| Field | Value |
| --- | --- |
| Module | Insurance Foundation |
| Phase | Phase 7 — Insurance Foundation |
| Status | Approved — 2026-07-30 |
| Owner | Solution Architecture |
| Date | 2026-07-30 |

## Objective

Define the business purpose, ownership boundary, operating scope, and initial rules for ClaimNX Insurance Foundation before aggregate, ERD, API, SQL, or implementation design begins.

## Why

Cashless and reimbursement claims require reliable payer information before a claim can be submitted, authorized, adjudicated, or settled. Hospitals need a governed source for insurance companies, TPAs, schemes, products, and operational contacts. Without it, each hospital or claim module would create duplicate payer data, incorrect routing, and weak auditability.

Insurance Foundation provides the master data later used by Coverage, Pre-Authorization, Claim Processing, Financial Management, Reporting, and integrations. It does not adjudicate a claim, calculate benefits, or own patient coverage.

## Existing Foundation

ClaimNX already provides IAM Users, Organizations, Organization Membership, Hospitals, Location Management, Reference Data, Audit/soft-delete standards, and Workflow Platform. Those contexts retain their ownership.

No existing insurance table, migration, API, or code is approved or changed in this stage. Any existing database structure is legacy input for the later Physical Database Design stage only.

## In Scope

- Platform-governed Insurance Partner master records for Insurers, TPAs, and future government schemes.
- Partner identity, operational/regulatory registration identifiers, lifecycle, and business contacts.
- Insurance Product/Plan master records owned by a Partner.
- An Organization-specific operational enablement relationship for an approved Partner, subject to Domain Analysis confirmation.
- Tenant-aware authorization for organization-specific reads and writes.
- Audit metadata, optimistic concurrency, soft deletion, validation, and Reference Data classifications.
- Future consumption by Coverage, Pre-Authorization, Claims, Finance, Reporting, and integrations.

## Explicitly Out of Scope

- Patient policy issuance, member cards, enrolment, eligibility, balances, or coverage verification.
- Claim submission, pre-authorization, adjudication, rejection, appeal, or settlement.
- Benefit limits, co-pay, deductible, waiting periods, tariff, package rates, or contract rule engines.
- Hospital Address, Department, and Member management.
- IAM identity, role, permission, credential, token, or SSO management.
- External insurer or TPA API implementation and frontend screens.

## Proposed Domain Boundary — For Approval

**Bounded Context:** Insurance Foundation

**Proposed primary aggregate root:** Insurance Partner

**Candidate child entities:** Insurance Partner Contact and Insurance Product/Plan.

**Candidate relationship, not yet an aggregate decision:** Organization Insurance Partner Enablement. It expresses permitted tenant use of a platform Partner; it does not copy or own the Partner master.

### Ownership rules

- Insurance Foundation owns payer/administrator masters, lifecycle, contacts, and products/plans.
- Organization owns tenant identity and membership.
- Hospital owns its operational identity; cashless empanelment and commercial contracts are later requirements.
- IAM owns identities, roles, and permissions.
- Reference Data owns controlled classifications.
- Claim Processing owns claims and their payer/product references or snapshots.
- Financial Management owns settlements and receivables.

## Candidate Business Capabilities

| Capability | Business outcome |
| --- | --- |
| Manage Insurance Partner | Authorized platform users maintain Insurer, TPA, or Scheme records. |
| Classify Partner | One master supports different partner roles without duplicate tables. |
| Manage Partner Contacts | Operational, billing, escalation, and integration contacts are governed by the Partner. |
| Manage Products/Plans | Approved products can later be selected by coverage and claims. |
| Control Lifecycle | A Partner or Product can be activated, suspended, or retired while preserving audit history. |
| Enable Partner for Organization | A tenant can use only approved active Partner relationships. |
| Provide Claim References | Claims consume references or snapshots without owning Partner master data. |

## Initial Business Rules — For Approval

1. An Insurance Partner is classified through centralized Reference Data as `INSURER`, `TPA`, or an approved future scheme type; it is not represented by duplicate insurer and TPA tables.
2. A TPA is not assumed to be the legal payer. Any administering relationship with an Insurer requires an explicit later relationship; it must never be inferred from contact data.
3. An active Insurance Partner has a unique approved business code.
4. Normal retirement is soft deletion only; an Insurance Partner is not physically deleted.
5. An inactive or retired Partner cannot be newly enabled for an Organization or selected in future coverage/claim operations.
6. Each Product/Plan belongs to one Insurance Partner and cannot be reassigned to another Partner.
7. An active Product/Plan code is unique within its owning Partner unless a later regulatory rule establishes a global identifier.
8. Partner Contacts cannot exist independently of their owning Partner.
9. Organization enablement grants operational use only; it does not make the Organization owner of a Partner.
10. Tenant filtering is never trusted from the frontend. Tenant-scoped access requires active Organization Membership and authorization.
11. Every mutable business record follows ClaimNX audit, soft-delete, and optimistic-concurrency standards.
12. Claims retain the payer/product values that applied at processing time; later master changes must not rewrite claim history.

## Decisions Needed Before Domain Analysis

1. **Partner governance:** Are Partners platform-governed, or may each Organization create private payer masters?
   - Recommended: platform-governed Partners with explicit Organization enablement.
2. **TPA relationship:** Must the first release store which Insurer a TPA administers for routing and settlement?
   - Recommended: defer until a concrete cashless-routing requirement; do not infer a relationship.
3. **Plan scope:** Are Products/Plans required in Phase 7, or deferred until Coverage/Claim design?
   - Recommended: retain a minimal Partner-owned Product/Plan master now; defer benefits and eligibility rules.
4. **Organization enablement:** Is every active platform Partner usable by default, or must an Organization explicitly enable a Partner?
   - Recommended: explicit enablement for tenant governance and auditability.
5. **Hospital network contracts:** Are cashless empanelment and negotiated tariffs required in Phase 7?
   - Recommended: no; treat as a later Insurance Network/Contract capability.

## Validation

- The proposal does not take ownership from Organization, Hospital, IAM, Reference Data, Claim, or Financial contexts.
- No SQL, migration, API, or implementation has been created.
- It supports insurers, TPAs, and schemes without conflating payer, administrator, and tenant ownership.
- It gives later claims a stable foundation without prematurely designing benefits, contracts, or coverage.

## Approval Record

Approved on 2026-07-30. The next step is **Insurance Foundation — Domain Analysis**.
