import {
  PermissionAction,
  PermissionCategory,
  PermissionDefinition,
  PermissionFactory,
} from '../shared';

const DASHBOARD_PERMISSION_BASE = {
  module: 'Analytics',
  subModule: 'Dashboard',
  category: PermissionCategory.ADMINISTRATION,
  scopeRequired: true,
} as const;

export const DashboardPermissions: PermissionDefinition[] = [
  // ============================
  // Dashboard
  // ============================

  PermissionFactory.build(
    {
      ...DASHBOARD_PERMISSION_BASE,
      resource: 'Dashboard',
      code: 'dashboard.view',
      name: 'View Dashboard',
      description: 'Allows viewing the main dashboard.',
      displayOrder: 10,
    },
    PermissionAction.READ,
  ),

  PermissionFactory.build(
    {
      ...DASHBOARD_PERMISSION_BASE,
      resource: 'Dashboard',
      code: 'dashboard.export',
      name: 'Export Dashboard',
      description: 'Allows exporting dashboard data.',
      displayOrder: 20,
    },
    PermissionAction.EXPORT,
  ),

  // ============================
  // Executive Dashboard
  // ============================

  PermissionFactory.build(
    {
      ...DASHBOARD_PERMISSION_BASE,
      resource: 'Executive Dashboard',
      code: 'dashboard.executive.view',
      name: 'View Executive Dashboard',
      description: 'Allows viewing executive dashboards.',
      displayOrder: 30,
    },
    PermissionAction.READ,
  ),

  // ============================
  // Financial Dashboard
  // ============================

  PermissionFactory.build(
    {
      ...DASHBOARD_PERMISSION_BASE,
      resource: 'Financial Dashboard',
      code: 'dashboard.financial.view',
      name: 'View Financial Dashboard',
      description: 'Allows viewing financial dashboards.',
      displayOrder: 40,
    },
    PermissionAction.READ,
  ),

  // ============================
  // Operational Dashboard
  // ============================

  PermissionFactory.build(
    {
      ...DASHBOARD_PERMISSION_BASE,
      resource: 'Operational Dashboard',
      code: 'dashboard.operational.view',
      name: 'View Operational Dashboard',
      description: 'Allows viewing operational dashboards.',
      displayOrder: 50,
    },
    PermissionAction.READ,
  ),

  // ============================
  // Productivity Dashboard
  // ============================

  PermissionFactory.build(
    {
      ...DASHBOARD_PERMISSION_BASE,
      resource: 'Productivity Dashboard',
      code: 'dashboard.productivity.view',
      name: 'View Productivity Dashboard',
      description: 'Allows viewing productivity dashboards.',
      displayOrder: 60,
    },
    PermissionAction.READ,
  ),
];