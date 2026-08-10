const targets: any[] = [];
const visits: any[] = [];
const subscribe = (items: any[], callback: (value: any[]) => void) => { callback(items); return () => undefined; };
export const salesService = {
  subscribeToTargets: (_userId: any, callback: (value: any[]) => void) => subscribe(targets, callback),
  subscribeToVisits: (_userId: any, callback: (value: any[]) => void) => subscribe(visits, callback),
  subscribeToLeads: (_filter: any, callback: (value: any[]) => void) => subscribe([], callback),
  addTarget: async (target: any) => { targets.push(target); return target; },
  addVisit: async (visit: any) => { visits.push(visit); return visit; },
  getPerformanceData: (_claims: any[], _userId?: string) => ({ targets, visits, leads: [] }),
};
