import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

@Injectable()
export class EmailCorrespondenceRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  private get supabase() {
    return this.databaseService.getClient();
  }

  async findThreads(hospitalId: string, accountId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('email_threads')
      .select('*')
      .eq('hospital_id', hospitalId)
      .eq('mail_account_id', accountId);
    if (error) throw error;
    return data ?? [];
  }

  async createInboundMessage(data: Record<string, unknown>): Promise<{ message: any; duplicate: boolean }> {
    const { data: message, error } = await this.supabase
      .from('email_messages')
      .insert(data)
      .select()
      .maybeSingle();
    if (!error && message) return { message, duplicate: false };

    // Provider webhook retries are expected. The unique account/message-id
    // constraint is the authoritative idempotency barrier.
    if (error?.code === '23505') {
      const { data: existing, error: existingError } = await this.supabase
        .from('email_messages')
        .select('*')
        .eq('mail_account_id', data.mail_account_id)
        .eq('provider_message_id', data.provider_message_id)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existing) return { message: existing, duplicate: true };
    }
    throw error;
  }

  async createOutboundMessage(data: Record<string, unknown>) {
    const { data: message, error } = await this.supabase
      .from('email_messages')
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return message;
  }

  async updateMessage(id: string, data: Record<string, unknown>) {
    const { data: updated, error } = await this.supabase
      .from('email_messages')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return updated;
  }

  async addAttachments(attachments: Record<string, unknown>[]) {
    if (!attachments.length) return [];
    const { data, error } = await this.supabase
      .from('email_attachments')
      .insert(attachments)
      .select();
    if (error) throw error;
    return data ?? [];
  }

  async findAttachment(attachmentId: string) {
    const { data, error } = await this.supabase
      .from('email_attachments')
      .select('*, email_messages!inner(mail_account_id)')
      .eq('id', attachmentId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async createReviewTask(data: Record<string, unknown>) {
    const { data: created, error } = await this.supabase
      .from('email_review_tasks')
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return created;
  }

  async addProcessingAttempt(data: Record<string, unknown>) {
    const { error } = await this.supabase.from('email_processing_attempts').insert(data);
    if (error) throw error;
  }
}
