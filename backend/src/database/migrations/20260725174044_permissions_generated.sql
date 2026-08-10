-- ============================================
-- ClaimNX Permission Migration
-- Auto-generated. Do not edit manually.
-- ============================================

BEGIN;

-- --------------------------------------------
-- Permission Modules
-- --------------------------------------------

INSERT INTO permission_modules
(
    code,
    name,
    description,
    display_order,
    is_system,
    is_active
)
VALUES
(
    'analytics',
    'Analytics',
    'Analytics Module',
    0,
    TRUE,
    TRUE
)
ON CONFLICT (code)
DO NOTHING;

INSERT INTO permission_modules
(
    code,
    name,
    description,
    display_order,
    is_system,
    is_active
)
VALUES
(
    'identity-and-access',
    'Identity & Access',
    'Identity & Access Module',
    0,
    TRUE,
    TRUE
)
ON CONFLICT (code)
DO NOTHING;

-- --------------------------------------------
-- Permission Sub Modules
-- --------------------------------------------

INSERT INTO permission_sub_modules
(
    module_id,
    code,
    name,
    description,
    display_order,
    is_system,
    is_active
)
SELECT
    pm.id,
    'authentication',
    'Authentication',
    'Authentication',
    0,
    TRUE,
    TRUE
FROM permission_modules pm
WHERE pm.code='identity-and-access'
ON CONFLICT (module_id, code)
DO NOTHING;

INSERT INTO permission_sub_modules
(
    module_id,
    code,
    name,
    description,
    display_order,
    is_system,
    is_active
)
SELECT
    pm.id,
    'dashboard',
    'Dashboard',
    'Dashboard',
    0,
    TRUE,
    TRUE
FROM permission_modules pm
WHERE pm.code='analytics'
ON CONFLICT (module_id, code)
DO NOTHING;

INSERT INTO permission_sub_modules
(
    module_id,
    code,
    name,
    description,
    display_order,
    is_system,
    is_active
)
SELECT
    pm.id,
    'permissions',
    'Permissions',
    'Permissions',
    0,
    TRUE,
    TRUE
FROM permission_modules pm
WHERE pm.code='identity-and-access'
ON CONFLICT (module_id, code)
DO NOTHING;

INSERT INTO permission_sub_modules
(
    module_id,
    code,
    name,
    description,
    display_order,
    is_system,
    is_active
)
SELECT
    pm.id,
    'roles',
    'Roles',
    'Roles',
    0,
    TRUE,
    TRUE
FROM permission_modules pm
WHERE pm.code='identity-and-access'
ON CONFLICT (module_id, code)
DO NOTHING;

INSERT INTO permission_sub_modules
(
    module_id,
    code,
    name,
    description,
    display_order,
    is_system,
    is_active
)
SELECT
    pm.id,
    'users',
    'Users',
    'Users',
    0,
    TRUE,
    TRUE
FROM permission_modules pm
WHERE pm.code='identity-and-access'
ON CONFLICT (module_id, code)
DO NOTHING;

-- --------------------------------------------
-- Permissions
-- --------------------------------------------

INSERT INTO permissions
(
    sub_module_id,
    resource,
    action,
    code,
    name,
    description,
    category,
    scope_required,
    is_system,
    display_order,
    is_active
)
SELECT
    psm.id,
    'Dashboard',
    'READ',
    'dashboard.view',
    'View Dashboard',
    'Allows viewing the main dashboard.',
    'Administration',
    TRUE,
    TRUE,
    10,
    TRUE
FROM permission_sub_modules psm
INNER JOIN permission_modules pm
    ON pm.id = psm.module_id
WHERE
    pm.code='analytics'
AND psm.code='dashboard'
ON CONFLICT (code)
DO NOTHING;

