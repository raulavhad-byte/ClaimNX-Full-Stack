# Insurance Foundation — Hospital–Payer Integration Domain Analysis

| Attribute | Value |
|---|---|
| Module | Insurance Foundation |
| Phase | Phase 7 — Insurance Foundation |
| Version | 1.0 |
| Status | Approved — 2026-08-01 |
| Predecessor | Hospital–Payer Integration Business Understanding, approved 2026-08-01 |
| Date | 2026-08-01 |

## Objective

Translate the approved Hospital–Payer Integration business requirement into domain language, responsibilities, lifecycle rules, invariants, and cross-domain policies.

This document deliberately stops before aggregate/table/API design. Those decisions require separate approval after the domain model is accepted.

## Why

An Insurer or TPA is a shared platform master record, but a Hospital’s ability to submit to that external party is operational and Hospital-specific. The domain must therefore distinguish:

- who the external party is;
- whether the Organization is authorized to use it; and
- how an individual Hospital is operationally connected to it.

Without this distinction, portal/email details would either be incorrectly shared across Hospitals or incorrectly added to the Hospital aggregate.

## Ubiquitous Language

| Term | Meaning |
|---|---|
| Insurance Partner | Platform master record representing an external Insurer or TPA. |
| Insurer | Insurance company classification of an Insurance Partner. |
| TPA | Third-Party Administrator classification of an Insurance Partner. |
| Organization Partner Enablement | Tenant-level authorization for an Organization to use an Insurance Partner. |
| Hospital–Payer Integration | A Hospital-specific operational destination profile for one Insurance Partner. |
| Submission Channel | Approved route by which future claim operations may submit work: Email, RPA Portal, or future API. |
| Credential Secret Reference | Non-secret identifier pointing to a credential held outside the business database. |
| Operational Destination | The channel details used to identify where future submission activity should be sent. |
| Active Integration | An integration that may be selected for new future outbound work. |
| Retired Integration | A soft-deleted integration retained only for history and not selectable for new work. |

## Domain Responsibility

Insurance Foundation is responsible for governing a valid Hospital-specific operational destination. It is **not** responsible for executing a transmission or interpreting a payer response.

### It owns

- validation that the referenced Insurance Partner is an active Insurer or TPA;
- validation that the Hospital is active and belongs to the current Organization tenant;
- validation that the Organization has an active Partner Enablement;
- lifecycle of the Hospital–Payer Integration;
- channel configuration completeness rules;
- secure-reference-only handling of credentials;
- audit, soft-delete, and version invariants.

### It does not own

- Hospital master data, addresses, departments, or users;
- Insurance Partner master identity, contacts, or product plans;
- claim/pre-authorization business state;
- document delivery, email delivery, RPA execution, portal login, API calls, or inbound mailbox processing;
- secret storage or secret retrieval implementation;
- workflow assignment and transition state.

## Candidate Domain Concept

**Hospital–Payer Integration** is a new Insurance Foundation domain concept. It represents a configured operational relationship, not a claim contract, policy coverage, or payer master record.

It must reference, but never own or mutate:

- one Hospital;
- one Insurance Partner;
- the Hospital's Organization tenant context;
- an active Organization Partner Enablement;
- controlled channel and lifecycle values.

## Domain Invariants

The following rules must be true for every valid active Hospital–Payer Integration.

1. The referenced Hospital exists, is active, and belongs to the requesting Organization.
2. The referenced Insurance Partner exists, is active, and is classified as `INSURER` or `TPA`.
3. The requesting Organization has one active Organization Partner Enablement for that Insurance Partner.
4. The configuration is only created or changed by an active IAM user who is an active Organization Member of that Organization and has the required permission.
5. A Hospital and Partner cannot have duplicate active operational destination profiles unless a later approved business purpose differentiates them.
6. Every active configuration has exactly one approved submission channel.
7. An Email channel has a valid outbound payer email destination. Optional notification email addresses must also be valid email values.
8. An RPA Portal channel has a valid HTTPS portal URL, a non-empty portal user name, and a non-empty credential secret reference.
9. A future API channel is reserved for an approved connector; it must not store an API secret in the integration aggregate.
10. Passwords, tokens, and secret values are invalid domain inputs. Only a non-secret credential reference may be retained.
11. Deactivation prevents selection for new future submissions but preserves the record and its audit history.
12. Soft deletion/retirement prevents all normal mutation and selection for new work.
13. Every mutable command requires the expected aggregate version; a successful mutation advances the version exactly once.
14. Every persistent record has creation/update audit data; retirement also has deletion audit data.

