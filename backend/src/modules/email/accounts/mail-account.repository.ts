import { Injectable, NotFoundException } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';

@Injectable()
export class MailAccountRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  private get supabase() {
    return this.databaseService.getClient();
  }

  async findByHospital(hospitalId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('mail_accounts')
      .select('*')
      .eq('hospital_id', hospitalId)
      .eq('is_deleted', false)
      .eq('is_internal', false)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async findActiveByHospitals(hospitalIds: string[]): Promise<any[]> {
    if (!hospitalIds.length) return [];
    const { data, error } = await this.supabase
      .from('mail_accounts')
      .select('*, hospitals(hospital_name, display_name)')
      .in('hospital_id', hospitalIds)
      .eq('is_deleted', false)
      .eq('is_internal', false)
      .eq('status', 'ACTIVE')
      .order('email_address', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async findAllActive(): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('mail_accounts')
      .select('*, hospitals(hospital_name, display_name)')
      .eq('is_deleted', false)
      .eq('is_internal', false)
      .eq('status', 'ACTIVE')
      .order('email_address', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async findAllSyncable(): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('mail_accounts')
      .select('*')
      .eq('is_deleted', false)
      .eq('status', 'ACTIVE')
      .eq('inbound_enabled', true)
      .order('updated_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async findActiveByProviderEmail(provider: string, emailAddress: string): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('mail_accounts')
      .select('*')
      .eq('is_deleted', false)
      .eq('status', 'ACTIVE')
      .eq('provider', provider)
      .ilike('email_address', emailAddress.trim())
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async findActiveInternal(): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('mail_accounts')
      .select('*')
      .eq('is_deleted', false)
      .eq('is_internal', true)
      .eq('status', 'ACTIVE')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async findById(id: string): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('mail_accounts')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async findByHospitalProviderEmail(hospitalId: string, provider: string, emailAddress: string): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('mail_accounts')
      .select('*')
      .eq('hospital_id', hospitalId)
      .eq('provider', provider)
      .ilike('email_address', emailAddress)
      .eq('is_deleted', false)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async requireById(id: string): Promise<any> {
    const account = await this.findById(id);
    if (!account) throw new NotFoundException('Mail account not found.');
    return account;
  }

  async create(data: Record<string, unknown>): Promise<any> {
    const { data: created, error } = await this.supabase
      .from('mail_accounts')
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return created;
  }

  async update(id: string, data: Record<string, unknown>): Promise<any> {
    const { data: updated, error } = await this.supabase
      .from('mail_accounts')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('is_deleted', false)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!updated) throw new NotFoundException('Mail account not found.');
    return updated;
  }
}
