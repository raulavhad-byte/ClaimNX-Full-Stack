BEGIN;

-- =============================================================================
-- ClaimNX Enterprise RCM Platform
-- Migration: 202607250001_identity_access_schema.sql
-- Description: Identity & Access Management (IAM) Schema
-- =============================================================================

------------------------------------------------------------------------------
-- 1. Extensions
------------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pgcrypto;

COMMENT ON EXTENSION pgcrypto IS
'Provides cryptographic functions including gen_random_uuid().';

------------------------------------------------------------------------------
-- 2. Shared Functions
------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS
$$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

------------------------------------------------------------------------------
-- 3. Master Tables
------------------------------------------------------------------------------


------------------------------------------------------------------------------
-- Permission Modules
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS permission_modules
(
    id UUID NOT NULL DEFAULT gen_random_uuid(),

    code VARCHAR(100) NOT NULL
        CHECK (length(trim(code)) > 0),

    name VARCHAR(150) NOT NULL
        CHECK (length(trim(name)) > 0),

    description TEXT,

    display_order INTEGER NOT NULL DEFAULT 0
        CHECK (display_order >= 0),

    is_system BOOLEAN NOT NULL DEFAULT TRUE,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(metadata) = 'object'),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    created_by UUID,

    updated_by UUID,

    CONSTRAINT pk_permission_modules
        PRIMARY KEY (id),

    CONSTRAINT uq_permission_modules_code
        UNIQUE (code)
);


------------------------------------------------------------------------------
-- Permission Sub Modules
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS permission_sub_modules
(
    id UUID NOT NULL DEFAULT gen_random_uuid(),

    module_id UUID NOT NULL,

    code VARCHAR(100) NOT NULL
        CHECK (length(trim(code)) > 0),

    name VARCHAR(150) NOT NULL
        CHECK (length(trim(name)) > 0),

    description TEXT,

    display_order INTEGER NOT NULL DEFAULT 0
        CHECK (display_order >= 0),

    is_system BOOLEAN NOT NULL DEFAULT TRUE,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(metadata) = 'object'),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    created_by UUID,

    updated_by UUID,

    CONSTRAINT pk_permission_sub_modules
        PRIMARY KEY (id),

    CONSTRAINT uq_permission_sub_modules_module_code
        UNIQUE (module_id, code)
);

------------------------------------------------------------------------------
-- Permissions
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS permissions
(
    id UUID NOT NULL DEFAULT gen_random_uuid(),

    sub_module_id UUID NOT NULL,
    -- Foreign key will be added in the Foreign Keys section.

    code VARCHAR(150) NOT NULL
        CHECK (length(trim(code)) > 0),

    name VARCHAR(200) NOT NULL
        CHECK (length(trim(name)) > 0),

    description TEXT,

    category VARCHAR(100),

    resource VARCHAR(100) NOT NULL
        CHECK (length(trim(resource)) > 0),

    action VARCHAR(50) NOT NULL
        CHECK (length(trim(action)) > 0),

    scope_required BOOLEAN NOT NULL DEFAULT TRUE,

    display_order INTEGER NOT NULL DEFAULT 0
        CHECK (display_order >= 0),

    is_system BOOLEAN NOT NULL DEFAULT TRUE,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(metadata) = 'object'),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    created_by UUID,

    updated_by UUID,

    CONSTRAINT pk_permissions
        PRIMARY KEY (id),

    CONSTRAINT uq_permissions_code
        UNIQUE (code)
);

------------------------------------------------------------------------------
-- Roles
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS roles
(
    id UUID NOT NULL DEFAULT gen_random_uuid(),

    code VARCHAR(100) NOT NULL
        CHECK (length(trim(code)) > 0),

    name VARCHAR(150) NOT NULL
        CHECK (length(trim(name)) > 0),

    description TEXT,

    is_system BOOLEAN NOT NULL DEFAULT TRUE,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(metadata) = 'object'),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    created_by UUID,

    updated_by UUID,

    CONSTRAINT pk_roles
        PRIMARY KEY (id),

    CONSTRAINT uq_roles_code
        UNIQUE (code)
);