INSERT INTO permissions
(
    sub_module_id,
    resource,
    action,
    code,
    name,
    description,
    category,
    scope_required,
    is_system,
    display_order,
    is_active
)
SELECT
    psm.id,
    'Dashboard',
    'EXPORT',
    'dashboard.export',
    'Export Dashboard',
    'Allows exporting dashboard data.',
    'Administration',
    TRUE,
    TRUE,
    20,
    TRUE
FROM permission_sub_modules psm
INNER JOIN permission_modules pm
    ON pm.id = psm.module_id
WHERE
    pm.code='analytics'
AND psm.code='dashboard'
ON CONFLICT (code)
DO NOTHING;

INSERT INTO permissions
(
    sub_module_id,
    resource,
    action,
    code,
    name,
    description,
    category,
    scope_required,
    is_system,
    display_order,
    is_active
)
SELECT
    psm.id,
    'Executive Dashboard',
    'READ',
    'dashboard.executive.view',
    'View Executive Dashboard',
    'Allows viewing executive dashboards.',
    'Administration',
    TRUE,
    TRUE,
    30,
    TRUE
FROM permission_sub_modules psm
INNER JOIN permission_modules pm
    ON pm.id = psm.module_id
WHERE
    pm.code='analytics'
AND psm.code='dashboard'
ON CONFLICT (code)
DO NOTHING;

INSERT INTO permissions
(
    sub_module_id,
    resource,
    action,
    code,
    name,
    description,
    category,
    scope_required,
    is_system,
    display_order,
    is_active
)
SELECT
    psm.id,
    'Financial Dashboard',
    'READ',
    'dashboard.financial.view',
    'View Financial Dashboard',
    'Allows viewing financial dashboards.',
    'Administration',
    TRUE,
    TRUE,
    40,
    TRUE
FROM permission_sub_modules psm
INNER JOIN permission_modules pm
    ON pm.id = psm.module_id
WHERE
    pm.code='analytics'
AND psm.code='dashboard'
ON CONFLICT (code)
DO NOTHING;

INSERT INTO permissions
(
    sub_module_id,
    resource,
    action,
    code,
    name,
    description,
    category,
    scope_required,
    is_system,
    display_order,
    is_active
)
SELECT
    psm.id,
    'Operational Dashboard',
    'READ',
    'dashboard.operational.view',
    'View Operational Dashboard',
    'Allows viewing operational dashboards.',
    'Administration',
    TRUE,
    TRUE,
    50,
    TRUE
FROM permission_sub_modules psm
INNER JOIN permission_modules pm
    ON pm.id = psm.module_id
WHERE
    pm.code='analytics'
AND psm.code='dashboard'
ON CONFLICT (code)
DO NOTHING;

INSERT INTO permissions
(
    sub_module_id,
    resource,
    action,
    code,
    name,
    description,
    category,
    scope_required,
    is_system,
    display_order,
    is_active
)
SELECT
    psm.id,
    'Productivity Dashboard',
    'READ',
    'dashboard.productivity.view',
    'View Productivity Dashboard',
    'Allows viewing productivity dashboards.',
    'Administration',
    TRUE,
    TRUE,
    60,
    TRUE
FROM permission_sub_modules psm
INNER JOIN permission_modules pm
    ON pm.id = psm.module_id
WHERE
    pm.code='analytics'
AND psm.code='dashboard'
ON CONFLICT (code)
DO NOTHING;

INSERT INTO permissions
(
    sub_module_id,
    resource,
    action,
    code,
    name,
    description,
    category,
    scope_required,
    is_system,
    display_order,
    is_active
)
SELECT
    psm.id,
    'Authentication',
    'READ',
    'auth.view',
    'View Authentication',
    'Allows viewing authentication information.',
    'Administration',
    FALSE,
    TRUE,
    10,
    TRUE
FROM permission_sub_modules psm
INNER JOIN permission_modules pm
    ON pm.id = psm.module_id
WHERE
    pm.code='identity-and-access'
AND psm.code='authentication'
ON CONFLICT (code)
DO NOTHING;

