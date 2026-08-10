const logs: any[] = [];
export const auditService = {
  log: (entry: any) => { logs.unshift({ ...entry, timestamp: entry.timestamp || new Date().toISOString() }); },
  getLogs: async (filter?: any) => logs.filter((log) => !filter?.userId || log.userId === filter.userId),
};