------------------------------------------------------------------------------
-- Scope Types
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS scope_types
(
    id UUID NOT NULL DEFAULT gen_random_uuid(),

    code VARCHAR(100) NOT NULL
        CHECK (length(trim(code)) > 0),

    name VARCHAR(150) NOT NULL
        CHECK (length(trim(name)) > 0),

    description TEXT,

    hierarchy_level INTEGER NOT NULL
        CHECK (hierarchy_level > 0),

    is_system BOOLEAN NOT NULL DEFAULT TRUE,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(metadata) = 'object'),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    created_by UUID,

    updated_by UUID,

    CONSTRAINT pk_scope_types
        PRIMARY KEY (id),

    CONSTRAINT uq_scope_types_code
        UNIQUE (code),

    CONSTRAINT uq_scope_types_hierarchy_level
        UNIQUE (hierarchy_level)
);
------------------------------------------------------------------------------
-- 4. Relationship Tables
------------------------------------------------------------------------------

------------------------------------------------------------------------------
-- Role Permissions
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS role_permissions
(
    id UUID NOT NULL DEFAULT gen_random_uuid(),

    role_id UUID NOT NULL,
    -- Foreign key will be added in the Foreign Keys section.

    permission_id UUID NOT NULL,
    -- Foreign key will be added in the Foreign Keys section.

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    created_by UUID,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(metadata) = 'object'),

    CONSTRAINT pk_role_permissions
        PRIMARY KEY (id),

    CONSTRAINT uq_role_permissions
        UNIQUE (role_id, permission_id)
);

------------------------------------------------------------------------------
-- User Roles
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_roles
(
    id UUID NOT NULL DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL,
    -- Foreign key will be added in the Foreign Keys section.

    role_id UUID NOT NULL,
    -- Foreign key will be added in the Foreign Keys section.

    is_primary BOOLEAN NOT NULL DEFAULT FALSE,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    effective_from TIMESTAMPTZ,

    effective_to TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    created_by UUID,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(metadata) = 'object'),

    CONSTRAINT pk_user_roles
        PRIMARY KEY (id),

    CONSTRAINT uq_user_roles
        UNIQUE (user_id, role_id)
);

------------------------------------------------------------------------------
-- User Scopes
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_scopes
(
    id UUID NOT NULL DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL,
    -- Foreign key will be added in the Foreign Keys section.

    scope_type_id UUID NOT NULL,
    -- Foreign key will be added in the Foreign Keys section.

    scope_reference_id UUID NOT NULL,
    -- Will reference Organization, Hospital, Department, etc.
    -- Foreign key will be added after Organization module is implemented.

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    effective_from TIMESTAMPTZ,

    effective_to TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    created_by UUID,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(metadata) = 'object'),

    CONSTRAINT pk_user_scopes
        PRIMARY KEY (id),

    CONSTRAINT uq_user_scopes
        UNIQUE (
            user_id,
            scope_type_id,
            scope_reference_id
        )
);

------------------------------------------------------------------------------
-- 5. Foreign Keys
------------------------------------------------------------------------------