INSERT INTO permissions
(
    sub_module_id,
    resource,
    action,
    code,
    name,
    description,
    category,
    scope_required,
    is_system,
    display_order,
    is_active
)
SELECT
    psm.id,
    'Authentication',
    'MANAGE',
    'auth.manage',
    'Manage Authentication',
    'Allows managing authentication settings.',
    'Administration',
    FALSE,
    TRUE,
    20,
    TRUE
FROM permission_sub_modules psm
INNER JOIN permission_modules pm
    ON pm.id = psm.module_id
WHERE
    pm.code='identity-and-access'
AND psm.code='authentication'
ON CONFLICT (code)
DO NOTHING;

INSERT INTO permissions
(
    sub_module_id,
    resource,
    action,
    code,
    name,
    description,
    category,
    scope_required,
    is_system,
    display_order,
    is_active
)
SELECT
    psm.id,
    'Session',
    'READ',
    'sessions.view',
    'View Sessions',
    'Allows viewing user sessions.',
    'Administration',
    FALSE,
    TRUE,
    30,
    TRUE
FROM permission_sub_modules psm
INNER JOIN permission_modules pm
    ON pm.id = psm.module_id
WHERE
    pm.code='identity-and-access'
AND psm.code='authentication'
ON CONFLICT (code)
DO NOTHING;

INSERT INTO permissions
(
    sub_module_id,
    resource,
    action,
    code,
    name,
    description,
    category,
    scope_required,
    is_system,
    display_order,
    is_active
)
SELECT
    psm.id,
    'Session',
    'DELETE',
    'sessions.revoke',
    'Revoke Sessions',
    'Allows revoking active user sessions.',
    'Administration',
    FALSE,
    TRUE,
    40,
    TRUE
FROM permission_sub_modules psm
INNER JOIN permission_modules pm
    ON pm.id = psm.module_id
WHERE
    pm.code='identity-and-access'
AND psm.code='authentication'
ON CONFLICT (code)
DO NOTHING;

INSERT INTO permissions
(
    sub_module_id,
    resource,
    action,
    code,
    name,
    description,
    category,
    scope_required,
    is_system,
    display_order,
    is_active
)
SELECT
    psm.id,
    'Session',
    'IMPERSONATE',
    'users.impersonate',
    'Impersonate User',
    'Allows administrators to impersonate another user.',
    'Administration',
    FALSE,
    TRUE,
    50,
    TRUE
FROM permission_sub_modules psm
INNER JOIN permission_modules pm
    ON pm.id = psm.module_id
WHERE
    pm.code='identity-and-access'
AND psm.code='authentication'
ON CONFLICT (code)
DO NOTHING;

INSERT INTO permissions
(
    sub_module_id,
    resource,
    action,
    code,
    name,
    description,
    category,
    scope_required,
    is_system,
    display_order,
    is_active
)
SELECT
    psm.id,
    'Permission',
    'READ',
    'permissions.read',
    'Read Permissions',
    'Allows viewing permissions.',
    'Administration',
    FALSE,
    TRUE,
    10,
    TRUE
FROM permission_sub_modules psm
INNER JOIN permission_modules pm
    ON pm.id = psm.module_id
WHERE
    pm.code='identity-and-access'
AND psm.code='permissions'
ON CONFLICT (code)
DO NOTHING;

INSERT INTO permissions
(
    sub_module_id,
    resource,
    action,
    code,
    name,
    description,
    category,
    scope_required,
    is_system,
    display_order,
    is_active
)
SELECT
    psm.id,
    'Permission',
    'MANAGE',
    'permissions.manage',
    'Manage Permissions',
    'Allows managing system permissions.',
    'Administration',
    FALSE,
    TRUE,
    20,
    TRUE
FROM permission_sub_modules psm
INNER JOIN permission_modules pm
    ON pm.id = psm.module_id
