# Insurance Foundation — Hospital–Payer Integration Business Requirement Amendment

| Attribute | Value |
|---|---|
| Module | Insurance Foundation |
| Phase | Phase 7 — Insurance Foundation |
| Version | 1.0 |
| Status | Approved — 2026-08-01 |
| Change Type | Approved business requirement amendment |
| Date | 2026-08-01 |

## Objective

Define the business foundation for a Hospital to maintain its own operational connection details for an Insurance Partner or TPA in ClaimNX.

This enables the future Claim Processing platform to submit pre-authorizations and claim documents through the appropriate channel and to associate incoming responses with the correct Hospital–Payer relationship.

## Why

ClaimNX processes claims on behalf of Hospitals. A payer’s operational details are not global: a Hospital may have a different email address, portal URL, portal account, or automation arrangement for the same Insurer or TPA than another Hospital.

The existing Organization Partner Enablement record authorizes an Organization to use an Insurance Partner. It does **not** model the Hospital-specific connection required for pre-authorization submission, document exchange, or future automated response processing.

## Business Scope

### Supported external counterparties

Phase 7 supports only these Insurance Partner classifications:

- **INSURER** — the insurance company.
- **TPA** — the third-party administrator that may receive or administer claim processing on behalf of an Insurer.

`Insurance Partner` remains the neutral platform term for the master record. Its approved type must be either `INSURER` or `TPA` for this scope.

### Hospital-specific integration information

For each applicable Hospital and Insurance Partner, ClaimNX must be able to maintain an independent operational integration profile, including:

- Submission channel: Email, RPA Portal, or a future API channel.
- Outbound and notification email addresses where Email is used.
- Portal URL and portal user name where RPA Portal is used.
- A secure credential reference where a portal credential is required.
- Integration lifecycle state, audit history, soft deletion, and optimistic-concurrency version.

The integration profile identifies the external destination. It does not itself send email, log in to a portal, create a claim, or process a reply.

## Mandatory Security Decision

Portal passwords, API tokens, mailbox passwords, and similar secrets must **never** be stored as plaintext in:

- PostgreSQL business tables;
- SQL migrations or seed scripts;
- REST request or response payloads;
- the React frontend;
- Git repositories, logs, error messages, or test fixtures.

The future integration profile may store only a non-secret `credential_secret_reference`. The actual secret must be held by an approved secure secret-management capability. The exact secret provider and runtime access pattern will be selected before Email/RPA implementation; this amendment does not assume one.

## End-to-End Business Flow

```text
Hospital user prepares pre-authorization / claim documents
        ↓
Claim Processing selects the Hospital-specific Insurer or TPA integration
        ↓
Future Integration capability submits through Email, RPA Portal, or API
        ↓
Insurer / TPA sends a response through email or its portal
        ↓
Future ingestion and automation capability identifies the integration profile
        ↓
ClaimNX updates the related claim and workflow using approved business rules
```

Only the **Hospital-specific integration profile** is in the amended Phase 7 scope. Claim creation, document submission, mailbox ingestion, RPA execution, and automated claim/workflow updates remain future work.

## Explicitly In Scope for This Amendment

- A Hospital-specific relationship to one Insurer or TPA master record.
- Controlled operational channel details required to identify the future destination.
- A secure-reference approach for portal credentials.
- Lifecycle, tenant isolation, audit, soft-delete, and optimistic-concurrency requirements for the future integration profile.
- A clear separation between platform master Partner data, Organization authorization, and Hospital operational connectivity.

## Explicitly Out of Scope

- Pre-authorization or claim creation and adjudication.
- Document storage, attachment transmission, and email delivery.
- Mailbox polling, email parsing, portal scraping, RPA bots, API connectors, retries, or monitoring.
- Automated insurer/TPA response interpretation and claim/workflow updates.
- Insurance benefits, coverage, network, eligibility, settlement, and payment logic.
- Storage or display of any plaintext credentials or secrets.
- A final routing rule deciding whether an Insurer or its TPA receives a particular claim. That decision belongs to the future Claim Processing design and may use product-plan and Hospital integration data.

