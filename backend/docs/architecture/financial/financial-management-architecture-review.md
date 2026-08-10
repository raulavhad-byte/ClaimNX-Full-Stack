# ClaimNX Phase 9 — Financial Management Architecture Review

| Attribute | Value |
|---|---|
| Module | Financial Management |
| Phase | 9 — Financial Management |
| Status | Draft — Awaiting Approval |
| Inputs reviewed | Business Understanding, Domain Analysis, Aggregate Design, Logical ERD |
| Decision | Architecture accepted, subject to the guardrails in this document |

---

## 1. Objective

Review the approved Financial Management design for alignment with ClaimNX Domain-Driven Design, Clean Architecture, tenant isolation, audit/compliance, security, and backward-compatible platform evolution. This review authorizes implementation planning only; it does not authorize physical SQL or NestJS code.

## 2. Review outcome

The Financial Management design is architecturally sound for Phase 9, provided the following decisions remain locked:

- Claim Processing owns operational Claim lifecycle; Financial Management owns monetary realization only.
- Financial aggregates are tenant-scoped by both Organization and Hospital.
- Posted financial history is append-only; corrections are compensating events.
- All financial state/status/type values come from controlled Reference Data.
- Financial product behavior is selected from the immutable Claim product; ICA and PRE_POST are active, Partner Processing and KYP are guarded.
- No credentials, payment tokens, portal passwords, bank account numbers, or raw secrets enter Financial business tables.

## 3. DDD ownership review

| Concern | Review result |
|---|---|
| Claim lifecycle | Correctly remains in Claim Processing. Financial settlement never directly sets Claim status. |
| Remittance and settlement | Correctly owned by Financial Management. |
| Payer/TPA master data | Correctly remains in Insurance Foundation. Financial records reference partner identity only. |
| Hospital-specific payer routing | Correctly remains in Hospital–Payer Integration. Financial records reference it without copying credentials. |
| User/membership/permission | Correctly remains in IAM/Organization Member Management. |
| Work assignment | Correctly remains in Workflow Platform. Financial recovery may request a Work Item but retains business authority. |
| Status/type vocabulary | Correctly remains in Reference Data. |

No aggregate crosses ownership boundaries by embedding mutable external data.

## 4. Clean Architecture review

The future implementation must follow this dependency direction:

```text
API / DTO / Guards
        ↓
Application use cases
        ↓
Financial domain aggregates, value objects, product strategies
        ↓
Repository ports
        ↓
Supabase raw-SQL repositories and PostgreSQL command functions
```

Rules:

- Domain code has no NestJS, Supabase, HTTP, SQL, or DTO dependency.
- Application use cases validate active IAM user, organization membership, Hospital scope, reference data, and product strategy before persistence.
- Infrastructure owns RPC/raw-SQL calls and database mapping only.
- REST controllers own input validation, authentication, permission declaration, and response shaping only.
- SQL migrations are the authoritative database schema and command contract.

## 5. Tenant isolation review

Every command and read must enforce:

```text
organization_id = requested organization
AND hospital_id = requested hospital
AND deleted_at IS NULL
AND is_deleted = FALSE
```

Additional rules:

- Each aggregate root persists both tenant keys even when the parent could be joined.
- Child rows persist the same tenant context and must be validated against the parent.
- Claim, remittance line item, settlement, Hospital–Payer Integration, and Bank Match must resolve to the same tenant before a relation is written.
- The API must never rely on frontend filtering or an unscoped identifier alone.
- Cross-tenant attempts return `403`; an inaccessible in-scope resource returns `404` according to the existing ClaimNX access pattern.

## 6. Financial integrity review

| Requirement | Approved mechanism |
|---|---|
| Monetary precision | Explicit currency + `NUMERIC(15,2)` in later physical design. No floating-point financial fields. |
| Settlement calculation | Validate gross paid, TDS, payer deductions, other adjustments, patient responsibility, and net payer amount in the domain and command transaction. |
| Immutable ledger | `financial_posting` is append-only. Corrections create linked compensating postings. |
| Balance | Every posting group must balance debit = credit inside the same command transaction. |
| Concurrency | Root mutations require `expectedVersion` and atomically update only on the expected version. |
| Reconciliation | Allocations cannot exceed the available bank credit or target remittance/posting amount. |
| Write-off | Requires controlled status, rationale, actor, and explicit financial consequence. |