WHERE
    pm.code='identity-and-access'
AND psm.code='permissions'
ON CONFLICT (code)
DO NOTHING;

INSERT INTO permissions
(
    sub_module_id,
    resource,
    action,
    code,
    name,
    description,
    category,
    scope_required,
    is_system,
    display_order,
    is_active
)
SELECT
    psm.id,
    'Role',
    'READ',
    'roles.read',
    'Read Roles',
    'Allows viewing roles.',
    'Administration',
    FALSE,
    TRUE,
    10,
    TRUE
FROM permission_sub_modules psm
INNER JOIN permission_modules pm
    ON pm.id = psm.module_id
WHERE
    pm.code='identity-and-access'
AND psm.code='roles'
ON CONFLICT (code)
DO NOTHING;

INSERT INTO permissions
(
    sub_module_id,
    resource,
    action,
    code,
    name,
    description,
    category,
    scope_required,
    is_system,
    display_order,
    is_active
)
SELECT
    psm.id,
    'Role',
    'CREATE',
    'roles.create',
    'Create Role',
    'Allows creating roles.',
    'Administration',
    FALSE,
    TRUE,
    20,
    TRUE
FROM permission_sub_modules psm
INNER JOIN permission_modules pm
    ON pm.id = psm.module_id
WHERE
    pm.code='identity-and-access'
AND psm.code='roles'
ON CONFLICT (code)
DO NOTHING;

INSERT INTO permissions
(
    sub_module_id,
    resource,
    action,
    code,
    name,
    description,
    category,
    scope_required,
    is_system,
    display_order,
    is_active
)
SELECT
    psm.id,
    'Role',
    'UPDATE',
    'roles.update',
    'Update Role',
    'Allows updating roles.',
    'Administration',
    FALSE,
    TRUE,
    30,
    TRUE
FROM permission_sub_modules psm
INNER JOIN permission_modules pm
    ON pm.id = psm.module_id
WHERE
    pm.code='identity-and-access'
AND psm.code='roles'
ON CONFLICT (code)
DO NOTHING;

INSERT INTO permissions
(
    sub_module_id,
    resource,
    action,
    code,
    name,
    description,
    category,
    scope_required,
    is_system,
    display_order,
    is_active
)
SELECT
    psm.id,
    'Role',
    'DELETE',
    'roles.delete',
    'Delete Role',
    'Allows deleting roles.',
    'Administration',
    FALSE,
    TRUE,
    40,
    TRUE
FROM permission_sub_modules psm
INNER JOIN permission_modules pm
    ON pm.id = psm.module_id
WHERE
    pm.code='identity-and-access'
AND psm.code='roles'
ON CONFLICT (code)
DO NOTHING;

INSERT INTO permissions
(
    sub_module_id,
    resource,
    action,
    code,
    name,
    description,
    category,
    scope_required,
    is_system,
    display_order,
    is_active
)
SELECT
    psm.id,
    'Role',
    'RESTORE',
    'roles.restore',
    'Restore Role',
    'Allows restoring deleted roles.',
    'Administration',
    FALSE,
    TRUE,
    50,
    TRUE
FROM permission_sub_modules psm
INNER JOIN permission_modules pm
    ON pm.id = psm.module_id
WHERE
    pm.code='identity-and-access'
AND psm.code='roles'
ON CONFLICT (code)
DO NOTHING;

INSERT INTO permissions
(
    sub_module_id,
    resource,
    action,
    code,
    name,
    description,
    category,
    scope_required,
    is_system,
    display_order,
    is_active
)
SELECT
    psm.id,
    'Role',
    'MANAGE',
    'roles.manage',
    'Manage Roles',
    'Allows full role management.',
    'Administration',
    FALSE,
    TRUE,
    60,
    TRUE
FROM permission_sub_modules psm
INNER JOIN permission_modules pm
    ON pm.id = psm.module_id
WHERE
    pm.code='identity-and-access'
