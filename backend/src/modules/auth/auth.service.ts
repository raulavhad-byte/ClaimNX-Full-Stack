import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { DatabaseService } from '../../database/database.service';

import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RefreshResponseDto } from './dto/refresh-response.dto';
import { hashRefreshToken } from '../../common/security/token-hash.util';
import { CreateUserDto } from './dto/create-user.dto';
import { SupabaseAuthService } from './supabase-auth.service';
import { UserSessionsRepository } from './user-sessions.repository';
import { LogoutResponseDto } from './dto/logout-response.dto';
import { LoginMetadataDto } from './dto/login-metadata.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly supabaseAuthService: SupabaseAuthService,
    private readonly userSessionsRepository: UserSessionsRepository,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Build ClaimNX JWT Payload
   */
  private buildJwtPayload(user: any) {
    return {
      sub: user.id,
      authUserId: user.auth_user_id,
      email: user.email,
      role: user.role,
      hospitalId: user.hospital_id,
    };
  }

  /**
   * Login User
   */
  async login(
    loginDto: LoginDto,
    metadata: LoginMetadataDto,
  ): Promise<LoginResponseDto & { refresh_token: string }> {
    const { email, password } = loginDto;

    /**
     * Step 1
     * Authenticate using Supabase
     */
    const {
      data: authData,
      error: authError,
    } =
      await this.supabaseAuthService.signInWithPassword(
        email,
        password,
      );

    if (authError || !authData.user) {
      throw new UnauthorizedException(
        'Invalid email or password.',
      );
    }

    /**
     * Step 2
     * Fetch Application User
     */
    const { data: user, error: userError } =
      await this.databaseService
        .getClient()
        .from('users')
        .select('*')
        .eq('auth_user_id', authData.user.id)
        .single();

    if (userError || !user) {
      throw new UnauthorizedException(
        'User record not found.',
      );
    }

    /**
     * Step 3
     * Validate User
     */
    if (user.status !== 'Active') {
      throw new UnauthorizedException(
        'User account is inactive.',
      );
    }

    if (user.is_deleted) {
      throw new UnauthorizedException(
        'User account has been deleted.',
      );
    }

    /**
     * Step 4
     * Generate Refresh Token
     */
    const refreshToken =
      await this.jwtService.signAsync(
        
        {
          sub: user.id,
          type: 'refresh',
        },
        {
          expiresIn: '30d',
        },
      );
      const refreshTokenHash =
  hashRefreshToken(refreshToken);

    /**
     * Step 5
     * Store Login Session
     */
    const session =
      await this.userSessionsRepository.createSession({
  user_id: user.id,
  refresh_token_hash: refreshTokenHash,
  device_name: metadata.deviceName,
  ip_address: metadata.ipAddress,
  user_agent: metadata.userAgent,
  expires_at: new Date(
    Date.now() +
      30 * 24 * 60 * 60 * 1000,
  ).toISOString(),
  is_revoked: false,
});

    /**
 * Step 6
 * Generate Access Token
 */
const payload = {
  ...this.buildJwtPayload(user),
  sessionId: session.id,
};

const accessToken =
  await this.jwtService.signAsync(payload);

  
  /**
 * Step 6.5
 * Audit Successful Login
 */
await this.auditService.log({
  hospital_id: user.hospital_id,
  user_id: user.id,

  module: 'Authentication',

  action: 'LOGIN',

  entity: 'User',

  entity_id: user.id,

  new_values: {
    session_id: session.id,
    device_name: metadata.deviceName,
  },

  ip_address: metadata.ipAddress,

  user_agent: metadata.userAgent,
});

    /**
     * Step 7
     * Return Login Response
     */
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: '24h',

      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        role: user.role,
      },
    };
  }

    /**
   * Refresh Access Token
   */
  async refresh(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<
    RefreshResponseDto & { refresh_token: string }
  > {
    /**
     * Step 1
     * Read Refresh Token
     */
    const { refresh_token } = refreshTokenDto;

    /**
     * Step 2
     * Find Active Session
     */
    const refreshTokenHash =
  hashRefreshToken(refresh_token);

    const session =
  await this.userSessionsRepository.findByRefreshTokenHash(
    refreshTokenHash,
  );

    if (!session) {
      throw new UnauthorizedException(
        'Invalid refresh token.',
      );
    }

    /**
     * Step 3
     * Validate Session
     */
    if (session.is_revoked) {
      throw new UnauthorizedException(
        'Refresh token has been revoked.',
      );
    }

    if (
      new Date(session.expires_at) <
      new Date()
    ) {
      throw new UnauthorizedException(
        'Refresh token has expired.',
      );
    }

    /**
     * Step 4
     * Load User
     */
    const { data: user, error } =
      await this.databaseService
        .getClient()
        .from('users')
        .select('*')
        .eq('id', session.user_id)
        .single();

    if (error || !user) {
      throw new UnauthorizedException(
        'User not found.',
      );
    }

    /**
     * Step 5
     * Validate User
     */
    if (user.status !== 'Active') {
      throw new UnauthorizedException(
        'User account is inactive.',
      );
    }

    if (user.is_deleted) {
      throw new UnauthorizedException(
        'User account has been deleted.',
      );
    }

    /**
     * Step 6
     * Generate NEW Refresh Token
     */
    const newRefreshToken =
      await this.jwtService.signAsync(
        {
          sub: user.id,
          type: 'refresh',
        },
        {
          expiresIn: '30d',
        },
      );

      const newRefreshTokenHash =
  hashRefreshToken(newRefreshToken);

    /**
     * Step 7
     * Rotate Refresh Token
     */
    const expiresAt = new Date(
      Date.now() +
        30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    /**
 * Temporary migration.
 * Update both plaintext token and hash.
 * The plaintext column will be removed after migration.
 */
await this.auditService.log({
  hospital_id: user.hospital_id,
  user_id: user.id,

  module: 'Authentication',

  action: 'REFRESH_TOKEN',

  entity: 'User',

  entity_id: user.id,

  new_values: {
    session_id: session.id,
    rotated: true,
  },
});

    /**
     * Step 8
     * Generate NEW Access Token
     */
    const payload = {
      ...this.buildJwtPayload(user),
      sessionId: session.id,
    };

    const accessToken =
      await this.jwtService.signAsync(
        payload,
      );

    /**
     * Step 9
     * Return Rotated Tokens
     */
    return {
      access_token: accessToken,
      refresh_token: newRefreshToken,
      token_type: 'Bearer',
      expires_in: '24h',
    };
  }

  /**
   * Get Current User Sessions
   */
  async getSessions(userId: string) {
  const sessions =
    await this.userSessionsRepository.findUserSessions(
      userId,
    );

  return sessions.map((session) => ({
    id: session.id,
    device_name: session.device_name,
    ip_address: session.ip_address,
    user_agent: session.user_agent,
    created_at: session.created_at,
    expires_at: session.expires_at,
    is_revoked: session.is_revoked,
  }));
}

  /**
   * Creates the Supabase Auth identity and matching ClaimNX user record.
   *
   * The Supabase service-role client is deliberately used only on the server.
   * If the application-record insert fails, the Auth identity is deleted so a
   * partial account cannot be left behind.
   */
  async createUser(createUserDto: CreateUserDto) {
    const client = this.databaseService.getClient();
    const {
      email,
      password,
      displayName,
      role,
      roleId: requestedRoleId,
      hospitalId,
      mobileNo,
      entityType,
      profileData,
    } =
      createUserDto;

    const roleId = requestedRoleId ?? await this.resolveRoleId(role);

    const { data: authData, error: authError } =
      await client.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: displayName },
      });

    if (authError || !authData.user) {
      throw new BadRequestException(
        authError?.message ?? 'Unable to create the user authentication account.',
      );
    }

    const { data: user, error: userError } = await client
      .from('users')
      .insert({
        auth_user_id: authData.user.id,
        email,
        display_name: displayName,
        role: role ?? 'Hospital',
        role_id: roleId ?? null,
        hospital_id: hospitalId ?? null,
        mobile_no: mobileNo ?? null,
        entity_type: entityType ?? 'User',
        profile_data: profileData ?? {},
        status: 'Active',
        is_deleted: false,
      })
      .select()
      .single();

    if (userError || !user) {
      const { error: cleanupError } = await client.auth.admin.deleteUser(
        authData.user.id,
      );
      if (cleanupError) {
        // The primary database error is still the actionable failure. The
        // orphaned Auth user must be removed manually if this cleanup fails.
        console.error('Unable to remove orphaned Supabase Auth user', cleanupError);
      }
      throw new BadRequestException(
        userError?.message ?? 'Unable to create the ClaimNX user record.',
      );
    }

    return user;
  }

  private async resolveRoleId(roleName?: string): Promise<string | null> {
    if (!roleName?.trim()) return null;

    const { data, error } = await this.databaseService
      .getClient()
      .from('roles')
      .select('id')
      .eq('name', roleName.trim())
      .eq('status', 'Active')
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }
    if (!data?.id) {
      throw new BadRequestException(`Active role "${roleName}" was not found.`);
    }

    return String(data.id);
  }

