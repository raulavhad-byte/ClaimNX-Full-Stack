# Workflow Platform REST API

## Objective

Expose the approved Phase 6 Workflow Platform commands and read models through authenticated, tenant-isolated REST endpoints.

## Why

The API is the only HTTP boundary for Workflow Platform consumers. It delegates business rules to application use cases and database command functions; it does not bypass aggregate, tenant, audit, or optimistic-concurrency rules.

## File Path

`src/modules/workflow/api/workflow-v1.controller.ts`

## Authentication and Authorization

- Every endpoint requires a valid JWT.
- Tenant-scoped commands and reads verify active Organization Membership in the application layer.
- Permissions are enforced by `PermissionsGuard`.
- All mutation requests include an `expectedVersion`; a stale version returns HTTP `409 Conflict`.

## Endpoint Contract

| Resource            | Endpoint                                                                                    | Permission                    |
| ------------------- | ------------------------------------------------------------------------------------------- | ----------------------------- |
| Workflow Definition | `POST /v1/workflow-definitions`                                                             | `workflow.definitions.manage` |
| Workflow Definition | `GET /v1/workflow-definitions/:workflowDefinitionId`                                        | `workflow.definitions.view`   |
| Workflow Definition | `PATCH /v1/workflow-definitions/:workflowDefinitionId/activate`                             | `workflow.definitions.manage` |
| Workflow Definition | `DELETE /v1/workflow-definitions/:workflowDefinitionId`                                     | `workflow.definitions.manage` |
| Workflow Instance   | `POST /v1/organizations/:organizationId/workflow-instances`                                 | `workflow.instances.manage`   |
| Workflow Instance   | `GET /v1/organizations/:organizationId/workflow-instances/:workflowInstanceId`              | `workflow.instances.view`     |
| Workflow Instance   | `PATCH /v1/organizations/:organizationId/workflow-instances/:workflowInstanceId/transition` | `workflow.instances.manage`   |
| Workflow Instance   | `PATCH /v1/organizations/:organizationId/workflow-instances/:workflowInstanceId/cancel`     | `workflow.instances.manage`   |
| Workflow Queue      | `POST /v1/organizations/:organizationId/workflow-queues`                                    | `workflow.queues.manage`      |
| Workflow Queue      | `GET /v1/organizations/:organizationId/workflow-queues/:workflowQueueId`                    | `workflow.queues.view`        |
| Workflow Queue      | `PATCH /v1/organizations/:organizationId/workflow-queues/:workflowQueueId`                  | `workflow.queues.manage`      |
| Workflow Queue      | `PATCH /v1/organizations/:organizationId/workflow-queues/:workflowQueueId/activate`         | `workflow.queues.manage`      |
| Workflow Queue      | `PATCH /v1/organizations/:organizationId/workflow-queues/:workflowQueueId/deactivate`       | `workflow.queues.manage`      |
| Workflow Queue      | `DELETE /v1/organizations/:organizationId/workflow-queues/:workflowQueueId`                 | `workflow.queues.manage`      |
| Work Item           | `POST /v1/organizations/:organizationId/work-items`                                         | `workflow.work-items.manage`  |
| Work Item           | `GET /v1/organizations/:organizationId/work-items/:workflowTaskId`                          | `workflow.work-items.view`    |
| Work Item           | `PATCH /v1/organizations/:organizationId/work-items/:workflowTaskId/assignment`             | `workflow.work-items.manage`  |
| Work Item           | `PATCH /v1/organizations/:organizationId/work-items/:workflowTaskId/transition`             | `workflow.work-items.manage`  |
| Work Item SLA       | `PATCH /v1/organizations/:organizationId/work-items/:workflowTaskId/sla`                    | `workflow.work-items.manage`  |
| Work Item           | `DELETE /v1/organizations/:organizationId/work-items/:workflowTaskId`                       | `workflow.work-items.manage`  |

## Validation

- Request DTOs validate UUIDs, required strings, nesting, booleans, and positive integer versions before invoking use cases.
- `POST /work-items` returns both `workflowTaskId` and `workflowSlaId` (when an SLA was requested), allowing a client to call the SLA update endpoint without a database lookup.
- Aggregate and lifecycle validation remains authoritative in the domain and PostgreSQL command functions.
- Read endpoints never accept a tenant identifier from request body; it is always taken from the URL and verified against the authenticated user.

## Status

Implemented and unit-tested. End-to-end API testing is the next approval gate.