AND psm.code='roles'
ON CONFLICT (code)
DO NOTHING;

INSERT INTO permissions
(
    sub_module_id,
    resource,
    action,
    code,
    name,
    description,
    category,
    scope_required,
    is_system,
    display_order,
    is_active
)
SELECT
    psm.id,
    'Role',
    'ASSIGN',
    'roles.assign-permissions',
    'Assign Permissions',
    'Allows assigning permissions to roles.',
    'Administration',
    FALSE,
    TRUE,
    70,
    TRUE
FROM permission_sub_modules psm
INNER JOIN permission_modules pm
    ON pm.id = psm.module_id
WHERE
    pm.code='identity-and-access'
AND psm.code='roles'
ON CONFLICT (code)
DO NOTHING;

INSERT INTO permissions
(
    sub_module_id,
    resource,
    action,
    code,
    name,
    description,
    category,
    scope_required,
    is_system,
    display_order,
    is_active
)
SELECT
    psm.id,
    'User',
    'READ',
    'users.view',
    'View Users',
    'Allows viewing user details.',
    'Administration',
    FALSE,
    TRUE,
    10,
    TRUE
FROM permission_sub_modules psm
INNER JOIN permission_modules pm
    ON pm.id = psm.module_id
WHERE
    pm.code='identity-and-access'
AND psm.code='users'
ON CONFLICT (code)
DO NOTHING;

INSERT INTO permissions
(
    sub_module_id,
    resource,
    action,
    code,
    name,
    description,
    category,
    scope_required,
    is_system,
    display_order,
    is_active
)
SELECT
    psm.id,
    'User',
    'READ',
    'users.list',
    'List Users',
    'Allows listing users.',
    'Administration',
    FALSE,
    TRUE,
    20,
    TRUE
FROM permission_sub_modules psm
INNER JOIN permission_modules pm
    ON pm.id = psm.module_id
WHERE
    pm.code='identity-and-access'
AND psm.code='users'
ON CONFLICT (code)
DO NOTHING;

INSERT INTO permissions
(
    sub_module_id,
    resource,
    action,
    code,
    name,
    description,
    category,
    scope_required,
    is_system,
    display_order,
    is_active
)
SELECT
    psm.id,
    'User',
    'READ',
    'users.search',
    'Search Users',
    'Allows searching users.',
    'Administration',
    FALSE,
    TRUE,
    30,
    TRUE
FROM permission_sub_modules psm
INNER JOIN permission_modules pm
    ON pm.id = psm.module_id
WHERE
    pm.code='identity-and-access'
AND psm.code='users'
ON CONFLICT (code)
DO NOTHING;

INSERT INTO permissions
(
    sub_module_id,
    resource,
    action,
    code,
    name,
    description,
    category,
    scope_required,
    is_system,
    display_order,
    is_active
)
SELECT
    psm.id,
    'User',
    'EXPORT',
    'users.export',
    'Export Users',
    'Allows exporting users.',
    'Administration',
    FALSE,
    TRUE,
    40,
    TRUE
FROM permission_sub_modules psm
INNER JOIN permission_modules pm
    ON pm.id = psm.module_id
WHERE
    pm.code='identity-and-access'
AND psm.code='users'
ON CONFLICT (code)
DO NOTHING;

INSERT INTO permissions
(
    sub_module_id,
    resource,
    action,
    code,
    name,
    description,
    category,
    scope_required,
    is_system,
    display_order,
    is_active
)
SELECT
    psm.id,
    'User',
    'CREATE',
    'users.create',
    'Create User',
    'Allows creating users.',
    'Administration',
    FALSE,
    TRUE,
    50,
    TRUE
FROM permission_sub_modules psm
INNER JOIN permission_modules pm
    ON pm.id = psm.module_id
WHERE
    pm.code='identity-and-access'
AND psm.code='users'
ON CONFLICT (code)
DO NOTHING;

