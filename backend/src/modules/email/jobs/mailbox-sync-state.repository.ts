import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { DatabaseService } from '../../../database/database.service';

@Injectable()
export class MailboxSyncStateRepository {
  constructor(private readonly database: DatabaseService) {}
  private get db() { return this.database.getClient(); }

  async getOrCreate(mailAccountId: string): Promise<any> {
    const { data, error } = await this.db
      .from('mailbox_sync_state')
      .upsert({ mail_account_id: mailAccountId }, { onConflict: 'mail_account_id', ignoreDuplicates: true })
      .select()
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
    const { data: existing, error: existingError } = await this.db
      .from('mailbox_sync_state').select('*').eq('mail_account_id', mailAccountId).single();
    if (existingError) throw existingError;
    return existing;
  }

  async requestSync(mailAccountId: string) {
    const state = await this.getOrCreate(mailAccountId);
    const { error } = await this.db.from('mailbox_sync_state')
      .update({ sync_requested_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', state.id);
    if (error) throw error;
  }

  async claim(state: any, leaseMs: number): Promise<string | null> {
    const token = randomUUID();
    const now = new Date();
    const { data, error } = await this.db.from('mailbox_sync_state')
      .update({ lease_token: token, lease_expires_at: new Date(now.getTime() + leaseMs).toISOString(), last_attempt_at: now.toISOString(), updated_at: now.toISOString() })
      .eq('id', state.id)
      .lte('lease_expires_at', now.toISOString())
      .select('id')
      .maybeSingle();
    if (error) throw error;
    return data ? token : null;
  }

  async complete(stateId: string, leaseToken: string, patch: Record<string, unknown>) {
    const { error } = await this.db.from('mailbox_sync_state')
      .update({ ...patch, lease_token: null, lease_expires_at: new Date(0).toISOString(), updated_at: new Date().toISOString() })
      .eq('id', stateId).eq('lease_token', leaseToken);
    if (error) throw error;
  }

  async recordEvent(values: Record<string, unknown>) {
    const { error } = await this.db.from('mailbox_sync_events').insert(values);
    if (error) throw error;
  }
}