/**
 * Current Logged-in User
 */
async me(req: any) {
  return req.user;
}

/**
 * Logout Current Session
 */
async logout(
  refreshTokenDto: RefreshTokenDto,
): Promise<LogoutResponseDto> {
  const { refresh_token } = refreshTokenDto;

  const refreshTokenHash =
  hashRefreshToken(refresh_token);

  const session =
  await this.userSessionsRepository.findByRefreshTokenHash(
    refreshTokenHash,
  );

  if (!session) {
    throw new UnauthorizedException(
      'Invalid refresh token.',
    );
  }

  if (session.is_revoked) {
    return {
      message: 'Already logged out.',
    };
  }

  await this.userSessionsRepository.revokeSession(
    session.id,
  );

  await this.auditService.log({
  hospital_id: session.hospital_id,

  user_id: session.user_id,

  module: 'Authentication',

  action: 'LOGOUT',

  entity: 'User',

  entity_id: session.user_id,

  new_values: {
    session_id: session.id,
    revoked: true,
  },

  ip_address: session.ip_address,

  user_agent: session.user_agent,
});

  await this.auditService.log({
  hospital_id: session.hospital_id,

  user_id: session.user_id,

  module: 'Authentication',

  action: 'LOGOUT',

  entity: 'User',

  entity_id: session.user_id,

  new_values: {
    session_id: session.id,
    revoked: true,
  },
});

  return {
    message: 'Logged out successfully.',
  };
}

/**
 * Revoke Single Session
 */
async revokeSession(
  sessionId: string,
  currentUserId: string,
): Promise<LogoutResponseDto> {
  const session =
    await this.userSessionsRepository.revokeUserSession(
      sessionId,
      currentUserId,
    );

  if (!session) {
    throw new UnauthorizedException(
      'Session not found.',
    );
  }

  return {
    message: 'Session revoked successfully.',
  };
}

/**
 * Logout All Other Sessions
 */
async logoutOtherSessions(
  userId: string,
  currentSessionId: string,
) {
  await this.userSessionsRepository.revokeOtherSessions(
    userId,
    currentSessionId,
  );

  await this.auditService.log({
    user_id: userId,

    module: 'Authentication',

    action: 'LOGOUT_OTHER_SESSIONS',

    entity: 'User',

    entity_id: userId,

    new_values: {
      current_session: currentSessionId,
      revoked_other_sessions: true,
    },
  });

  return {
    message:
      'Logged out from all other devices successfully.',
  };
}
}
