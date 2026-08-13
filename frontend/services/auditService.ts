import type { AuditLog } from '../types';

const logs: AuditLog[] = [];

const createAuditLogId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `audit-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const auditService = {
  log: (entry: Omit<AuditLog, 'id' | 'timestamp'> & Partial<Pick<AuditLog, 'id' | 'timestamp'>>) => {
    logs.unshift({
      ...entry,
      id: entry.id || createAuditLogId(),
      timestamp: entry.timestamp || new Date().toISOString(),
    } as AuditLog);
  },
  getLogs: async (filter?: { userId?: string }) =>
    logs.filter((log) => !filter?.userId || log.userId === filter.userId),
};
