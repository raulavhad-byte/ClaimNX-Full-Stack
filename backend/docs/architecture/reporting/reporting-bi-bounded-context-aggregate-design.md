# ClaimNX Phase 11 — Reporting & BI Bounded Context and Aggregate Design

## 1. Document Information

| Attribute | Value |
|---|---|
| Module | Reporting & BI |
| Phase | Phase 11 — Reporting & BI |
| Version | 1.0 |
| Status | Draft for Approval |
| Architecture | DDD, Clean Architecture, Modular Monolith |
| Purpose | Define Reporting & BI aggregate boundaries, ownership, and cross-context contracts. |

## 2. Objective

Define the aggregates that govern reusable Report Definitions, safe report execution, controlled exports, and data-quality observations without transferring ownership of operational data from the source bounded contexts.

## 3. Why

Reporting combines information owned by Claims, Workflow, Financial Management, Insurance, AI & Automation, Tenant Management, and IAM. Explicit boundaries prevent a report, export, or dashboard from changing source facts, bypassing tenant isolation, or exposing data outside the caller's authority.

## 4. Deliverable

| Item | Value |
|---|---|
| File Path | `D:\Projects\backend\docs\architecture\reporting\` |
| File Name | `reporting-bi-bounded-context-aggregate-design.md` |
| Action | Design only — no SQL migration, API, or NestJS implementation in this stage. |
| Validation | Review aggregate ownership, lifecycle rules, tenant boundaries, and integration contracts. |

## 5. Bounded Context

The Reporting & BI bounded context owns the governed semantic layer used to read approved operational facts. It does not become the system of record for those facts.

### 5.1 Reporting & BI Owns

- Report Definition codes, semantic versions, publication state, and retirement state.
- Approved measures, dimensions, filter definitions, drill-through definitions, and data-lineage declarations.
- Report execution requests and outcome metadata.
- Controlled export requests and outcome metadata.
- Non-mutating data-quality observations about source-readability and report completeness.

### 5.2 Reporting & BI Does Not Own

- Claim lifecycle, claim status history, authorization, queries, or submission intent.
- Workflow definitions, work items, assignments, queues, SLA, or task state.
- Financial remittances, settlements, recovery, reconciliation, bank matching, or postings.
- Hospital, Insurance Partner, Hospital–Payer Integration, Organization Member, or IAM lifecycle.
- AI/automation requests, decisions, external payloads, credentials, raw documents, or secrets.

## 6. Aggregate Overview

| Aggregate | Aggregate Root | Ownership | Primary Responsibility |
|---|---|---|---|
| Report Definition | `ReportDefinition` | Reporting & BI | Governs a reusable, reviewed report semantic contract. |
| Report Execution | `ReportExecution` | Reporting & BI | Records a tenant-scoped request and sanitized result metadata for an approved report version. |
| Controlled Export | `ControlledExport` | Reporting & BI | Records an authorized export generated from a completed report execution. |
| Reporting Quality Observation | `ReportingQualityObservation` | Reporting & BI | Records a non-mutating observation when a source contract, scope, or report result is incomplete. |

## 7. Report Definition Aggregate

### 7.1 Aggregate Root

`ReportDefinition` is the aggregate root for a platform-governed reusable report. A definition has a stable `report_code`; its published semantic contract is captured in immutable versions.

### 7.2 Child Entities

| Child Entity | Purpose |
|---|---|
| `ReportDefinitionVersion` | Versioned semantic contract used by executions. |
| `ReportMeasure` | Approved calculated or source-backed measure. |
| `ReportDimension` | Approved grouping, slicing, or drill-down attribute. |
| `ReportFilterDefinition` | Approved filter allowed for report execution. |
| `ReportDrillThroughDefinition` | Approved path to a tenant-scoped source detail view. |
| `ReportDataLineage` | Declared source context, source contract, and refresh/as-of expectation. |

### 7.3 Invariants

- `report_code` is stable and unique across active platform definitions.
- A definition version is either Draft, Published, or Retired.
- A Published version is immutable; corrections require a new version.
- A Published version must declare at least one measure and one data-lineage record.
- Every measure, dimension, filter, and drill-through field must be explicitly approved; arbitrary SQL and arbitrary source fields are prohibited.
- A report definition must declare whether Organization scope is required and whether Hospital scope is permitted or required.
- Retiring a definition version does not change historical execution results.

## 8. Report Execution Aggregate

### 8.1 Aggregate Root

`ReportExecution` represents one caller-authorized use of one Published `ReportDefinitionVersion` for an Organization scope, optional Hospital scope, reporting period, and as-of timestamp.

### 8.2 Owned Value Objects

| Value Object | Purpose |
|---|---|
| `ReportScope` | Immutable Organization ID and optional Hospital ID. |
| `ReportingPeriod` | Explicit from/to boundary and time-zone context. |
| `ExecutionParameters` | Sanitized values for approved filters only. |
| `ExecutionOutcome` | Status, row count, timing, failure category, and data-quality signal. |

### 8.3 Invariants

- Execution requires an active IAM actor and a valid active Organization Membership.
- The Organization scope is mandatory and immutable after creation.
- A Hospital scope, when supplied, must belong to the Organization scope.
- Only a Published Report Definition Version may execute.
- The execution may read source facts only through its declared lineage and approved semantic fields.
- Stored result metadata must exclude credentials, secret references, raw documents, raw external payloads, and sensitive unrestricted query text.
- Reporting reads cannot mutate a source aggregate or create an operational workflow action.

## 9. Controlled Export Aggregate

`ControlledExport` is owned by Reporting & BI and is created only from a completed `ReportExecution`.

### 9.1 Invariants

- Export authorization uses the same Organization/Hospital scope as the parent execution.
- The requesting actor must be authorized for both report execution and export.
- Export content is derived only from approved fields and current caller scope.
- The export record retains sanitized metadata, expiry policy, requested format, and audit actors; it never stores secrets.
- A download link or storage reference, if introduced later, must be short-lived and access-controlled.

## 10. Reporting Quality Observation Aggregate

`ReportingQualityObservation` captures a non-mutating, tenant-scoped observation such as incomplete source readiness, missing approved lineage, unresolvable source scope, or partially available report output.

### Invariants

- It must identify the report execution, source context, severity, and safe summary.
- It cannot update the source record or automatically alter Claim, Workflow, Financial, Insurance, or Automation status.
- It must not store credentials, protected document content, or raw external payloads.

## 11. Lifecycle Design

| Aggregate | States | Key Rule |
|---|---|---|
| Report Definition Version | `DRAFT → PUBLISHED → RETIRED` | Publish only after semantic validation; published content is immutable. |
| Report Execution | `REQUESTED → RUNNING → COMPLETED / FAILED / EXPIRED / CANCELLED` | Execution data is scoped and read-only. |
| Controlled Export | `REQUESTED → GENERATED → EXPIRED / FAILED / CANCELLED` | Export inherits the parent execution's scope and permissions. |
| Quality Observation | `OPEN → ACKNOWLEDGED → RESOLVED / DISMISSED` | Resolution changes reporting metadata only, never source truth. |

## 12. Cross-Context Contracts

| Upstream Context | Reporting Consumes | Reporting Must Not Do |
|---|---|---|
| IAM | Actor identity, authorization decision, active-user status | Create users, roles, or permissions. |
| Tenant Management | Organization/Hospital scope and membership | Change tenant membership or Hospital ownership. |
| Insurance Foundation | Partner, product plan, and enablement facts | Change partner lifecycle or integration configuration. |
| Hospital–Payer Integration | Non-secret routing status and channel metadata | Read or expose credentials/secret references. |
| Claim Processing | Claim product, lifecycle facts, status history, non-secret metrics | Change a Claim or interpret Workflow status as Claim status. |
| Workflow Platform | Work item, queue, SLA, and operational-state facts | Change tasks, queues, assignments, or SLA. |
| Financial Management | Immutable financial facts and as-of posting views | Reconcile, settle, recover, or modify postings. |
| AI & Automation | Sanitized request/outcome/review/dispatch metadata | Read secrets, raw payloads, or create external actions. |

## 13. Tenant Isolation and Security

- Organization ID is mandatory on every execution, export, and quality observation.
- All source reads filter by Organization ID; Hospital filters are applied where the report definition permits or requires them.
- Repository queries, application authorization, and REST API routes enforce the same scope; frontend filtering is never trusted.
- Drill-through returns only records visible within the caller's authorized Organization/Hospital scope.
- Reporting output must distinguish `NO_DATA`, `NOT_AUTHORIZED`, `NOT_APPLICABLE`, and `DATA_QUALITY_WARNING` without revealing cross-tenant facts.

## 14. Aggregate Interaction Flow

```text
Authorized Actor
      ↓