## Approved Ownership Boundary

| Concern | Owning bounded context |
|---|---|
| Insurer / TPA master identity and classification | Insurance Foundation |
| Hospital identity and lifecycle | Hospital bounded context |
| Organization authorization to use a partner | Insurance Foundation — Organization Partner Enablement |
| Hospital-specific operational payer connection | Insurance Foundation — new Hospital–Payer Integration aggregate |
| Claims, pre-authorization, documents, and payer routing | Claim Processing (future Phase 8) |
| Email delivery, portal automation, and response ingestion | Integration / Automation capability (future) |
| Work allocation and status transitions | Workflow Platform |
| User, role, permission, and membership | IAM / Organization domains |

The new integration is **not** a child entity of the Hospital aggregate. It is owned by Insurance Foundation and references Hospital without taking ownership of Hospital data. This avoids crossing aggregate ownership boundaries.

## Proposed Aggregate — For Next Approval Stage

### Hospital–Payer Integration Aggregate

**Aggregate Root:** `HospitalInsurancePartnerIntegration`

**References:**

- one Hospital;
- one Insurance Partner, classified as `INSURER` or `TPA`;
- the Hospital’s Organization, resolved for tenant isolation;
- approved reference data for channel and lifecycle status.

**Business attributes to be refined during Domain Analysis:**

- integration code / business identifier;
- submission channel;
- outbound email address;
- notification email address;
- portal URL;
- portal user name;
- credential secret reference;
- optional future automation profile reference;
- lifecycle status;
- standard audit, soft-delete, and version attributes.

No physical table, SQL column, API, or secret-provider integration is approved by this document.

## Initial Business Rules — For Next Approval Stage

1. A Hospital–Payer Integration belongs to exactly one Hospital and exactly one Insurance Partner.
2. An integration is visible and mutable only within the Hospital’s Organization tenant.
3. An Organization Partner Enablement is an authorization prerequisite; it is not a replacement for a Hospital–Payer Integration.
4. A Hospital may use multiple Insurers and TPAs; the same Partner may be configured independently by multiple Hospitals.
5. A partner can have multiple integrations for a Hospital only when a future approved business rule distinguishes their operational purpose. The default design must prevent duplicate active destination profiles.
6. An Email channel requires the relevant approved email destination data.
7. An RPA Portal channel requires a portal URL, portal user name, and non-secret credential reference; it must never receive a password in the business database or API.
8. An inactive or soft-deleted integration cannot be selected for new outbound claim activity.
9. Historical claims must retain their historical payer identity and must not be rewritten when an integration is retired.
10. All mutations require audit actors, audit timestamps, and optimistic concurrency.

## Consequences for Approved Phase 7 Work

The existing Phase 7 Insurance Foundation implementation remains valid for:

- platform Insurance Partner master records;
- partner contacts;
- product plans;
- Organization Partner Enablement.

The current Insurance API layer must not be approved as complete until its contract has been amended to include this requirement through the established sequence:

1. Domain Analysis;
2. Bounded Context and Aggregate Design;
3. Logical ERD;
4. Architecture Review;
5. Workflow and Implementation Plan;
6. Physical Database Design;
7. SQL Architecture Review;
8. Migration, domain, repository, application, API, and testing.

## Validation

- Requirement is Hospital-specific, not only Organization-specific. ✅
- Insurer and TPA are the only external counterparty classifications in scope. ✅
- Credential data is excluded from plaintext database and API handling. ✅
- Claims, RPA, email transport, and inbound automation remain in their future owning phases. ✅
- Existing approved Hospital aggregate ownership is preserved. ✅

## Approval Record

Approved on 2026-08-01. The next deliverable is the Hospital–Payer Integration Domain Analysis.
