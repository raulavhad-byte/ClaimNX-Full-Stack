# ClaimNX Email Correspondence Assessment

## Current state

The repository has an `EmailModule` registered by `AppModule`, a provider-neutral `NormalizedEmail` contract, provider factory, rule-based classifier/extractor, claim matcher, sender validator, attachment guard, and a claim document service with private Supabase storage.

The module is **not production ready**. Mail accounts are held in an in-memory `Map`; Gmail, Microsoft, Zoho, and IMAP/SMTP providers return generated/sample data instead of using provider APIs; webhook and job files are empty; and inbound processing only returns a calculation. It does not persist correspondence, deduplicate, link documents, create review work, update the claim timeline, notify users, or audit an action. The email controller is also not guarded.

## Reusable capabilities

- `DatabaseService` uses the server-side Supabase client.
- `ClaimsService` already enforces claim-stage authorization and maintains the legacy claim timeline in `claims.form_data.history`.
- `DocumentsService` stores claim documents in the private `claim-documents` bucket with access checks.
- `AuditModule` and role/permission conventions are available for integration.
- Provider-independent mail, classification, extraction, matching, and attachment type contracts already exist.

## Missing capabilities

- Persistent mail accounts, threads, messages, attachments, processing attempts, and review tasks.
- Database uniqueness/indexes for message idempotency.
- OAuth token vault/secret-management integration.
- Real Gmail, Microsoft Graph, Zoho, and IMAP/SMTP adapters.
- Authenticated mailbox management and webhook signature validation.
- Queues/retries/subscription renewal.
- Attachment ingestion into `DocumentsService`, OCR orchestration, and provenance/conflict persistence.
- Correspondence timeline/review APIs and UI.
- Notification/audit integration and automated workflow execution.

## Safe design decisions

1. `hospital_id` is the tenant boundary because it is the established claim/document access scope. A mailbox can never select a hospital from a browser request; it is resolved from the persisted mail account.
2. Credentials are represented only by an opaque `credential_reference`. OAuth tokens and passwords must be stored in an external encrypted secret manager before real providers are enabled.
3. Incoming messages are stored and matched deterministically. Unknown sender, ambiguous matching, low confidence, conflicts, and all financial/rejection actions require human review by default.
4. The existing provider stubs must not be presented as live integrations. Real adapters are deferred until provider app registrations, redirect URLs, webhook secrets, and a secret vault are configured.

## Database changes required

Create `mail_accounts`, `email_threads`, `email_messages`, `email_attachments`, `email_processing_attempts`, and `email_review_tasks`. Use account/provider-message uniqueness for idempotency; index hospital, claim, account, processing status, classification, received time, and review status.

## External configuration required

- `EMAIL_CREDENTIAL_VAULT_PROVIDER` and `EMAIL_CREDENTIAL_VAULT_KEY_REFERENCE`
- Gmail OAuth client ID/secret, redirect URI, Pub/Sub topic and webhook verification
- Microsoft Entra tenant/client/secret, Graph subscription callback and lifecycle secret
- Zoho OAuth client/secret and callback
- IMAP/SMTP encrypted credential references and provider host/TLS settings
- Queue/worker infrastructure and webhook signing secrets

## Proposed implementation order

1. Database-backed correspondence core, idempotent repository, protected API, and review fallback.
2. Outbound persistence and document/timeline/audit integration using a test provider.
3. Real OAuth provider adapters and signed webhooks, one provider at a time.
4. Background workers, attachment/OCR processing, workflow proposals, and notifications.
5. Claim correspondence UI and authorized human-review queue.

## Architectural conflicts and blockers

No notifications module exists at the prescribed path. OCR and background-queue infrastructure were not found. These must be selected/configured before production automation. Real provider implementation is blocked on secure secret storage and provider-console configuration; no credentials will be placed in source code or ordinary database fields.
