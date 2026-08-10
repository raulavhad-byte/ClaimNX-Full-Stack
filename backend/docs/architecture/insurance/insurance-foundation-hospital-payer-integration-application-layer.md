# Hospital–Payer Integration Application Layer

## Objective

Orchestrate Hospital-specific Insurer/TPA routing configuration without exposing credentials.

## Why

The application layer enforces the caller's active IAM membership and Hospital tenant scope before invoking the approved PostgreSQL command functions. It resolves controlled Reference Data codes so aggregate rules can validate channel and lifecycle behaviour.

## File Path and Action

- `src/modules/insurance/application/hospital-insurance-partner-integration.use-cases.ts` — command/query orchestration.
- `src/modules/insurance/application/hospital-payer-integration-reference-data.service.ts` — approved global Reference Data resolution.
- `src/modules/insurance/application/insurance-access.service.ts` — adds active Hospital-in-tenant enforcement.

## Security Rule

`credentialSecretReference` is accepted only as an opaque secret-manager pointer for persistence. It is deliberately omitted from read and application result models. Passwords, tokens, and portal credential values are never accepted or returned.

## Validation

- Active IAM User and Organization membership are required.
- The Hospital must belong to the requested Organization.
- Channel and lifecycle references must be approved global Reference Data.
- The aggregate validates Email/RPA configuration before persistence.
- SQL remains the final authority for tenant, partner, enablement, secret-reference, lifecycle, and optimistic-concurrency checks.

## Approval

Status: Approved — 2026-08-01

## Next Step

Build the versioned REST API layer with DTO validation and permission checks.
