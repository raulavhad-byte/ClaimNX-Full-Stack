import { Injectable, Logger } from '@nestjs/common';
import { MailAccountService } from '../accounts/mail-account.service';
import { MailProviderFactory } from '../providers/mail-provider.factory';

@Injectable()
export class MailboxSyncProcessor {
  private readonly logger = new Logger(MailboxSyncProcessor.name);

  constructor(
    private readonly mailAccountService: MailAccountService,
    private readonly providerFactory: MailProviderFactory
  ) {}

  /**
   * Periodic or on-demand worker to poll connected mailboxes for new deltas
   */
  async syncHospitalMailboxes(hospitalId: string) {
    this.logger.log(`Starting mailbox synchronization cycle for hospital: ${hospitalId}`);
    const accounts = await this.mailAccountService.getAccountsByHospital(hospitalId);

    for (const account of accounts) {
      if (account.status === 'ACTIVE' && account.inbound_enabled !== false) {
        try {
          const provider = this.providerFactory.getProvider(account.provider);
          const changes = await provider.listChanges(account, account.sync_cursor);
          this.logger.log(
            `Account ${account.email_address}: Fetched ${changes.messages.length} new messages`
          );
        } catch (err: any) {
          this.logger.error(`Failed to sync account ${account.email_address}: ${err.message}`);
        }
      }
    }
  }
}