export const Permissions = {
  DASHBOARD: {
    VIEW: 'dashboard.view',
  },

  USERS: {
    CREATE: 'users.create',
    READ: 'users.read',
    UPDATE: 'users.update',
    DELETE: 'users.delete',
    EXPORT: 'users.export',
  },

  ROLES: {
    CREATE: 'roles.create',
    READ: 'roles.read',
    UPDATE: 'roles.update',
    DELETE: 'roles.delete',
    ASSIGN: 'roles.assign',
  },

  HOSPITALS: {
    CREATE: 'hospitals.create',
    READ: 'hospitals.read',
    UPDATE: 'hospitals.update',
    DELETE: 'hospitals.delete',
  },

  PATIENTS: {
    CREATE: 'patients.create',
    READ: 'patients.read',
    UPDATE: 'patients.update',
    DELETE: 'patients.delete',
    IMPORT: 'patients.import',
    EXPORT: 'patients.export',
  },

  INSURANCE: {
    CREATE: 'insurance.create',
    READ: 'insurance.read',
    UPDATE: 'insurance.update',
    DELETE: 'insurance.delete',
  },

  AUTOMATION: {
    READ: 'automation.read',
    UPDATE: 'automation.update',
  },

  CLAIMS: {
    CREATE: 'claims.create',
    READ: 'claims.read',
    UPDATE: 'claims.update',
    DELETE: 'claims.delete',
    SUBMIT: 'claims.submit',
    RESUBMIT: 'claims.resubmit',
    CANCEL: 'claims.cancel',
    EXPORT: 'claims.export',
  },

  RECONCILIATION: {
    CREATE: 'reconciliation.create',
    READ: 'reconciliation.read',
    UPDATE: 'reconciliation.update',
    DELETE: 'reconciliation.delete',
  },

  RECOVERY: {
    CREATE: 'recovery.create',
    READ: 'recovery.read',
    UPDATE: 'recovery.update',
    DELETE: 'recovery.delete',
  },

  DOCUMENTS: {
    UPLOAD: 'documents.upload',
    READ: 'documents.read',
    DELETE: 'documents.delete',
  },

  REPORTS: {
    VIEW: 'reports.view',
    EXPORT: 'reports.export',
  },

  AUDIT: {
    READ: 'audit.read',
    EXPORT: 'audit.export',
  },

  SETTINGS: {
    VIEW: 'settings.view',
    UPDATE: 'settings.update',
  },
} as const;
