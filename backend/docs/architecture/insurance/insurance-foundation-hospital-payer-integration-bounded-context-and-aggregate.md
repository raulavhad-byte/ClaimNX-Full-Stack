# Insurance Foundation — Hospital–Payer Integration Bounded Context and Aggregate Design

| Attribute | Value |
|---|---|
| Module | Insurance Foundation |
| Phase | Phase 7 — Insurance Foundation |
| Version | 1.0 |
| Status | Approved — 2026-08-01 |
| Predecessors | Hospital–Payer Integration Business Understanding and Domain Analysis, approved 2026-08-01 |
| Date | 2026-08-01 |

## Objective

Define the bounded-context responsibility, aggregate root, child ownership, references, command consistency boundary, and integration rules for Hospital–Payer Integration.

## Why

The Hospital bounded context owns Hospital identity and lifecycle. Insurance Foundation owns the reusable Insurer/TPA master and the operational payer connectivity required by ClaimNX. Modelling portal/email configuration as a Hospital child would violate that ownership boundary; modelling it on the shared Partner would leak one Hospital’s operational details to other Hospitals.

## Bounded Context Amendment

**Context name:** Insurance Foundation

**New responsibility:** Govern Hospital-specific, tenant-authorized operational destination profiles for approved platform Insurers and TPAs.

**Published capability:** Hospital–Payer Integration lifecycle and safe configuration read models. The capability exposes configuration metadata only; it never exposes secret values or executes external transmission.

## Updated Aggregate Landscape

```text
Insurance Foundation
├── Insurance Partner                         platform aggregate root
│   └── Insurance Partner Contact             owned child entity
├── Insurance Product / Plan                  platform aggregate root
├── Organization Partner Enablement           tenant aggregate root
└── Hospital–Payer Integration                tenant operational aggregate root
```

`Hospital–Payer Integration` is a fourth, independent aggregate root. It is not a child of Hospital, Insurance Partner, or Organization Partner Enablement.

## Hospital–Payer Integration Aggregate

### Aggregate root

**Name:** `HospitalInsurancePartnerIntegration`

**Identity:** Application-generated UUID.

**Purpose:** Represent one Hospital’s governed operational destination for one platform Insurance Partner (Insurer or TPA).

### Owned value objects

The aggregate owns immutable/value-object-style configuration concepts. They do not have independent identities or repositories:

| Value object | Responsibility |
|---|---|
| Submission Channel Configuration | Channel selection and its channel-specific non-secret details. |
| Email Destination | Validated payer-facing email address and optional notification address. |
| Portal Destination | HTTPS portal URL, portal user name, and non-secret credential reference. |
| Lifecycle State | Draft/active/inactive/retired behavior using controlled values. |

The exact physical storage shape is deferred to the Logical ERD and Physical Database Design stages. A value object may be flattened into one table; it does not imply a child table.

### Aggregate references

| Reference | Reason | Ownership rule |
|---|---|---|
| `hospital_id` | Identifies the Hospital whose operational route is configured. | Hospital owns the referenced record. |
| `insurance_partner_id` | Identifies the shared Insurer or TPA destination. | Insurance Partner owns the referenced record. |
| Organization tenant context | Enforces access through the Hospital’s Organization. | Organization owns tenant identity; the exact persistence approach is deferred. |
| Organization Partner Enablement | Prerequisite authorizing the Organization to use the Partner. | Enablement remains an independent aggregate. |
| Controlled channel/status values | Prevent free-text operational state. | Reference Data owns values. |
| Credential secret reference | Locates a secret outside the business database. | Future Secret Management capability owns the secret. |

### The aggregate owns

- Hospital–Partner integration business identifier and destination purpose when later approved;
- selected submission channel and non-secret configuration;
- integration lifecycle;
- audit records, soft-delete state, and version;
- validation that the configuration is internally complete for its selected channel.

### The aggregate does not own

- Hospital details, Hospital addresses, departments, staff, or Hospital membership;
- Partner name, Partner classification, Partner contacts, and product plans;
- Organization membership or Partner Enablement lifecycle;
- passwords, API keys, tokens, email mailbox credentials, browser sessions, or cookies;
- claims, documents, pre-authorizations, payer replies, email messages, RPA jobs, or workflow tasks.

## Aggregate Invariants