Report Definition Version (Published)
      ↓
Report Execution (tenant-scoped, read-only)
      ├── Controlled Export (optional, authorized)
      └── Reporting Quality Observation (optional, non-mutating)
```

## 15. Design Decisions

1. Phase 11 supports platform-governed semantic definitions; tenant-authored arbitrary reports are out of scope.
2. Reported measures are derived from declared source contracts, not copied into a mutable reporting system of record.
3. A future warehouse, materialized views, scheduled delivery, and external BI tool can consume the same Report Definition semantic contract without changing aggregate ownership.
4. Operational entities retain their existing lifecycle authority even when a report displays their state.

## 16. Validation Checklist

| Scenario | Expected Result |
|---|---|
| Publish a definition without lineage | Rejected. |
| Modify a published version | Rejected; create a new Draft version. |
| Execute a report outside caller Organization | Rejected without leaking data. |
| Execute a Hospital-scoped report for another Organization's Hospital | Rejected. |
| Export a report with an unauthorized actor | Rejected. |
| Report detects a missing source fact | Produce a quality observation; do not modify source data. |
| Workflow task state appears in a report | It remains distinct from Claim lifecycle status. |

## 17. Pause for Approval

This document is ready for review. No Logical ERD, Physical Database Design, SQL migration, NestJS code, REST API, or test implementation may begin until it is approved.

**Approval phrase:** `Approve Reporting & BI Bounded Context and Aggregate Design`

**Next deliverable after approval:** Reporting & BI Logical ERD.
