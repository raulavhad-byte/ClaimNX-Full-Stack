# Financial Command Persistence Migration Design

## Objective

Define the first Financial Management write boundary in PostgreSQL. These commands persist approved financial records atomically, enforce tenant scope and audit ownership, and keep the append-only posting rule intact.

## Why

The Financial domain and repository layers must not write table rows directly. Database commands provide one consistent enforcement point for tenant isolation, reference-data validity, audit actors, and aggregate ownership.

## File Path

`src/database/migrations/20260801110300_create_financial_management_command_functions.sql`

## Action

Create the migration locally only. Do not apply it until the SQL content review is approved.

## Command Scope

| Command | Ownership and safeguard |
|---|---|
| `create_financial_remittance_batch` | Creates an organization-and-hospital-scoped payer remittance batch. |
| `create_financial_remittance_line_item` | Requires an active batch in the same tenant and hospital. |
| `create_financial_remittance_evidence` | Requires an active batch in the same tenant and hospital. |
| `create_financial_claim_settlement` | Requires an active Claim in the requested tenant and hospital. |
| `create_financial_settlement_deduction` | Requires an active Settlement in the same tenant and hospital. |
| `create_financial_recovery` | Requires an active Claim and, when supplied, a same-tenant Settlement. |
| `create_financial_posting` | Inserts only. No update/delete command is created because postings are append-only. |
| `create_financial_bank_statement_line` | Creates an imported or entered bank-statement line. |
| `create_financial_bank_match` | Requires exactly one same-tenant Batch or Settlement target. |

## Cross-cutting Rules

1. Every command requires an active IAM user as `actor_user_id`.
2. Every Hospital must be active and belong to the supplied Organization.
3. Every controlled value must be a currently active global Reference Data value in its expected category.
4. All UUIDs are supplied by the application layer; no database UUID generation is introduced.
5. New records always start at `version = 1` with complete creation and update audit values.
6. Financial Posting is immutable. Corrections must be represented later by a compensating posting, never by mutation.
7. Mutating lifecycle and value-change commands require `expectedVersion`; they are deliberately deferred to the next approved Financial command slice so each lifecycle transition receives its own reviewed matrix.

## Validation

Before applying the migration, review:

- Function names and parameter contracts.
- The actor, tenant, reference-data, and parent ownership checks.
- The posting target rule: exactly one Settlement or Recovery.
- No plaintext payer credentials, portal passwords, tokens, or bank payloads are accepted.

## Pause for Approval

Approve **Financial Command Persistence Migration Design** to proceed to SQL Architecture Review and manual Supabase application.
