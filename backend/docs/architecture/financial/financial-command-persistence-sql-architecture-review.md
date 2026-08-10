# Financial Command Persistence SQL Architecture Review

## Objective

Review the Phase 9 Financial command-persistence migration before it is manually applied to Supabase.

## Why

Financial writes affect settlement, recovery, remittance, and accounting evidence. The database must reject cross-tenant writes and mutable ledger behavior even if an API or future integration is defective.

## File Path

`src/database/migrations/20260801110300_create_financial_management_command_functions.sql`

## File Name

`20260801110300_create_financial_management_command_functions.sql`

## Action

Review-only. The migration is not yet applied to Supabase.

## Review Results

| Review area | Result | Evidence |
|---|---|---|
| Scope | Approved | Commands cover each Phase 9 financial table without direct repository writes. |
| Identity | Approved | Every create command requires an application-generated UUID. |
| Audit | Approved | Every command requires an active `public.users` actor and writes `created_by`, `updated_by`, timestamps, and `version = 1`. |
| Tenant isolation | Approved | Every command validates active `(organization_id, hospital_id)` scope; child commands validate their parent within that scope. |
| Reference Data | Approved | Controlled fields are validated against active global values in the exact approved category. |
| Parent ownership | Approved | Claim, batch, line, settlement, recovery, and bank targets are checked in the same tenant and hospital. |
| Money integrity | Approved | Commands reject invalid currency, negative amounts, and amount relationships that violate the approved aggregate rules. |
| Posting immutability | Approved | The command only inserts `financial_posting`; no update or soft-delete function is supplied. Existing append-only trigger remains the final database guard. |
| Secrets | Approved | Commands accept no credential, password, token, portal secret, or raw external payload field. |

## Important Design Boundary

This migration deliberately implements initial **create** persistence only. Future lifecycle updates, status changes, and retirement commands must be introduced as a separately reviewed migration because they require optimistic-concurrency contracts and specific financial transition rules.

## Manual Supabase Application Procedure

1. Open **Supabase Dashboard → SQL Editor → New query**.
2. Open the local migration file in VS Code.
3. Copy the entire file contents exactly.
4. Paste it into the new Supabase query.
5. Confirm the role at the top is `postgres` and the target is your intended project.
6. Select **Run** once.
7. A successful result should state `Success. No rows returned`.
8. Do not rerun a partially copied script.

## Validation After Application

Run the companion validation query in:

`docs/architecture/financial/financial-command-persistence-post-migration-validation.sql`

All output fields must be `true` before implementation proceeds.

## Pause for Approval

Approve **Financial Command Persistence SQL Architecture Review** to apply the approved migration manually in Supabase and run the validation query.
