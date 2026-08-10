import { Injectable } from '@nestjs/common';

import { BaseRepository } from '../../shared/repository/base.repository';
import { DatabaseService } from '../../database/database.service';
import { QueryBuilderService } from '../../shared/services/query-builder.service';

import { CreateUserSessionDto } from './dto/create-user-session.dto';

@Injectable()
export class UserSessionsRepository extends BaseRepository {
  constructor(
    databaseService: DatabaseService,
    queryBuilder: QueryBuilderService,
  ) {
    super(databaseService, queryBuilder, {
      table: 'user_sessions',

      searchableColumns: [
        'device_name',
        'ip_address',
        'user_agent',
      ],

      defaultSortBy: 'created_at',

      defaultSortOrder: 'desc',
    });
  }

  /**
   * Create Login Session
   */
  async createSession(dto: CreateUserSessionDto) {
  const { data, error } = await this.databaseService
    .getClient()
    .from('user_sessions')
    .insert(dto)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

  /**
 * Find Session by Refresh Token Hash
 */
async findByRefreshTokenHash(
  refreshTokenHash: string,
) {
  const { data, error } = await this.client
    .from('user_sessions')
    .select('*')
    .eq('refresh_token_hash', refreshTokenHash)
    .eq('is_revoked', false)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

  /**
 * Find Session by ID
 */
async findById(
  sessionId: string,
) {
  const { data, error } = await this.client
    .from('user_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

  /**
 * Count Active Sessions of User
 */
async countActiveSessions(
  userId: string,
): Promise<number> {
  const { count, error } = await this.client
    .from('user_sessions')
    .select('*', {
      count: 'exact',
      head: true,
    })
    .eq('user_id', userId)
    .eq('is_revoked', false);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

/**
 * Find Oldest Active Session
 */
async findOldestActiveSession(
  userId: string,
) {
  const { data, error } = await this.client
    .from('user_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_revoked', false)
    .order('created_at', {
      ascending: true,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

  /**
   * Revoke One Session
   */
  async revokeSession(id: string) {
    const { data, error } = await this.client
      .from('user_sessions')
      .update({
        is_revoked: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Revoke All Sessions of User
   */
  async revokeAllSessions(
    userId: string,
  ) {
    const { error } = await this.client
      .from('user_sessions')
      .update({
        is_revoked: true,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      throw error;
    }
  }

  /**
 * Get All Sessions of User
 */
async findUserSessions(
  userId: string,
) {
  const { data, error } = await this.client
    .from('user_sessions')
    .select(`
      id,
      device_name,
      ip_address,
      user_agent,
      created_at,
      expires_at,
      is_revoked
    `)
    .eq('user_id', userId)
    .order('created_at', {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Revoke One User Session
 */
async revokeUserSession(
  sessionId: string,
  userId: string,
) {
  const { data, error } = await this.client
    .from('user_sessions')
    .update({
      is_revoked: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .eq('user_id', userId)
    .select()
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Revoke Other User Sessions
 */
async revokeOtherSessions(
  userId: string,
  currentSessionId: string,
) {
  const { error } = await this.databaseService
    .getClient()
    .from('user_sessions')
    .update({
      is_revoked: true,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .neq('id', currentSessionId)
    .eq('is_revoked', false);

  if (error) {
    throw error;
  }
}

/**
 * Update Last Activity
 */
async updateLastActivity(
  sessionId: string,
): Promise<void> {
  await this.databaseService
    .getClient()
    .from('user_sessions')
    .update({
      last_activity_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .eq('is_revoked', false);
}

/**
 * Rotate Refresh Token Hash
 */
async rotateRefreshTokenHash(
  sessionId: string,
  refreshTokenHash: string,
  expiresAt: string,
) {
  const { data, error } = await this.client
    .from('user_sessions')
    .update({
      refresh_token_hash: refreshTokenHash,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .eq('is_revoked', false)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

  /**
   * Delete Expired Sessions
   */
  async deleteExpiredSessions() {
    const { error } = await this.client
      .from('user_sessions')
      .delete()
      .lt(
        'expires_at',
        new Date().toISOString(),
      );

    if (error) {
      throw error;
    }
  }
}