import { Claim, ClaimStatus, NotificationTemplate, HospitalNotificationConfig } from '../types';

/**
 * Scalable Notification Service Architecture
 * This service is designed to be integration-ready for third-party WhatsApp/SMS providers.
 */
class NotificationService {
  private static instance: NotificationService;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Main entry point for triggering notifications on stage changes.
   */
  public async triggerStageNotification(claim: Claim, prevStatus: ClaimStatus | undefined): Promise<void> {
    if (claim.status === prevStatus) return;

    console.log(`[Notification Engine] Stage transition detected: ${prevStatus} -> ${claim.status}`);
    this.mockDispatch(claim);
  }

  private resolveTemplate(template: string, data: any): string {
    return template.replace(/\{\{(.*?)\}\}/g, (_, key) => {
      const value = data[key.trim()];
      return value !== undefined ? String(value) : `{{${key}}}`;
    });
  }

  private async mockDispatch(claim: Claim) {
    const payload = {
      patientName: claim.patientName,
      claimId: claim.id,
      claimStatus: claim.status,
      hospitalName: claim.formData?.hospitalName || 'your hospital'
    };

    console.log(`[Notification Service] Dispatching to ${claim.patientName} for stage: ${claim.status}`);
  }
}

export const notificationService = NotificationService.getInstance();