import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseAuthService {
  private readonly supabase: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    this.supabase = createClient(
      this.configService.getOrThrow<string>('SUPABASE_URL'),
      this.configService.getOrThrow<string>('SUPABASE_ANON_KEY'),
    );
  }

  /**
   * Returns the Supabase Auth client.
   */
  getClient(): SupabaseClient {
    return this.supabase;
  }

  /**
   * Authenticate user using Supabase Auth.
   */
  async signInWithPassword(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({
      email,
      password,
    });
  }

  /**
   * Get authenticated user using access token.
   */
  async getUser(accessToken: string) {
    return this.supabase.auth.getUser(accessToken);
  }

  /**
   * Sign out user.
   */
  async signOut(accessToken: string) {
    return this.supabase.auth.signOut({
      scope: 'global',
    });
  }
}