## Channel Policies

| Channel | Required configuration | Not permitted in the aggregate |
|---|---|---|
| `EMAIL` | payer email destination | Mailbox password, SMTP password, email transmission payloads |
| `RPA_PORTAL` | HTTPS portal URL, portal user name, credential secret reference | Portal password, cookies, browser session, RPA execution logs |
| `API` (future) | approved connector identity and credential secret reference | API key/token/secret, API request/response payloads |

The exact controlled values and validation patterns will be specified only after the bounded-context and aggregate design is approved.

## Lifecycle Model

```text
Draft configuration
        ↓ activate (all prerequisites and channel details valid)
Active configuration
        ↓ deactivate (temporarily unavailable or operationally paused)
Inactive configuration
        ↓ reactivate (prerequisites and details revalidated)
Active configuration
        ↓ retire (soft delete)
Retired configuration
```

Rules:

- Only an Active integration can be selected for new future submission activity.
- A retired integration cannot be reactivated through a normal operational command.
- A Partner Enablement becoming inactive does not delete the integration; it blocks new activation/reactivation and future selection until authorization is restored.
- A Hospital becoming inactive does not delete the integration; it blocks future selection.
- A historic claim must retain its historic payer identity and any future immutable integration reference or destination snapshot.

## Domain Commands

| Command | Intent | Preconditions |
|---|---|---|
| Create integration | Register a Hospital-specific payer destination profile | Active Hospital, active Insurer/TPA, active Organization Partner Enablement, valid channel details, authorized actor |
| Update integration | Change non-lifecycle operational details | Active integration, tenant match, expected version, valid channel details |
| Activate integration | Make a configured integration selectable | All invariants currently satisfied |
| Deactivate integration | Stop new selection without removing history | Active integration, expected version |
| Retire integration | Soft delete an unused integration | Expected version; future reference checks will be defined with Claim Processing |

No command sends a message, opens a portal, or changes a claim.

## Cross-Aggregate Policies

| Referenced aggregate / context | Policy |
|---|---|
| Hospital | Read and validate identity, tenant ownership, and active lifecycle only. No Hospital mutation. |
| Insurance Partner | Read and validate active lifecycle and Insurer/TPA classification only. No Partner mutation. |
| Organization Partner Enablement | Required authorization prerequisite. Its lifecycle is independent from the Hospital–Payer Integration lifecycle. |
| Organization Membership / IAM | Validates the actor and tenant access. It never stores payer configuration. |
| Workflow Platform | May later orchestrate approvals or execution tasks; it does not own the integration configuration. |
| Claim Processing | Will later select an Active integration and persist claim-specific references/snapshots. It does not mutate the integration as part of ordinary claim processing. |
| Integration / Automation | Will later execute email/RPA/API work using approved configuration and secret retrieval. It does not own business configuration lifecycle. |

## Important Domain Decisions Deferred

The following are intentionally deferred, not omitted:

1. Whether an active Hospital–Partner pair may have one profile only or multiple profiles distinguished by a controlled `purpose` such as pre-authorization, reimbursement, or escalation.
2. The final controlled-value names for channel and lifecycle status.
3. Whether a direct Organization identifier is persisted with the integration or derived from Hospital for physical tenant isolation.
4. The selected secret-management provider and runtime access model.
5. Claim routing logic where an Insurer delegates a product/plan or claim category to a TPA.
6. Inbound email/portal correlation rules and automation observability.

These decisions must be resolved in the next design stages where relevant; none authorizes a database change now.

## Validation

- Hospital-specific operational configuration is separated from shared Partner master data. ✅
- Organization authorization remains a prerequisite, not duplicated configuration. ✅
- Hospital aggregate ownership remains intact. ✅
- Email/RPA/API security prevents plaintext secret handling. ✅
- Claims, workflow execution, and automation retain their proper ownership boundaries. ✅
- No SQL migration, NestJS code, API, or frontend implementation has been created. ✅

## Approval Record

Approved on 2026-08-01. The next deliverable is the Hospital–Payer Integration Bounded Context and Aggregate Design.