The aggregate root enforces the following before persistence:

1. It has exactly one Hospital reference and exactly one Insurance Partner reference.
2. The Partner classification is restricted to `INSURER` or `TPA`.
3. The Hospital and authenticated actor resolve to the same Organization tenant.
4. The Organization has an active Partner Enablement for the referenced Partner when an integration is created, activated, or reactivated.
5. One active configuration has one selected submission channel.
6. Email configuration requires a normalized payer email address.
7. RPA Portal configuration requires an HTTPS URL, portal user name, and a non-secret credential reference.
8. API configuration is reserved; it requires a future approved connector contract and may never contain a plaintext secret.
9. A secret value is never accepted into the aggregate, including transient command data.
10. A soft-deleted integration cannot be updated, activated, or selected.
11. Every successful mutable command requires expected version and increments the aggregate version once.

Cross-aggregate checks (Hospital/Partner/Enablement lifecycle, actor membership) are performed by the application service and later reinforced in approved database command functions. They are not silently bypassed by the aggregate.

## Commands and Transaction Boundary

| Command | Aggregate action | Required cross-aggregate validation |
|---|---|---|
| Create | Construct a Draft or Active integration, depending on approved workflow. | Active Hospital, valid Insurer/TPA, active Enablement, active actor membership. |
| Update configuration | Replace validated channel configuration and non-secret destination metadata. | Tenant and expected-version match; integration not retired. |
| Activate | Change lifecycle to Active. | Revalidate Hospital, Partner, Enablement, and complete channel configuration. |
| Deactivate | Change lifecycle to Inactive. | Tenant and expected-version match. |
| Retire | Soft delete the aggregate. | Tenant and expected-version match; future Claim Processing reference policy applied when introduced. |

Each command persists only this aggregate. It must not mutate Hospital, Partner, Enablement, Workflow, or Claim records in the same aggregate transaction.

## Cross-Aggregate Consistency Policies

| Event / condition | Policy |
|---|---|
| Hospital becomes inactive or retired | Integration remains historical but cannot be selected, activated, or reactivated. |
| Partner becomes suspended or retired | Integration remains historical but cannot be newly created, activated, or reactivated. |
| Organization Partner Enablement becomes inactive/retired | Integration remains historical but is unavailable for future selection and activation. |
| Partner contact changes | Does not alter Hospital-specific operational destination data. |
| Hospital contact changes | Does not alter payer destination data. |
| Future claim starts | Claim Processing selects a valid Active integration and persists a stable payer/integration snapshot under its own rules. |
| Future RPA/email run fails | Automation records operational failure; it does not directly alter Integration lifecycle without an approved command/workflow. |

## Tenant Isolation

The aggregate is Hospital-scoped and must be tenant-safe at every layer:

```text
JWT actor
  → active Organization Membership
  → requested Organization
  → Hospital belongs to Organization
  → Hospital–Payer Integration belongs to Hospital
  → Partner is enabled for Organization
```

No frontend filtering, supplied Hospital ID, or supplied Partner ID is trusted without server-side validation.

## Security Boundary

- Command DTOs will accept only `credentialSecretReference`; they will not define password/token fields.
- Read DTOs will expose at most `credentialConfigured` and must not expose the secret reference unless a separate approved administrative security use case requires it.
- Logs, audit descriptions, events, tests, SQL, and exception messages must redact secret-adjacent data.
- Future secret access is delegated to a dedicated secure capability, not this aggregate or repository.

## Consequences for the Existing Phase 7 Model

- `InsurancePartner` remains platform master data.
- `OrganizationInsurancePartnerEnablement` remains a tenant authorization prerequisite.
- No field is added to Hospital, Insurance Partner, or Organization Partner Enablement to hold a Hospital-specific portal/email profile.
- The existing Organization Partner Enablement is not replaced or retired by this aggregate.

## Validation

- Aggregate ownership remains within Insurance Foundation. ✅
- Hospital and Partner remain referenced external aggregates. ✅
- Partner Enablement remains independent and is used as a prerequisite. ✅
- Channel configuration and secrets have clear ownership boundaries. ✅
- No database table, SQL migration, API, or implementation code has been designed or created. ✅

## Approval Record

Approved on 2026-08-01. The next deliverable is the Hospital–Payer Integration Logical ERD.