INSERT INTO permissions
(
    sub_module_id,
    resource,
    action,
    code,
    name,
    description,
    category,
    scope_required,
    is_system,
    display_order,
    is_active
)
SELECT
    psm.id,
    'User',
    'UPDATE',
    'users.edit',
    'Edit User',
    'Allows editing users.',
    'Administration',
    FALSE,
    TRUE,
    60,
    TRUE
FROM permission_sub_modules psm
INNER JOIN permission_modules pm
    ON pm.id = psm.module_id
WHERE
    pm.code='identity-and-access'
AND psm.code='users'
ON CONFLICT (code)
DO NOTHING;

INSERT INTO permissions
(
    sub_module_id,
    resource,
    action,
    code,
    name,
    description,
    category,
    scope_required,
    is_system,
    display_order,
    is_active
)
SELECT
    psm.id,
    'User',
    'DELETE',
    'users.delete',
    'Delete User',
    'Allows deleting users.',
    'Administration',
    FALSE,
    TRUE,
    70,
    TRUE
FROM permission_sub_modules psm
INNER JOIN permission_modules pm
    ON pm.id = psm.module_id
WHERE
    pm.code='identity-and-access'
AND psm.code='users'
ON CONFLICT (code)
DO NOTHING;

INSERT INTO permissions
(
    sub_module_id,
    resource,
    action,
    code,
    name,
    description,
    category,
    scope_required,
    is_system,
    display_order,
    is_active
)
SELECT
    psm.id,
    'User',
    'RESTORE',
    'users.restore',
    'Restore User',
    'Allows restoring deleted users.',
    'Administration',
    FALSE,
    TRUE,
    80,
    TRUE
FROM permission_sub_modules psm
INNER JOIN permission_modules pm
    ON pm.id = psm.module_id
WHERE
    pm.code='identity-and-access'
AND psm.code='users'
ON CONFLICT (code)
DO NOTHING;

INSERT INTO permissions
(
    sub_module_id,
    resource,
    action,
    code,
    name,
    description,
    category,
    scope_required,
    is_system,
    display_order,
    is_active
)
SELECT
    psm.id,
    'User',
    'MANAGE',
    'users.manage',
    'Manage Users',
    'Allows full user management.',
    'Administration',
    FALSE,
    TRUE,
    90,
    TRUE
FROM permission_sub_modules psm
INNER JOIN permission_modules pm
    ON pm.id = psm.module_id
WHERE
    pm.code='identity-and-access'
AND psm.code='users'
ON CONFLICT (code)
DO NOTHING;

INSERT INTO permissions
(
    sub_module_id,
    resource,
    action,
    code,
    name,
    description,
    category,
    scope_required,
    is_system,
    display_order,
    is_active
)
SELECT
    psm.id,
    'User',
    'CREATE',
    'users.invite',
    'Invite Users',
    'Allows inviting new users.',
    'Administration',
    FALSE,
    TRUE,
    100,
    TRUE
FROM permission_sub_modules psm
INNER JOIN permission_modules pm
    ON pm.id = psm.module_id
WHERE
    pm.code='identity-and-access'
AND psm.code='users'
ON CONFLICT (code)
DO NOTHING;

INSERT INTO permissions
(
    sub_module_id,
    resource,
    action,
    code,
    name,
    description,
    category,
    scope_required,
    is_system,
    display_order,
    is_active
)
SELECT
    psm.id,
    'User',
    'UPDATE',
    'users.activate',
    'Activate Users',
    'Allows activating user accounts.',
    'Administration',
    FALSE,
    TRUE,
    110,
    TRUE
FROM permission_sub_modules psm
INNER JOIN permission_modules pm
    ON pm.id = psm.module_id
WHERE
    pm.code='identity-and-access'
AND psm.code='users'
ON CONFLICT (code)
DO NOTHING;

