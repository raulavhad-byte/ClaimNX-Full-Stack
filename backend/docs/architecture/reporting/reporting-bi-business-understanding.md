# ClaimNX Phase 11 — Reporting & BI Business Understanding

| Field | Value |
|---|---|
| Phase | 11 — Reporting & BI |
| Status | Draft for approval |
| Architecture | DDD, Clean Architecture, Modular Monolith |
| Primary consumers | Hospital leadership, Claim Operations, Finance Operations, Compliance, authorized Organization users |
| Scope | Tenant-scoped operational reporting, governed measures, controlled exports, and future BI readiness |

## 1. Objective

Define the business scope, report consumers, reporting vocabulary, governance rules, and measurable outcomes for ClaimNX Reporting & BI before domain modelling, database design, or implementation begins.

Reporting converts the operational facts already owned by Claim Processing, Workflow, Financial Management, Insurance, Hospital–Payer Integration, and AI & Automation into trustworthy, tenant-scoped decisions. It does not become the owner of those business facts.

## 2. Business Problem

Hospitals processing cashless ICA/pre-authorisation and Pre/Post claims need a timely view of claim volume, aging, payer response, operational work queues, financial recovery, and automation exceptions. The source facts are currently distributed across bounded contexts.

Without governed reporting, users may export inconsistent data, count soft-deleted records, confuse a Workflow task status with a Claim lifecycle state, or access data belonging to another Organization or Hospital. This creates operational delays, inaccurate management decisions, and audit/compliance risk.

ClaimNX requires a reporting capability that supplies one approved definition for each measure while preserving ownership and tenant boundaries.

## 3. Approved Business Outcomes

- Provide authorized Organization users with tenant-scoped operational dashboards and report views.
- Provide Hospital-scoped filtering so a user sees only Hospitals they are authorized to access.
- Show Claim volumes, lifecycle distribution, aging, turnaround indicators, and payer-response operational indicators for ICA (Cashless) and Pre/Post products.
- Show Workflow queue backlog, assignment state, SLA exposure, and work-item throughput without treating task state as Claim lifecycle state.
- Show Financial remittance, settlement, deduction, recovery, reconciliation, bank-match, and immutable posting summaries using Financial Management as the source of truth.
- Show automation workload, completion/failure signals, review exceptions, owner-command state, and payer-dispatch task status without exposing sensitive source payloads or credentials.
- Provide controlled export of approved report views, subject to the same tenant scope, authorization, audit, and data-minimization rules as the interactive view.
- Establish governed report definitions and data lineage that can evolve into materialized read models, a warehouse, or BI tooling only after an approved performance and privacy review.

## 4. Initial Report Catalogue

| Report family | Business questions answered | Owning source contexts |
|---|---|---|
| Claim Operations | How many claims are in each lifecycle stage? Which are aging or awaiting action? What is the product mix? | Claim Processing |
| Cashless / Pre-Authorisation | What is the ICA/Cashless submission, payer-response, approval, rejection, and turnaround position? | Claim Processing, Hospital–Payer Integration |
| Payer Performance | Which Insurer/TPA routes are used and what is the operational response trend by Hospital and payer? | Insurance Foundation, Hospital–Payer Integration, Claim Processing |
| Workflow Operations | What work is queued, assigned, overdue, or completed? Where are SLA risks and bottlenecks? | Workflow Platform |
| Financial Operations | What remittances, settlements, deductions, recoveries, reconciliations, and postings require attention? | Financial Management |
| Automation Oversight | What automation work is queued, in progress, completed, failed, or awaiting review? | AI & Automation |
| Data Quality & Compliance | Are required source facts present, current, tenant-consistent, and auditable? | Read-only governed checks across owning contexts |

The detailed field list, calculation formula, default filters, refresh expectation, and export columns for each report will be approved during Domain Analysis and Logical ERD stages.

## 5. Business Actors

