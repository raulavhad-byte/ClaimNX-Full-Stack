export enum PermissionAction {
  // CRUD

  READ = 'read',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  RESTORE = 'restore',

  // Data Operations

  IMPORT = 'import',
  EXPORT = 'export',

  // Workflow

  SUBMIT = 'submit',
  APPROVE = 'approve',
  REJECT = 'reject',

  ASSIGN = 'assign',

  HOLD = 'hold',
  RELEASE = 'release',
  REOPEN = 'reopen',

  // Administration

  MANAGE = 'manage',
  CONFIGURE = 'configure',
  IMPERSONATE = 'impersonate',
}