INSERT INTO permissions
(
    sub_module_id,
    resource,
    action,
    code,
    name,
    description,
    category,
    scope_required,
    is_system,
    display_order,
    is_active
)
SELECT
    psm.id,
    'User',
    'UPDATE',
    'users.deactivate',
    'Deactivate Users',
    'Allows deactivating user accounts.',
    'Administration',
    FALSE,
    TRUE,
    120,
    TRUE
FROM permission_sub_modules psm
INNER JOIN permission_modules pm
    ON pm.id = psm.module_id
WHERE
    pm.code='identity-and-access'
AND psm.code='users'
ON CONFLICT (code)
DO NOTHING;

INSERT INTO permissions
(
    sub_module_id,
    resource,
    action,
    code,
    name,
    description,
    category,
    scope_required,
    is_system,
    display_order,
    is_active
)
SELECT
    psm.id,
    'User',
    'UPDATE',
    'users.unlock',
    'Unlock Users',
    'Allows unlocking user accounts.',
    'Administration',
    FALSE,
    TRUE,
    130,
    TRUE
FROM permission_sub_modules psm
INNER JOIN permission_modules pm
    ON pm.id = psm.module_id
WHERE
    pm.code='identity-and-access'
AND psm.code='users'
ON CONFLICT (code)
DO NOTHING;

INSERT INTO permissions
(
    sub_module_id,
    resource,
    action,
    code,
    name,
    description,
    category,
    scope_required,
    is_system,
    display_order,
    is_active
)
SELECT
    psm.id,
    'User',
    'UPDATE',
    'users.reset-password',
    'Reset User Password',
    'Allows resetting user passwords.',
    'Administration',
    FALSE,
    TRUE,
    140,
    TRUE
FROM permission_sub_modules psm
INNER JOIN permission_modules pm
    ON pm.id = psm.module_id
WHERE
    pm.code='identity-and-access'
AND psm.code='users'
ON CONFLICT (code)
DO NOTHING;

INSERT INTO permissions
(
    sub_module_id,
    resource,
    action,
    code,
    name,
    description,
    category,
    scope_required,
    is_system,
    display_order,
    is_active
)
SELECT
    psm.id,
    'User',
    'UPDATE',
    'users.force-password-change',
    'Force Password Change',
    'Allows forcing password change on next login.',
    'Administration',
    FALSE,
    TRUE,
    150,
    TRUE
FROM permission_sub_modules psm
INNER JOIN permission_modules pm
    ON pm.id = psm.module_id
WHERE
    pm.code='identity-and-access'
AND psm.code='users'
ON CONFLICT (code)
DO NOTHING;

INSERT INTO permissions
(
    sub_module_id,
    resource,
    action,
    code,
    name,
    description,
    category,
    scope_required,
    is_system,
    display_order,
    is_active
)
SELECT
    psm.id,
    'User',
    'DELETE',
    'users.force-logout',
    'Force Logout',
    'Allows terminating all active user sessions.',
    'Administration',
    FALSE,
    TRUE,
    160,
    TRUE
FROM permission_sub_modules psm
INNER JOIN permission_modules pm
    ON pm.id = psm.module_id
WHERE
    pm.code='identity-and-access'
AND psm.code='users'
ON CONFLICT (code)
DO NOTHING;

INSERT INTO permissions
(
    sub_module_id,
    resource,
    action,
    code,
    name,
    description,
    category,
    scope_required,
    is_system,
    display_order,
    is_active
)
SELECT
    psm.id,
    'User',
    'MANAGE',
    'users.assign-roles',
    'Assign Roles',
    'Allows assigning roles to users.',
    'Administration',
    FALSE,
    TRUE,
    170,
    TRUE
FROM permission_sub_modules psm
INNER JOIN permission_modules pm
    ON pm.id = psm.module_id
WHERE
    pm.code='identity-and-access'
AND psm.code='users'
ON CONFLICT (code)
DO NOTHING;

COMMIT;