| Actor | Reporting responsibility |
|---|---|
| Hospital Operations User | Uses permitted Hospital operational reports to manage claims, work queues, and turnaround. |
| Organization Administrator | Uses permitted organization-level reports and manages report access through IAM policy. |
| Claim Operations Manager | Uses operational trend and aging reports to allocate work and resolve exceptions. |
| Finance Operations User | Uses Financial Management report views to reconcile remittances, settlements, deductions, recoveries, and postings. |
| Compliance / Audit User | Reviews report lineage, export audit evidence, access decisions, and controlled data-quality views. |
| BI / Data Analyst | Consumes only approved, governed read models or exports; cannot bypass API, tenant scope, or source ownership. |

## 6. Ubiquitous Language

| Term | Meaning |
|---|---|
| Report Definition | An approved, versioned specification of a report, its measures, filters, dimensions, and authorized audience. |
| Measure | A governed numerical calculation with an explicit formula, inclusion/exclusion rules, and source lineage. |
| Dimension | An approved grouping/filter attribute, such as Organization, Hospital, payer, Claim Product, lifecycle state, or time period. |
| Reporting Period | The explicit business date/time range used by a report. |
| As-of Timestamp | The timestamp at which a report view was generated or its underlying read model was refreshed. |
| Operational Read Model | A read-only projection optimized for approved reporting; it does not own or mutate business records. |
| Drill-through | Navigation from a permitted aggregate result to the permitted source record list, still filtered by authorization. |
| Controlled Export | A report extract produced through an authorized API with tenant scope, audit evidence, and minimization rules. |
| Data Lineage | The documented source contexts, tables/read models, filters, and formulas used to produce a measure. |

## 7. Core Business Rules

1. Reporting is read-only. It must not create, transition, update, or delete Claims, Workflow work items, Financial records, payer routes, or automation records.
2. Every report query, drill-through, and export is scoped to exactly one Organization. Cross-Organization reporting is not permitted in Phase 11.
3. Hospital-level facts must be filtered by authorized Hospital scope; frontend-provided identifiers are never trusted as authorization proof.
4. A report includes only records that satisfy each owning context’s active/soft-delete semantics. Report formulas must state those semantics explicitly.
5. Claim lifecycle measures use Claim Processing lifecycle facts. Workflow task state is operational work state and cannot replace, infer, or overwrite a Claim lifecycle state.
6. Financial totals and posting-related measures use Financial Management records as the source of truth. Immutable postings are never recalculated by mutating their source.
7. Automation measures may show sanitized outcome/status information only. They must not expose raw documents, raw external payloads, passwords, tokens, prompts, or credential-secret references.
8. Payer performance views may use approved Hospital–Payer routing configuration, but must never reveal portal credentials or other secrets.
9. Every approved report and controlled export must have a documented purpose, authorized audience, filters, measures, lineage, and generated/as-of timestamp.
10. Exports must apply the same authorization and tenant filters as the on-screen view and must create audit evidence containing no exported sensitive payload.
11. A report must distinguish `no data`, `not authorized`, `not applicable`, and `data quality exception`; it must not silently convert any of these states into zero.
12. The Reporting & BI context may cache or project data only through approved, backward-compatible read-model evolution. It never becomes the system of record for source aggregates.

## 8. Initial Operational Flows

### 8.1 Authorized report viewing

1. A user requests an approved report with an Organization, permitted Hospital scope, and reporting period.
2. IAM and Organization Membership validate the active user and tenant access.
3. The Reporting & BI service applies the approved Report Definition, tenant filters, and soft-delete rules.
4. The service returns the governed measures, dimensions, data-quality signals, and as-of timestamp.
5. The user may drill through only to source records they are independently authorized to read.

### 8.2 Controlled export

1. An authorized user requests an export for an approved report view.
2. The service re-applies authorization, tenant scope, Hospital scope, period, and field-minimization rules.
3. The export is produced with the report-definition version and as-of timestamp.
4. An audit event records the requester, report definition, filter summary, time, and outcome without storing sensitive export content.

### 8.3 Data-quality exception reporting

