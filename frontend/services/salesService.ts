import type { Claim } from '../types';

const targets: any[] = [];
const visits: any[] = [];

const subscribe = (items: any[], callback: (value: any[]) => void) => {
  callback(items);
  return () => undefined;
};

const asAmount = (value: unknown): number => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

const claimAmount = (claim: Claim): number =>
  asAmount(claim.formData?.fin_app_amt) ||
  asAmount(claim.formData?.finalApprovalAmount) ||
  asAmount(claim.estimatedCost);

const isSameDay = (value: Date, reference: Date) =>
  value.getFullYear() === reference.getFullYear() &&
  value.getMonth() === reference.getMonth() &&
  value.getDate() === reference.getDate();

const beginningOfWeek = (value: Date) => {
  const start = new Date(value);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
};

/** Returns a complete numeric shape even while data is synchronising. */
const getPerformanceData = (claims: Claim[]) => {
  const now = new Date();
  const weekStart = beginningOfWeek(now);
  const metrics = {
    daily: 0,
    weekly: 0,
    monthly: 0,
    yearly: 0,
    productWise: {
      cashless: { revenue: 0, cases: 0 },
      reimbursement: { revenue: 0, cases: 0 },
    },
  };

  for (const claim of Array.isArray(claims) ? claims : []) {
    const createdAt = new Date(claim.createdAt);
    if (Number.isNaN(createdAt.getTime())) continue;

    const amount = claimAmount(claim);
    if (isSameDay(createdAt, now)) metrics.daily += amount;
    if (createdAt >= weekStart && createdAt <= now) metrics.weekly += amount;
    if (createdAt.getFullYear() === now.getFullYear() && createdAt.getMonth() === now.getMonth()) metrics.monthly += amount;
    if (createdAt.getFullYear() === now.getFullYear()) metrics.yearly += amount;

    const product = claim.claimType === 'Reimbursement' ? 'reimbursement' : 'cashless';
    metrics.productWise[product].revenue += amount;
    metrics.productWise[product].cases += 1;
  }

  return metrics;
};

export const salesService = {
  subscribeToTargets: (_userId: any, callback: (value: any[]) => void) => subscribe(targets, callback),
  subscribeToVisits: (_userId: any, callback: (value: any[]) => void) => subscribe(visits, callback),
  subscribeToLeads: (_filter: any, callback: (value: any[]) => void) => subscribe([], callback),
  addTarget: async (target: any) => { targets.push(target); return target; },
  addVisit: async (visit: any) => { visits.push(visit); return visit; },
  getPerformanceData,
};
