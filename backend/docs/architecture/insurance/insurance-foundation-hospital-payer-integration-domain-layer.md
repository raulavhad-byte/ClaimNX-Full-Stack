# Hospital–Payer Integration Domain Layer

| Attribute | Value |
|---|---|
| Module | Insurance Foundation |
| Phase | Phase 7 — Insurance Foundation amendment |
| Status | Implemented and verified |
| Date | 2026-08-01 |

## Objective

Implement the independent domain aggregate for Hospital-specific Insurer and TPA routing configuration without crossing Hospital, Insurance Partner, Organization Member, or Reference Data ownership boundaries.

## Why

The aggregate must prevent invalid routing configuration before persistence while ensuring that portal credentials are never represented as plaintext domain data.

## File Path and Action

| File | Action |
|---|---|
| `src/modules/insurance/domain/hospital-insurance-partner-integration.aggregate.ts` | Added aggregate, persistent-state validation, channel/status rules, HTTPS and email validation, and secret-reference-only handling. |
| `src/modules/insurance/domain/hospital-insurance-partner-integration.aggregate.spec.ts` | Added unit tests for valid configuration and prohibited states. |

## Domain Responsibilities

- Maintains the independent Hospital–Payer Integration aggregate identity and tenant scope.
- Validates UUID references, nonblank required fields, optional field hygiene, and optimistic-concurrency version.
- Accepts only opaque `credentialSecretReference` data; no password, token, or secret value property exists.
- Requires a payer email for an active `EMAIL` configuration.
- Requires HTTPS portal URL, portal user name, and secret reference for active `RPA_PORTAL` configuration.
- Prevents activation of `API` until its connector model is approved in a later phase.

## Boundary Rules

The domain layer does not query the database. The future application layer resolves Reference Data IDs into channel and status codes and verifies active Hospital, active Insurer/TPA, Organization membership, and Organization Partner Enablement before persistence.

## Validation

- Domain unit tests cover valid draft configuration, Email activation, RPA Portal activation, HTTPS enforcement, reserved API activation, and version validation.
- No frontend, email, RPA, API execution, claim submission, or secret-manager integration is implemented in this layer.

## Next Stage

Repository Layer: map the aggregate to the approved SQL command functions and tenant-scoped reads.
