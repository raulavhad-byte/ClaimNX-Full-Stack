# ClaimNX portal persistence audit

Date: 17 August 2026

## Scope and assurance boundary

This review traces portal write paths through the React client, authenticated Nest API,
Supabase database, and private object storage. It is a source-level and build-level audit;
it is not a legal compliance certification, penetration test, disaster-recovery test, or
production-data reconciliation. Production retention, consent, residency, breach response,
backup restoration, and applicable health-data obligations require review by qualified legal,
privacy, and security teams.

## Verified durable paths

| Information | Durable destination | Retrieval/access control | Result |
|---|---|---|---|
| Claims and workflow form data | `claims` and claim history through the Nest claims API | Authenticated, tenant-scoped API | Backend-backed |
| Claim documents | `documents` metadata plus private `claim-documents` bucket | Claim authorization and short-lived signed preview URLs | Backend-backed |
| New Admission uploads | Claim document upload API after the claim is created | Same controls as claim documents | Backend-backed |
| Patient query-reply attachments | Claim document API, category `QUERY_REPLY` | Same controls as claim documents | Fixed in this audit |
| KYP policy source document uploaded against a saved claim | Claim document API, category `POLICY_DOCUMENT` | Same controls as claim documents | Fixed in this audit |
| User profile fields | `users` columns and merged `profile_data` JSON | Self-update or user-administration authorization | Fixed partial-update data loss |
| User profile picture | Private `profile-assets` bucket; only object path in profile JSON | Validated image signature, 5 MB cap, signed URL, audit event | Fixed in this audit |
| Hospital seal and doctor stamp | Private `profile-assets` bucket; only object paths in profile JSON | Validated image signature, 5 MB cap, signed URL, audit event | Fixed across Hospital Management, Hospital Profile, and User Management |
| Payer rate lists | Private storage and durable storage reference | Authenticated document endpoints | Backend-backed |
| Email correspondence and attachments | Email tables and private outbound attachment storage | Provider account and tenant checks | Backend-backed |
| OCR extraction metadata/results | `ocr_document_extractions`; source processed transiently | Browser roles revoked; backend service access | Backend-backed |
| Reimbursement product cases/transitions | Reimbursement suite tables | RLS enabled; transition history immutable | Backend-backed |
| Report automation configuration/logs/templates | Report automation tables | Backend scheduler and central-mailbox dispatch | Backend-backed |

## Confirmed gaps that remain

These features must not be represented as fully persistent until migrated:

| Feature | Current issue | Required backend work |
|---|---|---|
| Invoice Management | Invoice registry and automated billing audit log use `localStorage`; initial screen also contains sample invoice records | Dedicated invoice, line-item, status-transition and billing-run tables/API; remove sample records after migration |
| System Announcements | Announcements and acknowledgements use `localStorage` | Tenant-aware announcement and acknowledgement tables/API with server-side targeting and authorization |
| KYP policy UI cache | `App.tsx` initially reads `claimnx_kyp_policies`; subsequent state is not a durable source of truth | Load/save assessments through the reimbursement KYP API and remove browser cache |
| Legacy CRM/Finance mail cache | Some dashboard compatibility paths still read/write `claimnx_emails` | Remove after every mailbox folder and draft action is served by the email correspondence API |
| Wallet and billing ledger | UI actions mutate component/user state and previously displayed sample transactions | Immutable wallet ledger, payment-order, webhook-idempotency and reconciliation tables/API |
| Bank-statement reconciliation importer | `ReconciliationSystem` currently generates example bank entries instead of parsing and persisting the uploaded statement | Backend statement-ingestion job, malware/type validation, immutable bank-entry table and reconciliation-match API |
| Notification dispatch helper | `notificationService` contains a simulated dispatcher | Backend outbox/job with provider delivery IDs, retry policy and auditable failure state |
| System fields/config fallback | A legacy generic API helper can read configuration arrays from local storage | Replace with configuration endpoints and fail closed when unavailable |

`localStorage` remains acceptable only for non-authoritative user preferences (for example,
remembered login email and table-column preferences). It must not be used for PHI, claims,
financial ledgers, announcements, acknowledgements, workflow state, credentials, or documents.
financial ledgers, announcements, acknowledgements, workflow state, credentials, or documents.

## Corrections made in this audit

1. User profile updates now merge profile JSON instead of replacing it, preventing unrelated
   fields and stored asset references from disappearing on partial saves.
2. Profile photos now use private object storage, signature/MIME validation, size limits,
   signed retrieval URLs, deletion, and audit events.
3. Hospital seals and doctor stamps now follow the same private-storage model in Hospital
   Management. New saves no longer put their base64 content into user profile JSON.
4. Saved avatar URLs are rehydrated after authentication rather than relying on an expired
   browser URL.
5. KYP policy source files and patient query-reply files now go through the claim-document API.
6. Fabricated wallet and gateway transactions were removed from empty-state fallbacks.
7. The KYP query-document action no longer opens an internet-hosted dummy PDF; it uses a signed persisted claim document or reports that none exists.

## Production verification checklist

Before release, execute these checks in a staging environment with production-equivalent RLS:

1. Create, edit, reload, sign out, and sign in for every form; compare the API response and DB row.
2. Upload each supported file type, reload in a second browser session, preview through a signed
   URL, and verify unauthorized users and other hospitals receive 403/404.
3. Delete/replace profile assets and documents; verify both metadata and object-storage lifecycle.
4. Test two hospitals with identically named patients and documents to prove tenant isolation.
5. Interrupt network requests at each save boundary and verify retry/idempotency without duplicates.
6. Restore a backup into an isolated environment and reconcile row/object counts and hashes.
7. Inspect structured logs and audit records to ensure bodies, tokens, passwords, OCR text, and PHI
   are redacted.
8. Complete legal review of consent, retention/deletion schedules, data-subject rights, breach
   response, subprocessors, cross-border transfers, and applicable Indian health/privacy rules.
