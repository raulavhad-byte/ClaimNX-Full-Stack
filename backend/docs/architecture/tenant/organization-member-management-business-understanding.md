# Organization Member Management — Business Understanding

| Field | Value |
|---|---|
| Module | Tenant Management |
| Capability | Organization Member Management |
| Phase | Phase 5 — Tenant Management |
| Status | Approved — 2026-07-30 |
| Owner | Solution Architecture |
| Date | 2026-07-30 |

## Objective

Define how an Organization grants, changes, suspends, and removes a user's
membership in that Organization while preserving ClaimNX tenant isolation,
IAM ownership, auditability, and future healthcare operating requirements.

## Why

ClaimNX is a multi-tenant healthcare platform. A user may need access to one
or more Organizations, but that access must be explicit, authorized, and
auditable. A user account alone must never grant access to a tenant's hospital,
claims, financial, or configuration data.

Organization Member Management establishes the approved business relationship
between an Organization and an IAM User. It is the foundation used by all
tenant-scoped modules to decide whether a caller may act within a selected
Organization.

## Business Problem

Platform and Organization administrators need a controlled way to manage the
people who can work inside an Organization. They need to:

- add an existing IAM user to an Organization;
- give the member an approved tenant role or access scope;
- activate or suspend the member without deleting their IAM identity;
- remove a member from an Organization without destroying audit history; and
- ensure that a member of Organization A cannot access Organization B unless a
  separate active membership exists for Organization B.

Without this capability, tenant access can be inferred incorrectly from a
global user role or untrusted frontend selection. That would violate ClaimNX
tenant-isolation and least-privilege requirements.

## Existing Foundation

The platform already has IAM Users, Roles, Permissions, Organizations, and an
existing `public.organization_members` relationship. This is an existing
foundation, not automatic approval of its final Phase 5 design.

No existing table, migration, API, or code is changed in this stage. The
current implementation will be inspected during Physical Database Design only
after the business and architecture stages are approved.

## In Scope

- An Organization-owned membership relationship to an existing IAM User.
- Explicit association of a member with exactly one Organization per
  membership record.
- Membership lifecycle: active, suspended/inactive, and soft-deleted/retired.
- Tenant-scoped authorization for reading and managing memberships.
- Assignment of approved Organization/IAM role or access scope to a member.
- Audit fields, optimistic concurrency, and soft deletion.
- Prevention of duplicate active membership for the same User and
  Organization.
- Support for a user having memberships in more than one Organization when
  separately authorized.
- Future consumption by Hospital, Workflow, Insurance, Claims, Financial, and
  Reporting modules without those modules owning membership records.

## Explicitly Out of Scope

- Creating, authenticating, disabling, or deleting IAM Users.
- Password reset, MFA, SSO, token issuance, or session management.
- Creating global IAM Roles, Permissions, or access scopes.
- Hospital employee/department assignment. Hospital remains an independent
  aggregate; it may consume an approved membership only through a future,
  explicit business requirement.
- Patient, provider, insurer, claim, settlement, or workflow assignment
  management.
- A separate invitation-email delivery service. Invitation delivery may be a
  future integration once the membership business workflow is approved.
- Frontend screens.

## Proposed Domain Boundary — For Approval

**Bounded Context:** Tenant Management

**Proposed Aggregate Root:** Organization Member

**Ownership:** An Organization owns its Organization Member relationships.
IAM owns Users, Roles, and Permissions. Organization Member Management stores
only the tenant-scoped membership and its approved authorization assignment; it
does not copy or own the User identity, credentials, or global role catalogue.

**Key boundary rule:** A membership may reference an IAM User and an approved
role/access scope, but it cannot create, modify, or delete either of those IAM
records.

## Candidate Business Capabilities

| Capability | Business outcome |
|---|---|
| List Organization Members | An authorized caller can view active or historical memberships for their Organization only. |
| Add Member | An authorized administrator can associate an existing IAM User with their Organization. |
| Change Member Authorization | An authorized administrator can change the approved tenant role or access scope under optimistic concurrency. |
| Activate / Suspend Member | A member can be enabled or suspended without deleting the user or losing membership history. |
| Retire Membership | A membership can be soft-deleted when the relationship ends. |
| Resolve Tenant Access | Tenant-scoped modules can verify that the current user has an active membership in the requested Organization. |
| Audit Membership Changes | Every lifecycle and authorization change records actor, timestamps, and version. |

## Initial Business Rules — For Approval

1. Every Organization Member belongs to exactly one Organization and one IAM
   User.
2. A User may belong to multiple Organizations only through separate,
   explicitly authorized membership records.
3. At most one active, non-deleted membership may exist for a given
   `(organization_id, user_id)` pair.
4. A membership cannot be reassigned to a different Organization or User after
   creation; create a new membership instead.
5. A membership is active only when its lifecycle status is active and it is
   not soft-deleted.
6. A suspended or retired membership must not authorize tenant-scoped actions.
7. Normal removal uses soft deletion only; the IAM User remains unaffected.
8. Only approved IAM/Organization role or access-scope values may be assigned
   to a membership.
9. Membership changes require optimistic concurrency using `version`.
10. Tenant isolation is enforced at database, service, and API layers; the
    frontend-selected Organization is never trusted by itself.
11. An actor cannot manage a membership unless they have both an active
    membership in the Organization and the required permission.
12. A last-tenant-administrator protection rule may be required, but cannot be
    designed until the business confirms how tenant administration is assigned.

## Decisions Needed Before Domain Analysis

1. **Member creation model:** Must the IAM User already exist before creating
   membership?
   - Recommended: yes. Phase 5 adds only an existing IAM User; invitation and
     user-provisioning are a later workflow.
2. **Tenant authorization model:** Is a membership assigned one approved
   Organization Role, or multiple Access Scopes directly?
   - Recommended: use the existing approved Organization/IAM role model as the
     primary assignment; do not introduce a second permission system.
3. **Membership lifecycle:** Do we need both `ACTIVE` and `SUSPENDED` in
   addition to soft deletion?
   - Recommended: yes. Suspension is reversible; soft deletion retires the
     relationship.
4. **Last administrator protection:** Must the system block suspension,
   retirement, or role downgrade of the final active tenant administrator?
   - Recommended: yes, if the business confirms a recognized tenant
     administrator role/permission.
5. **Cross-organization users:** Can one user hold different roles in different
   Organizations?
   - Recommended: yes. This is a core multi-tenant requirement.

## Validation

- Ownership remains within Tenant Management and does not cross into IAM User,
  Role, Permission, Hospital, or Workflow ownership.
- No SQL, migration, API, or implementation has been created in this stage.
- The proposal supports multi-organization users without weakening tenant
  isolation.
- The proposed scope is compatible with the approved Phase 5 architecture and
  with existing organization membership foundations.

## Approval Record

Approved on 2026-07-30. The next step is **Organization Member Management —
Domain Analysis**.