1. A governed read-only check detects missing, inconsistent, or stale source facts.
2. The report marks the measure as a data-quality exception and identifies the owning context.
3. A permitted operations user follows the owning context’s normal remediation process.
4. Reporting does not correct the source data itself.

## 9. Bounded-Context Boundaries

| Existing context | Reporting relationship |
|---|---|
| IAM / Organization Management | Owns users, membership, roles, permissions, and scope authorization. |
| Hospital / Tenant Management | Owns Hospital identity and tenant relationship. |
| Insurance Foundation | Owns platform Insurance Partners/TPAs, products, contacts, and enablement. |
| Hospital–Payer Integration | Owns Hospital-specific payer routing and non-secret integration configuration. |
| Claim Processing | Owns Claim lifecycle, Claim Product, submissions, authorizations, queries, and status history. |
| Workflow Platform | Owns work items, queues, assignments, SLA, and operational task history. |
| Financial Management | Owns remittance, settlement, recovery, reconciliation, bank matching, and immutable posting. |
| AI & Automation | Owns automation work, review outcomes, owner command requests, payer dispatch tasks, and sanitized automation audit. |
| Reporting & BI | Owns only approved report definitions, read-only projections, governed measures, lineage metadata, and export audit metadata. |

## 10. Non-Functional and Compliance Requirements

- **Correctness:** Every measure must be deterministic, documented, testable, and traceable to approved sources.
- **Security:** Tenant and Hospital isolation are enforced in database/read model access, service layer, and API layer.
- **Privacy:** Apply data minimization. Patient-identifying, clinical, financial, and sensitive operational fields are included only when an approved report purpose and permission require them.
- **Auditability:** Report views and exports must record authorized access and definition/version metadata.
- **Performance:** Initial operational reports must be designed for expected production filtering patterns. Materialized projections, asynchronous refresh, caching, or a warehouse require measured need and a separate architecture approval.
- **Availability:** A delayed read model must visibly state its as-of timestamp; it must never present stale data as real-time.
- **Maintainability:** Report definitions, formulas, and lineage must be versioned and backward-compatible where reports are consumed by the future React portal.

## 11. Explicit Non-Goals

Phase 11 does **not**:

- Create a cross-tenant enterprise data lake or unrestricted management reporting.
- Permit ad-hoc SQL or direct database access from the future frontend.
- Replace operational modules with reporting tables or mutate source data to “fix” a report.
- Build predictive analytics, fraud decisions, clinical recommendations, or autonomous business action; those remain governed by their owning contexts and Phase 10 controls.
- Store report exports, raw documents, email bodies, portal data, passwords, tokens, or secrets in reporting tables.
- Commit to a specific BI vendor, data warehouse, materialized-view schedule, or dashboard visual design before those requirements are approved.

## 12. Initial Success Criteria

1. Every Phase 11 report has an approved business purpose, audience, scope, measure definitions, lineage, and data-quality behavior.
2. An Organization user cannot view, drill through, or export another Organization’s information.
3. Hospital-scoped reporting respects authorized Hospital scope.
4. Claim, Workflow, Financial, payer, and automation measures retain their distinct source ownership.
5. Soft-deleted and otherwise excluded records are handled consistently and transparently.
6. Exports are controlled, auditable, and do not reveal secrets or unapproved sensitive data.
7. Reporting remains a read model: source aggregates and their lifecycle rules are unchanged.

## 13. Approval Gate

**Objective:** Approve the Phase 11 business scope before Domain Analysis begins.

**Why:** This prevents Reporting & BI from becoming an uncontrolled cross-domain CRUD or data-access layer.

**File path:** `docs/architecture/reporting/reporting-bi-business-understanding.md`

**Action after approval:** Create the Reporting & BI Domain Analysis, including governed measures, reporting concepts, ownership boundaries, and data lineage responsibilities.

**Validation:** No SQL migration, database table, NestJS source, REST API, or frontend component is introduced by this document.

**Pause for approval:** Reply exactly:

```text
Approve Reporting & BI Business Understanding
```
