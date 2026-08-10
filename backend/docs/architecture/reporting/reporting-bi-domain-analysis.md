# ClaimNX Phase 11 — Reporting & BI Domain Analysis

## 1. Document Information

| Attribute | Value |
|---|---|
| Module | Reporting & BI |
| Phase | Phase 11 — Reporting & BI |
| Version | 1.0 |
| Status | Draft for Approval |
| Architecture | DDD, Clean Architecture, Modular Monolith |
| Purpose | Define the Reporting & BI domain language, responsibilities, boundaries, and invariants. |

## 2. Objective

Define a governed, tenant-scoped reporting domain that turns approved operational data into reliable reports, controlled exports, and future BI-ready projections without allowing Reporting to change the source business records.

## 3. Why

Claims, workflow, financial, insurance, and automation data have different owners and lifecycles. Reporting must read their approved facts consistently, retain lineage, enforce the caller's tenant scope, and avoid duplicating or mutating operational truth.

## 4. Deliverable

| Item | Value |
|---|---|
| File Path | `D:\Projects\backend\docs\architecture\reporting\` |
| File Name | `reporting-bi-domain-analysis.md` |
| Action | Design only — no SQL migration, API, or NestJS implementation in this stage. |
| Validation | Review domain ownership, invariant rules, source boundaries, and lifecycle definitions. |

## 5. Domain Scope

Reporting & BI owns:

- Platform-governed Report Definitions and immutable published versions.
- Approved measures, dimensions, filters, drill-through rules, and data-lineage declarations.
- Report execution metadata, controlled export metadata, and reporting data-quality observations.
- Read-only semantic projections over approved source-domain data.

Reporting & BI does **not** own or mutate Claims, Workflow tasks, Financial postings, Hospital/Payer routes, Insurance Partners, IAM users, or source-domain lifecycle states.

Reporting & BI must never store raw documents, credential secrets, plaintext passwords, tokens, or external payer payloads.

## 6. Ubiquitous Language

| Term | Meaning |
|---|---|
| Report Definition | Platform-approved semantic contract for a report. |
| Report Definition Version | Immutable published revision of a report definition. |
| Measure | Approved calculation, such as claim count, turnaround time, or settled amount. |
| Dimension | Approved grouping/filtering attribute, such as hospital, payer, period, or status. |
| Report Scope | Organization and optional Hospital boundary applied to a report execution. |
| As-of Timestamp | Timestamp that identifies the reporting cut-off for time-sensitive data. |
| Drill-through | Controlled navigation from an aggregate report result to authorized source records. |
| Data Lineage | Declared source fields and domains used by a report result. |
| Report Execution | A request to generate a report within a permitted tenant scope. |
| Controlled Export | An authorized, auditable output generated from a report execution. |
| Quality Observation | Non-mutating observation about missing, late, inconsistent, or unavailable source data. |

## 7. Core Domain Model

### 7.1 Report Definition Aggregate

**Aggregate Root:** `ReportDefinition`

**Owned child concepts:**

- `ReportDefinitionVersion`
- `ReportMeasure`
- `ReportDimension`
- `ReportFilter`
- `ReportDrillThroughRule`
- `ReportDataLineage`

The aggregate defines what can be calculated and displayed. In Phase 11, report definitions are platform-governed; tenants cannot submit arbitrary SQL, source fields, joins, or formulas.

### 7.2 Report Execution Process Aggregate

`ReportExecution` records an authorized report request and result metadata when persistence is required. It stores scope, parameters, as-of timestamp, requester, execution status, and sanitized diagnostics. It does not copy or become the system of record for source facts.

### 7.3 Controlled Export Process Aggregate

`ControlledExport` is created from a permitted report execution. It records purpose, requester, scope, expiry, delivery metadata, and audit metadata. It must apply the same tenant and permission checks as the originating report execution.

### 7.4 Quality Observation

A `QualityObservation` may identify incomplete or inconsistent source data. It is advisory and read-only: it cannot repair, update, or transition source-domain records.

## 8. Domain Invariants

1. A Report Definition has a stable, unique platform code.
2. A published definition has at least one approved measure, declared lineage, and an approved scope model.
3. A published definition version is immutable; change requires a new version.
4. Only declared source domains and attributes may be queried.
5. Every execution requires an Organization scope; an optional Hospital scope must belong to that Organization.
6. Every read, drill-through, and export is scoped by Organization and Hospital where applicable.
7. IAM authorization is required before execution, drill-through, or export.
8. Reporting never alters Claim, Workflow, Financial, Insurance, Automation, or IAM records.
9. Claim business lifecycle and Workflow work-item lifecycle remain separate measures and dimensions.
10. Financial reports use immutable postings and declared as-of rules; Reporting cannot calculate or post financial adjustments.
11. Automation reports expose only sanitized operational outcomes and metadata.
12. Exported data cannot exceed the permissions, scope, or source-data visibility of the requesting actor.

## 9. Lifecycle Rules

### 9.1 Report Definition

`DRAFT → PUBLISHED → RETIRED`

- A definition is published only after semantic and lineage validation.
- Published versions are immutable.
- A retired definition remains available for historical audit where retention rules allow, but cannot receive new normal executions.

### 9.2 Report Execution

`REQUESTED → RUNNING → COMPLETED | FAILED | EXPIRED | CANCELLED`

- A failed execution records only sanitized diagnostics.
- Cancellation or expiry never changes underlying source data.

### 9.3 Controlled Export

`REQUESTED → GENERATED | FAILED | EXPIRED | CANCELLED`

- Exports are time-limited and audit-recorded.
- A generated export is not a replacement source of truth.

## 10. Domain Services

| Service | Responsibility |
|---|---|
| ReportingAccessPolicy | Uses IAM permissions and membership to authorize a reporting action. |
| ReportScopeValidator | Validates Organization/Hospital scope and prevents cross-tenant reads. |
| ReportSemanticValidator | Validates measures, dimensions, filters, and lineage before publication. |
| ReportingQueryPlanner | Builds only approved, read-only query plans from semantic definitions. |
| MeasureCalculator | Calculates approved measures against source-domain read models. |
| ReportingQualityEvaluator | Produces non-mutating quality observations. |
| ControlledExportPolicy | Enforces export permission, purpose, audit, and expiry rules. |

## 11. Bounded-Context Boundaries

| Context | Owns | Reporting Interaction |
|---|---|---|
| IAM | Users, roles, permissions | Provides authorization context only. |
| Tenant Management | Organizations, Hospitals, membership, configuration | Provides tenant and Hospital scope. |
| Insurance | Partners, plans, Hospital–Payer routes | Provides payer and routing dimensions. |
| Claim Processing | Claim lifecycle, authorization, queries, submission intent | Provides claim facts and lifecycle measures. |
| Workflow Platform | Work items, queues, SLA | Provides operational workload and SLA measures. |
| Financial Management | Remittance, settlement, recovery, reconciliation, append-only postings | Provides financial facts and as-of measures. |
| AI & Automation | Sanitized automation work, attempts, reviews, owner commands, dispatch tasks | Provides sanitized oversight measures only. |
| Reporting & BI | Definitions, semantic contract, execution/export metadata, quality observations | Reads governed source facts; owns no source-domain facts. |

## 12. Approved Reporting Semantic Areas

- Claim Operations: volumes, lifecycle distribution, turnaround, pending work.
- ICA / Cashless Pre-Authorization: readiness, submission, approval, rejection, and response timings.
- Payer Performance: insurer/TPA response, approval, rejection, and route-channel trends.
- Workflow Operations: queue workload, assignment, SLA performance, and escalation trends.
- Financial Operations: remittance, settlement, recovery, reconciliation, and posting summaries.
- Automation Oversight: work requests, job outcomes, review queues, and payer-dispatch status.
- Compliance and Data Quality: audit completeness, missing dependencies, and controlled exceptions.

## 13. Architectural Decisions

1. Report semantics are platform-governed in Phase 11; no arbitrary tenant-authored SQL or formulas.
2. Source contracts are declared explicitly through lineage; undeclared joins and fields are prohibited.
3. Tenant enforcement occurs at API, application, repository/query, and database-query boundaries.
4. Reporting stores metadata, not mutable duplicated operational truth.
5. Materialized views, a warehouse, external BI tools, scheduled delivery, and dashboards are future implementation choices; they must preserve this semantic contract.

## 14. Out of Scope for This Stage

- Arbitrary report builders and customer-defined SQL.
- Data warehouse, ETL/ELT pipeline, data lake, or external BI vendor integration.
- Scheduled reports, alerts, subscriptions, or dashboard UI.
- Source-domain mutation, financial posting, Claim transition, or Workflow task management.
- Storage of documents, credentials, secrets, external payloads, or raw automation content.

## 15. Validation Scenarios

| Scenario | Expected Outcome |
|---|---|
| User requests a report for another Organization | Access denied; no data is returned. |
| Hospital scope does not belong to Organization | Request is rejected before querying source data. |
| Definition includes an undeclared source field | Definition cannot be published. |
| Published definition needs a changed measure | New definition version is required. |
| Financial report needs a correction | Reporting shows posted facts; it cannot create an adjustment. |
| Automation report requests a credential or raw payload | Request is rejected; only sanitized metadata is eligible. |
| Export has broader columns than report permission | Export is rejected. |

## 16. Approval Gate

This document is ready for review. No Physical Database Design, SQL migration, NestJS code, REST API, or test implementation may begin until it is approved.

**Approval phrase:** `Approve Reporting & BI Domain Analysis`

**Next deliverable after approval:** Reporting & BI Bounded Context and Aggregate Design.
