# Insurance Foundation — Legacy Database Preflight Review

| Field | Value |
| --- | --- |
| Module | Insurance Foundation |
| Phase | Phase 7 — Insurance Foundation |
| Status | Draft — approval required before Physical Database Design |
| Database | PostgreSQL / Supabase |
| Review Date | 2026-07-30 |
| Evidence Source | Supabase SQL Editor read-only preflight |
| Approval | Approved by Product Owner on 2026-07-30 |

## Objective

Record the legacy database evidence that constrains the approved Insurance Foundation physical design.

## Why

Phase 7 must preserve existing claim behaviour and historical payer references. No legacy table may be dropped, renamed, or replaced without an explicitly reviewed compatibility migration.

## Evidence Collected

| Area | Result | Design consequence |
| --- | --- | --- |
| Candidate insurance tables | `public.insurance_entities` exists | It is the Phase 7 Insurance Partner compatibility root. |
| Legacy columns | UUID `id`, partner name/type/contact/automation fields, timestamps | Approved attributes will be added additively; legacy fields remain during compatibility period. |
| Legacy audit/lifecycle | No audit actors, soft delete, version, organization scope, or governed references | A migration must backfill and enforce Phase 7 enterprise fields before new writes. |
| Existing constraints | Primary key and local type/automation checks only | New foreign keys, lifecycle checks, uniqueness, and audit constraints are required. |
| Existing indexes | Primary key only | Add only reviewed active lookup/uniqueness indexes. |
| Inbound dependency | `public.claims.payer_id` references `public.insurance_entities(id)` | The table name and existing UUID values are immutable compatibility boundaries. |
| Legacy record count | One record | Migration can include deterministic remediation validation. |
| Legacy partner | Blue Cross, type `Insurer`, automation `Email` | Map to governed `INSURANCE_PARTNER_TYPE` and preserve legacy operational fields. |
| Claim dependency | Blue Cross has one dependent claim | The partner cannot be hard deleted and its existing UUID must be retained. |
| Required foundations | organizations, users, reference categories/values, hospitals all exist | Phase 7 foreign-key and tenant-scope design can rely on completed foundations. |

## Compatibility Decision

`public.insurance_entities` will be **evolved in place** as the approved Insurance Partner aggregate root.

The Phase 7 migration must:

1. Retain `insurance_entities`, its `id` primary key, and every existing UUID.
2. Preserve the `claims.payer_id -> insurance_entities.id` foreign key.
3. Add approved enterprise columns additively: partner code, governed type/status references, audit actors, soft-delete fields, version, and compatibility metadata where necessary.
4. Preserve legacy columns (`name`, `email_id`, `portal_link`, `type`, `automation_type`, `on_panel`, `rpa_supported`, `auto_email_enabled`, `template_name`, `data`) until their consuming API paths are retired through a separately approved change.
5. Create new child tables for Partner Contacts, Insurance Products/Plans, and Organization Partner Enablements rather than storing new aggregate responsibilities in legacy text columns.
6. Prevent physical deletion of a partner that has any claim reference.

## Explicit Non-Decisions

- No Claim, policy-benefit, authorization, cashless contract, or settlement schema is introduced in Phase 7.
- No legacy partner record is deleted or renamed.
- No claim payer reference is migrated to a new identifier.
- No physical database migration is approved by this review alone.

## Validation

- Legacy candidate-table, column, constraint, foreign-key, index, and record evidence was reviewed.
- The sole partner record is valid enough for controlled remediation, but lacks the approved enterprise fields and must be backfilled before enforcing `NOT NULL` constraints.
- The claim dependency makes an additive in-place evolution mandatory.

## Pause for Approval

Approve this review to proceed to the **Insurance Foundation Physical Database Design**. The next document will define the target tables, columns, foreign keys, constraints, indexes, lifecycle rules, and migration strategy without yet executing a migration.
