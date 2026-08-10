import type { Alert, Claim, Query, RecoveryRecord, ReconciliationRecord } from '../types';

type Listener = (alerts: Alert[]) => void;

class AlertService {
  private alerts: Alert[] = [];
  private listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.alerts);
    return () => this.listeners.delete(listener);
  }

  scanForAlerts(claims: Claim[], queries: Query[], recoveries: RecoveryRecord[], reconciliations: ReconciliationRecord[]): void {
    void queries;
    void recoveries;
    void reconciliations;
    const now = Date.now();
    const next = claims
      .filter((claim) => claim.status && claim.updatedAt && now - new Date(claim.updatedAt).getTime() > 7 * 86400000)
      .map<Alert>((claim) => ({
        id: `aging-${claim.id}`,
        type: 'Aging',
        priority: 'Medium',
        status: this.alerts.find((alert) => alert.id === `aging-${claim.id}`)?.status || 'Unread',
        title: 'Claim requires attention',
        message: `${claim.caseReferenceId || claim.id} has not been updated for more than 7 days.`,
        hospitalId: (claim as any).hospitalId,
        claimId: claim.id,
        createdAt: claim.updatedAt,
      }));
    this.alerts = next;
    this.listeners.forEach((listener) => listener(this.alerts));
  }

  markAsRead = (id: string): void => this.setStatus(id, 'Read');
  markAllAsRead = (): void => { this.alerts = this.alerts.map((alert) => ({ ...alert, status: 'Read' })); this.emit(); };
  clearAll = (): void => { this.alerts = []; this.emit(); };

  private setStatus(id: string, status: Alert['status']): void {
    this.alerts = this.alerts.map((alert) => alert.id === id ? { ...alert, status } : alert);
    this.emit();
  }

  private emit(): void { this.listeners.forEach((listener) => listener(this.alerts)); }
}

export const alertService = new AlertService();
