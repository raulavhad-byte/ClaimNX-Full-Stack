# Hospital–Payer Integration Repository Layer

| Attribute | Value |
|---|---|
| Module | Insurance Foundation |
| Phase | Phase 7 — Insurance Foundation amendment |
| Status | Implemented and verified |
| Date | 2026-08-01 |

## Objective

Persist and retrieve the independent Hospital–Payer Integration aggregate through the approved PostgreSQL command functions while enforcing organization and Hospital scope on every read.

## Why

The repository is the only infrastructure adapter between the application layer and Supabase. It protects tenant boundaries and prevents the credential secret reference from leaking into normal read models.

## Files and Actions

| File | Action |
|---|---|
| `src/modules/insurance/infrastructure/hospital-insurance-partner-integration.repository.ts` | Added tenant-scoped reads and calls to approved create, update, status, and soft-delete SQL functions. |
| `src/modules/insurance/infrastructure/hospital-insurance-partner-integration.database.mapper.ts` | Added persistence-to-domain mapping using a deliberate safe read shape. |
| `src/modules/insurance/infrastructure/hospital-insurance-partner-integration.database.mapper.spec.ts` | Added mapping and secret-nonexposure tests. |
| `src/modules/insurance/infrastructure/hospital-insurance-partner-integration.repository.spec.ts` | Added tenant-scope and approved-command-function tests. |
| `src/modules/insurance/insurance.module.ts` | Registered the repository provider. |

## Repository Rules

- `findActiveById` and `listActiveByHospital` always filter by both `organization_id` and `hospital_id`.
- Retired records (`deleted_at IS NOT NULL`) are never returned by standard reads.
- The normal SELECT list excludes `credential_secret_reference`.
- The secret reference may only be passed into the database create/update command and is never returned from the repository.
- All writes use the reviewed PostgreSQL functions; the repository does not write table rows directly.
- A command function returning `NULL` is preserved for the application layer to map to not-found or stale-version behavior.

## Validation

- Mapper tests verify tenant data mapping and secret-reference nonexposure.
- The production build verifies module dependency registration and TypeScript compilation.

## Next Stage

Application Layer: authorize the user, resolve controlled Reference Data, instantiate the aggregate, orchestrate repository calls, and map expected failures to HTTP-safe application errors.
