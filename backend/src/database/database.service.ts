import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class DatabaseService {
  private readonly supabase: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
    );
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }
}