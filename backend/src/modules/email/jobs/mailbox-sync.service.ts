import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { EmailService } from '../email.service';
import { MailAccountRepository } from '../accounts/mail-account.repository';
import { GmailProvider } from '../providers/gmail.provider';
import { MailboxSyncStateRepository } from './mailbox-sync-state.repository';

@Injectable()
export class MailboxSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MailboxSyncService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly config: ConfigService,
    private readonly accounts: MailAccountRepository,
    private readonly email: EmailService,
    private readonly gmail: GmailProvider,
    private readonly state: MailboxSyncStateRepository,
  ) {}

  onModuleInit() {
    // Explicit opt-in prevents a deployment from issuing provider requests
    // before the sync-state migration and webhook configuration are present.
    if (this.config.get<string>('EMAIL_SYNC_ENABLED') !== 'true') return;
    const interval = this.number('EMAIL_SYNC_TICK_INTERVAL_MS', 30_000);
    this.timer = setInterval(() => void this.tick(), interval);
    void this.tick();
  }

  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  async requestProviderSync(provider: string, emailAddress: string) {
    const account = await this.accounts.findActiveByProviderEmail(provider, emailAddress);
    if (!account) return false;
    await this.state.requestSync(account.id);
    return true;
  }

  private async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const accounts = (await this.accounts.findAllSyncable()).slice(0, this.number('EMAIL_SYNC_BATCH_SIZE', 100));
      for (const account of accounts) await this.processAccount(account);
    } catch (error: any) {
      this.logger.error(`Mailbox scheduler failed (code=${String(error?.code ?? 'unknown')}).`);
    } finally { this.running = false; }
  }

  private async processAccount(account: any) {
    const state = await this.state.getOrCreate(account.id);
    const now = Date.now();
    const provider = String(account.provider);
    const eventDriven = provider === 'GMAIL' || provider === 'MICROSOFT_365';
    const needsRenewal = !state.renewal_due_at || Date.parse(state.renewal_due_at) <= now;
    const requested = state.sync_requested_at && Date.parse(state.sync_requested_at) > Date.parse(state.last_attempt_at || 0);
    const reconciliationDue = !state.next_reconcile_at || Date.parse(state.next_reconcile_at) <= now;
    const pollDue = !state.next_poll_at || Date.parse(state.next_poll_at) <= now;
    if (!(needsRenewal || requested || reconciliationDue || (!eventDriven && pollDue))) return;
    if (state.retry_after && Date.parse(state.retry_after) > now) return;

    const lease = await this.state.claim(state, 120_000);
    if (!lease) return;
    const started = Date.now();
    try {
      let cursor = state.provider_cursor?.historyId || state.provider_cursor?.deltaLink || state.provider_cursor?.uid;
      let renewalPatch: Record<string, unknown> = {};
      if (provider === 'GMAIL' && needsRenewal) {
        const watch = await this.gmail.watch(account);
        // Watch establishes the initial history cursor; no historical mailbox
        // scan is performed at subscription time.
        cursor = cursor || watch.historyId;
        renewalPatch = {
          subscription_expires_at: watch.expiresAt,
          renewal_due_at: new Date(Date.parse(watch.expiresAt) - this.number('EMAIL_SYNC_WEBHOOK_RENEWAL_BUFFER_MS', 86_400_000)).toISOString(),
        };
      }

      const shouldSync = requested || reconciliationDue || (!eventDriven && pollDue);
      const result = shouldSync ? await this.email.syncMailboxAccount(account, cursor) : { imported: 0, found: 0, nextCursor: cursor, hasMore: false };
      const interval = eventDriven
        ? this.number('EMAIL_SYNC_RECONCILIATION_INTERVAL_MS', 1_800_000)
        : this.nextPollInterval(state.consecutive_empty_polls, Number(result.found || 0));
      await this.state.complete(state.id, lease, {
        ...renewalPatch,
        // Do not advance a cursor until its entire provider page has been
        // consumed. A later recovery run replays duplicate IDs safely.
        provider_cursor: provider === 'GMAIL' ? { historyId: result.hasMore ? cursor : result.nextCursor } : state.provider_cursor,
        sync_requested_at: null,
        last_success_at: new Date().toISOString(),
        next_poll_at: new Date(Date.now() + interval).toISOString(),
        next_reconcile_at: new Date(Date.now() + this.number('EMAIL_SYNC_RECONCILIATION_INTERVAL_MS', 1_800_000)).toISOString(),
        consecutive_empty_polls: result.found ? 0 : Number(state.consecutive_empty_polls || 0) + 1,
        consecutive_failures: 0,
        retry_after: null,
        last_error_code: null,
      });
      await this.state.recordEvent({ mail_account_id: account.id, provider, event_type: requested ? 'WEBHOOK_SYNC' : reconciliationDue ? 'RECONCILIATION' : 'POLL', outcome: 'COMPLETED', messages_found: result.found || 0, messages_imported: result.imported || 0, provider_calls: shouldSync ? 1 : 1, latency_ms: Date.now() - started });
    } catch (error: any) {
      const failures = Number(state.consecutive_failures || 0) + 1;
      const retryMs = Math.min(3_600_000, 30_000 * (2 ** Math.min(failures, this.number('EMAIL_SYNC_RETRY_MAX_ATTEMPTS', 6))));
      await this.state.complete(state.id, lease, { consecutive_failures: failures, retry_after: new Date(Date.now() + retryMs).toISOString(), last_error_code: String(error?.code || 'SYNC_FAILED').slice(0, 80) });
      await this.state.recordEvent({ mail_account_id: account.id, provider, event_type: 'SYNC', outcome: 'FAILED', error_code: String(error?.code || 'SYNC_FAILED').slice(0, 80), latency_ms: Date.now() - started });
      this.logger.warn(`Mailbox sync deferred (provider=${provider}, code=${String(error?.code || 'SYNC_FAILED')}).`);
    }
  }

  private nextPollInterval(emptyPolls: number, found: number) {
    const base = this.number('EMAIL_SYNC_IMAP_POLL_INTERVAL_MS', 300_000);
    if (found) return base;
    return Math.min(this.number('EMAIL_SYNC_IDLE_BACKOFF_MAX_MS', 1_200_000), base * (2 ** Math.min(emptyPolls, 3)));
  }

  private number(key: string, fallback: number) {
    const value = Number(this.config.get<string>(key));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }
}