Important: the Phase 9 foundation is an immutable operational financial ledger, not a complete enterprise GL/accounting package. Account taxonomy and statutory posting rules remain a later approved scope.

## 7. Security and privacy review

Approved:

- UTR/payment references are allowed as operational identifiers.
- `bank_account_reference` and `credential_secret_reference` must be opaque external pointers only.
- Email message IDs, file references, integrity hashes, and sanitized source metadata are allowed as evidence.

Prohibited:

- Bank account number, card data, UPI credential, payment gateway secret, payer portal password, OAuth refresh token, API key, or raw authorization header.
- Unbounded raw ERA/email payload storage in normal financial tables.
- Returning secret-reference values in REST response DTOs.

Any imported source document is handled through approved storage/document services later; Financial tables retain only non-secret references and metadata.

## 8. Product strategy review

| Product | Phase 9 authorization |
|---|---|
| ICA | Active financial validation and posting behavior. |
| PRE_POST | Active financial validation and posting behavior. |
| PARTNER_PROCESSING | Aggregate/strategy structure only; operational posting blocked. |
| KYP | Aggregate/strategy structure only; operational posting blocked. |

Product must be read from the Claim and treated as immutable. A request body cannot substitute or change a Claim product.

## 9. Legacy and compatibility review

- Existing `claims`, `recovery`, `reconciliations`, and payer-linked legacy tables may contain historical data and dependencies. A read-only preflight is required before migration design.
- Phase 9 tables will use the `financial_` prefix to avoid collision with legacy names.
- No existing Claim, Recovery, Reconciliation, or Insurance Partner table will be dropped or renamed in Phase 9.
- The old Claim `payer_id` relationship remains historical compatibility; new financial records use canonical Phase 7/8 partner and route references.
- Additive migrations, reviewed backfills, and compatibility comments are required if a legacy table must be evolved.

## 10. API and permission review

Future routes remain versioned and tenant scoped:

```text
/v1/organizations/{organizationId}/hospitals/{hospitalId}/financial/...
```

Permission names are proposed—not yet seeded—as:

```text
financial.view
financial.remittance.create
financial.remittance.update
financial.settlement.create
financial.settlement.post
financial.recovery.manage
financial.reconciliation.manage
financial.writeoff.approve
```

Permissions must be added through the existing permission migration/catalogue process before the REST layer is enabled.

## 11. Observability and audit review

- Command-level audit fields record actor/timestamp/version on all business entities.
- Posting and history records are immutable and retain their originating command/evidence reference.
- Application layer logs use correlation/trace identifiers and never log secrets or unredacted payer payloads.
- Financial totals, posting balance failures, tenant-scope denials, stale-version conflicts, and reconciliation variances are auditable operational events.

## 12. Risks and mitigation

| Risk | Mitigation |
|---|---|
| Mixing Claim operational and financial statuses | Separate aggregates and API routes; Financial Management never writes Claim lifecycle. |
| Incorrect short-payment classification | Controlled deduction/responsibility types; explicit recovery/write-off paths. |
| Duplicate remittance ingestion | Tenant-scoped source/reference uniqueness and idempotent command checks in later SQL design. |
| Ledger mutation after posting | Append-only table plus database trigger/command constraints. |
| Bank amount over-allocation | Command transaction validates remaining amounts before confirmed allocation. |
| Future product logic leakage | Strategy factory with guarded Partner Processing/KYP strategies. |
| Secret exposure | External opaque references, sanitized evidence, response DTO allow-lists. |

## 13. Architecture review checklist

- [x] Bounded contexts and aggregate ownership are respected.
- [x] Clean Architecture dependency direction is defined.
- [x] Tenant isolation is mandatory on every read/write.
- [x] Financial amounts, posting immutability, and correction strategy are defined.
- [x] Product isolation is explicit.
- [x] Security and evidence rules prohibit secret persistence.
- [x] Legacy compatibility requires preflight and additive evolution.
- [x] No physical schema, migration, or application code has started.

## 14. Next step

After approval, create the **Financial Management Workflow and Implementation Plan**. It will sequence preflight, physical design, reference data, migrations, domain, repository, application, API, and test work without skipping architecture gates.