ALTER TABLE permission_sub_modules
    ADD CONSTRAINT fk_permission_sub_modules_permission_modules
        FOREIGN KEY (module_id)
        REFERENCES permission_modules(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT;

ALTER TABLE permissions
    ADD CONSTRAINT fk_permissions_permission_sub_modules
        FOREIGN KEY (sub_module_id)
        REFERENCES permission_sub_modules(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT;

ALTER TABLE role_permissions
    ADD CONSTRAINT fk_role_permissions_roles
        FOREIGN KEY (role_id)
        REFERENCES roles(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT;

ALTER TABLE role_permissions
    ADD CONSTRAINT fk_role_permissions_permissions
        FOREIGN KEY (permission_id)
        REFERENCES permissions(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT;

ALTER TABLE user_roles
    ADD CONSTRAINT fk_user_roles_roles
        FOREIGN KEY (role_id)
        REFERENCES roles(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT;

ALTER TABLE user_scopes
    ADD CONSTRAINT fk_user_scopes_scope_types
        FOREIGN KEY (scope_type_id)
        REFERENCES scope_types(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT;
------------------------------------------------------------------------------
-- 5. Indexes
------------------------------------------------------------------------------

------------------------------------------------------------------------------
-- Permission Modules
------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_permission_modules_name
    ON permission_modules (name);

CREATE INDEX IF NOT EXISTS idx_permission_modules_active
    ON permission_modules (is_active);

CREATE INDEX IF NOT EXISTS idx_permission_modules_display_order
    ON permission_modules (display_order);

------------------------------------------------------------------------------
-- Permission Sub Modules
------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_permission_sub_modules_module_id
    ON permission_sub_modules (module_id);

CREATE INDEX IF NOT EXISTS idx_permission_sub_modules_name
    ON permission_sub_modules (name);

CREATE INDEX IF NOT EXISTS idx_permission_sub_modules_active
    ON permission_sub_modules (is_active);

CREATE INDEX IF NOT EXISTS idx_permission_sub_modules_display_order
    ON permission_sub_modules (display_order);

------------------------------------------------------------------------------
-- Permissions
------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_permissions_sub_module_id
    ON permissions (sub_module_id);

CREATE INDEX IF NOT EXISTS idx_permissions_resource
    ON permissions (resource);

CREATE INDEX IF NOT EXISTS idx_permissions_action
    ON permissions (action);

CREATE INDEX IF NOT EXISTS idx_permissions_active
    ON permissions (is_active);

CREATE INDEX IF NOT EXISTS idx_permissions_scope_required
    ON permissions (scope_required);

CREATE INDEX IF NOT EXISTS idx_permissions_display_order
    ON permissions (display_order);

------------------------------------------------------------------------------
-- Roles
------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_roles_name
    ON roles (name);

CREATE INDEX IF NOT EXISTS idx_roles_active
    ON roles (is_active);

------------------------------------------------------------------------------
-- Scope Types
------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_scope_types_name
    ON scope_types (name);

CREATE INDEX IF NOT EXISTS idx_scope_types_active
    ON scope_types (is_active);

CREATE INDEX IF NOT EXISTS idx_scope_types_hierarchy_level
    ON scope_types (hierarchy_level);

------------------------------------------------------------------------------
-- Role Permissions
------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id
    ON role_permissions (role_id);

CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id
    ON role_permissions (permission_id);

CREATE INDEX IF NOT EXISTS idx_role_permissions_active
    ON role_permissions (is_active);

------------------------------------------------------------------------------
-- User Roles
------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id
    ON user_roles (user_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_role_id
    ON user_roles (role_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_primary
    ON user_roles (is_primary);

CREATE INDEX IF NOT EXISTS idx_user_roles_active
    ON user_roles (is_active);

------------------------------------------------------------------------------
-- User Scopes
------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_user_scopes_user_id
    ON user_scopes (user_id);

CREATE INDEX IF NOT EXISTS idx_user_scopes_scope_type_id
    ON user_scopes (scope_type_id);

CREATE INDEX IF NOT EXISTS idx_user_scopes_scope_reference_id
    ON user_scopes (scope_reference_id);

CREATE INDEX IF NOT EXISTS idx_user_scopes_active
    ON user_scopes (is_active);

------------------------------------------------------------------------------
-- 7. Triggers
------------------------------------------------------------------------------

CREATE TRIGGER trg_permission_modules_updated_at
BEFORE UPDATE
ON permission_modules
FOR EACH ROW
EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_permission_sub_modules_updated_at
BEFORE UPDATE
ON permission_sub_modules
FOR EACH ROW
EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_permissions_updated_at
BEFORE UPDATE
ON permissions
FOR EACH ROW
EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_roles_updated_at
BEFORE UPDATE
ON roles
FOR EACH ROW
EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_scope_types_updated_at
BEFORE UPDATE
ON scope_types
FOR EACH ROW
EXECUTE FUNCTION fn_set_updated_at();
------------------------------------------------------------------------------
------------------------------------------------------------------------------
-- 8. Row Level Security
------------------------------------------------------------------------------

ALTER TABLE permission_modules
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE permission_sub_modules
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE permissions
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE roles
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE scope_types
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE role_permissions
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE user_roles
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE user_scopes
    ENABLE ROW LEVEL SECURITY;
------------------------------------------------------------------------------
-- 9. Documentation
------------------------------------------------------------------------------

------------------------------------------------------------------------------
-- Permission Modules
------------------------------------------------------------------------------

COMMENT ON TABLE permission_modules IS
'Master catalog of permission modules used by the Identity and Access Management (IAM) system.';

COMMENT ON COLUMN permission_modules.id IS
'Primary key of the permission module.';

COMMENT ON COLUMN permission_modules.code IS
'Unique immutable machine-readable identifier of the permission module.';

COMMENT ON COLUMN permission_modules.name IS
'Human-readable name of the permission module.';

COMMENT ON COLUMN permission_modules.description IS
'Optional business description of the permission module.';

COMMENT ON COLUMN permission_modules.display_order IS
'Display order of the permission module within administration interfaces.';

COMMENT ON COLUMN permission_modules.is_system IS
'Indicates whether the permission module is system-defined and protected from deletion.';

COMMENT ON COLUMN permission_modules.is_active IS
'Indicates whether the permission module is active and available for use.';

COMMENT ON COLUMN permission_modules.metadata IS
'JSON metadata reserved for future extensions and custom attributes.';

COMMENT ON COLUMN permission_modules.created_at IS
'Timestamp when the record was created.';

COMMENT ON COLUMN permission_modules.updated_at IS
'Timestamp when the record was last updated.';

COMMENT ON COLUMN permission_modules.created_by IS
'Identifier of the user who created the record.';

COMMENT ON COLUMN permission_modules.updated_by IS
'Identifier of the user who last updated the record.';

------------------------------------------------------------------------------
-- Permission Sub Modules
------------------------------------------------------------------------------

COMMENT ON TABLE permission_sub_modules IS
'Catalog of permission sub-modules that logically group permissions within a permission module.';

COMMENT ON COLUMN permission_sub_modules.id IS
'Primary key of the permission sub-module.';

COMMENT ON COLUMN permission_sub_modules.module_id IS
'Reference to the parent permission module.';

COMMENT ON COLUMN permission_sub_modules.code IS
'Unique machine-readable identifier of the permission sub-module within its parent module.';

COMMENT ON COLUMN permission_sub_modules.name IS
'Human-readable name of the permission sub-module.';

COMMENT ON COLUMN permission_sub_modules.description IS
'Optional business description of the permission sub-module.';

COMMENT ON COLUMN permission_sub_modules.display_order IS
'Display order of the permission sub-module within its parent module.';

COMMENT ON COLUMN permission_sub_modules.is_system IS
'Indicates whether the permission sub-module is system-defined and protected from deletion.';

COMMENT ON COLUMN permission_sub_modules.is_active IS
'Indicates whether the permission sub-module is active and available for use.';

COMMENT ON COLUMN permission_sub_modules.metadata IS
'JSON metadata reserved for future extensions and custom attributes.';

COMMENT ON COLUMN permission_sub_modules.created_at IS
'Timestamp when the record was created.';

COMMENT ON COLUMN permission_sub_modules.updated_at IS
'Timestamp when the record was last updated.';

COMMENT ON COLUMN permission_sub_modules.created_by IS
'Identifier of the user who created the record.';

COMMENT ON COLUMN permission_sub_modules.updated_by IS
'Identifier of the user who last updated the record.';

------------------------------------------------------------------------------
-- Permissions
------------------------------------------------------------------------------

COMMENT ON TABLE permissions IS
'Master catalog of application permissions used to authorize access to protected resources and operations.';

COMMENT ON COLUMN permissions.id IS
'Primary key of the permission.';

COMMENT ON COLUMN permissions.sub_module_id IS
'Reference to the parent permission sub-module.';

COMMENT ON COLUMN permissions.code IS
'Unique immutable machine-readable permission code used throughout the application.';

COMMENT ON COLUMN permissions.name IS
'Human-readable name of the permission.';

COMMENT ON COLUMN permissions.description IS
'Optional business description of the permission.';

COMMENT ON COLUMN permissions.category IS
'Logical category used to organize permissions for administration and reporting.';

COMMENT ON COLUMN permissions.resource IS
'Application resource protected by this permission.';

COMMENT ON COLUMN permissions.action IS
'Authorized operation that can be performed on the protected resource.';

COMMENT ON COLUMN permissions.scope_required IS
'Indicates whether the permission requires data scope evaluation during authorization.';

COMMENT ON COLUMN permissions.display_order IS
'Display order of the permission within administration interfaces.';

COMMENT ON COLUMN permissions.is_system IS
'Indicates whether the permission is system-defined and protected from deletion.';

COMMENT ON COLUMN permissions.is_active IS
'Indicates whether the permission is active and available for assignment.';

COMMENT ON COLUMN permissions.metadata IS
'JSON metadata reserved for future extensions and custom attributes.';

COMMENT ON COLUMN permissions.created_at IS
'Timestamp when the record was created.';

COMMENT ON COLUMN permissions.updated_at IS
'Timestamp when the record was last updated.';

COMMENT ON COLUMN permissions.created_by IS
'Identifier of the user who created the record.';

COMMENT ON COLUMN permissions.updated_by IS
'Identifier of the user who last updated the record.';

------------------------------------------------------------------------------
-- Roles
------------------------------------------------------------------------------

COMMENT ON TABLE roles IS
'Master catalog of security roles used to group permissions and simplify authorization management.';

COMMENT ON COLUMN roles.id IS
'Primary key of the role.';

COMMENT ON COLUMN roles.code IS
'Unique immutable machine-readable identifier of the role.';

COMMENT ON COLUMN roles.name IS
'Human-readable name of the role.';

COMMENT ON COLUMN roles.description IS
'Optional business description of the role.';

COMMENT ON COLUMN roles.is_system IS
'Indicates whether the role is system-defined and protected from deletion.';

COMMENT ON COLUMN roles.is_active IS
'Indicates whether the role is active and available for assignment.';

COMMENT ON COLUMN roles.metadata IS
'JSON metadata reserved for future extensions and custom attributes.';

COMMENT ON COLUMN roles.created_at IS
'Timestamp when the record was created.';

COMMENT ON COLUMN roles.updated_at IS
'Timestamp when the record was last updated.';

COMMENT ON COLUMN roles.created_by IS
'Identifier of the user who created the record.';

COMMENT ON COLUMN roles.updated_by IS
'Identifier of the user who last updated the record.';

------------------------------------------------------------------------------
-- Scope Types
------------------------------------------------------------------------------

COMMENT ON TABLE scope_types IS
'Master catalog of supported data scope types used to define hierarchical authorization boundaries within the application.';

COMMENT ON COLUMN scope_types.id IS
'Primary key of the scope type.';

COMMENT ON COLUMN scope_types.code IS
'Unique immutable machine-readable identifier of the scope type.';

COMMENT ON COLUMN scope_types.name IS
'Human-readable name of the scope type.';

COMMENT ON COLUMN scope_types.description IS
'Optional business description of the scope type.';

COMMENT ON COLUMN scope_types.hierarchy_level IS
'Hierarchy level used to determine the relative position of the scope type within the authorization hierarchy.';

COMMENT ON COLUMN scope_types.is_system IS
'Indicates whether the scope type is system-defined and protected from deletion.';

COMMENT ON COLUMN scope_types.is_active IS
'Indicates whether the scope type is active and available for use.';

COMMENT ON COLUMN scope_types.metadata IS
'JSON metadata reserved for future extensions and custom attributes.';

COMMENT ON COLUMN scope_types.created_at IS
'Timestamp when the record was created.';

COMMENT ON COLUMN scope_types.updated_at IS
'Timestamp when the record was last updated.';

COMMENT ON COLUMN scope_types.created_by IS
'Identifier of the user who created the record.';

COMMENT ON COLUMN scope_types.updated_by IS
'Identifier of the user who last updated the record.';

------------------------------------------------------------------------------
-- Role Permissions
------------------------------------------------------------------------------

COMMENT ON TABLE role_permissions IS
'Associates security roles with permissions to implement role-based access control (RBAC).';

COMMENT ON COLUMN role_permissions.id IS
'Primary key of the role-permission assignment.';

COMMENT ON COLUMN role_permissions.role_id IS
'Reference to the assigned security role.';

COMMENT ON COLUMN role_permissions.permission_id IS
'Reference to the assigned permission.';

COMMENT ON COLUMN role_permissions.is_active IS
'Indicates whether the role-permission assignment is active.';

COMMENT ON COLUMN role_permissions.created_at IS
'Timestamp when the record was created.';

COMMENT ON COLUMN role_permissions.created_by IS
'Identifier of the user who created the record.';

COMMENT ON COLUMN role_permissions.metadata IS
'JSON metadata reserved for future extensions and custom attributes.';

------------------------------------------------------------------------------
-- User Roles
------------------------------------------------------------------------------

COMMENT ON TABLE user_roles IS
'Associates users with security roles to implement role-based access control (RBAC).';

COMMENT ON COLUMN user_roles.id IS
'Primary key of the user-role assignment.';

COMMENT ON COLUMN user_roles.user_id IS
'Reference to the user assigned to the role.';

COMMENT ON COLUMN user_roles.role_id IS
'Reference to the assigned security role.';

COMMENT ON COLUMN user_roles.is_primary IS
'Indicates whether this is the user''s primary role.';

COMMENT ON COLUMN user_roles.is_active IS
'Indicates whether the user-role assignment is active.';

COMMENT ON COLUMN user_roles.effective_from IS
'Date and time from which the user-role assignment becomes effective.';

COMMENT ON COLUMN user_roles.effective_to IS
'Date and time until which the user-role assignment remains effective.';

COMMENT ON COLUMN user_roles.created_at IS
'Timestamp when the record was created.';

COMMENT ON COLUMN user_roles.created_by IS
'Identifier of the user who created the record.';

COMMENT ON COLUMN user_roles.metadata IS
'JSON metadata reserved for future extensions and custom attributes.';

------------------------------------------------------------------------------
-- User Scopes
------------------------------------------------------------------------------

COMMENT ON TABLE user_scopes IS
'Associates users with data scopes to enforce data-level authorization boundaries.';

COMMENT ON COLUMN user_scopes.id IS
'Primary key of the user-scope assignment.';

COMMENT ON COLUMN user_scopes.user_id IS
'Reference to the user assigned to the data scope.';

COMMENT ON COLUMN user_scopes.scope_type_id IS
'Reference to the scope type that defines the level of authorization.';

COMMENT ON COLUMN user_scopes.scope_reference_id IS
'Reference to the business entity represented by the assigned scope, such as an organization, hospital, department, or other scoped resource.';

COMMENT ON COLUMN user_scopes.is_active IS
'Indicates whether the user-scope assignment is active.';

COMMENT ON COLUMN user_scopes.effective_from IS
'Date and time from which the user-scope assignment becomes effective.';

COMMENT ON COLUMN user_scopes.effective_to IS
'Date and time until which the user-scope assignment remains effective.';

COMMENT ON COLUMN user_scopes.created_at IS
'Timestamp when the record was created.';

COMMENT ON COLUMN user_scopes.created_by IS
'Identifier of the user who created the record.';

COMMENT ON COLUMN user_scopes.metadata IS
'JSON metadata reserved for future extensions and custom attributes.';

COMMIT;