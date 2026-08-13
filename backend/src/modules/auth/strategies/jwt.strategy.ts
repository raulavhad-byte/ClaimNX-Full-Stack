import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { DatabaseService } from '../../../database/database.service';
import { UserSessionsRepository } from '../user-sessions.repository';

interface JwtPayload {
  sub: string;

  authUserId: string;

  sessionId: string;

  email: string;

  role: string;

  hospitalId: string | null;

  iat: number;

  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(
  Strategy,
  'jwt',
) {
  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly userSessionsRepository: UserSessionsRepository,
  ) {
    super({
      jwtFromRequest:
        ExtractJwt.fromAuthHeaderAsBearerToken(),

      ignoreExpiration: false,

      secretOrKey:
        configService.getOrThrow<string>(
          'JWT_SECRET',
        ),
    });
  }

  async validate(
    payload: JwtPayload,
  ): Promise<any> {
    /**
     * -----------------------------------------
     * Validate Current Session
     * -----------------------------------------
     */
    const session =
      await this.userSessionsRepository.findById(
        payload.sessionId,
      );

    if (!session) {
      throw new UnauthorizedException(
        'Session not found.',
      );
    }

    if (session.is_revoked) {
      throw new UnauthorizedException(
        'Session has been revoked.',
      );
    }

    const now = new Date();

    /**
     * -----------------------------------------
     * Validate Idle Session Timeout
     * -----------------------------------------
     */
    const idleTimeoutMinutes = Number(
      this.configService.get(
        'SESSION_IDLE_TIMEOUT_MINUTES',
        30,
      ),
    );

    const lastActivity = new Date(
      session.last_activity_at ??
        session.created_at,
    );

    const idleTime =
      now.getTime() -
      lastActivity.getTime();

    const idleTimeoutMs =
      idleTimeoutMinutes * 60 * 1000;

    if (idleTime > idleTimeoutMs) {
      await this.userSessionsRepository.revokeSession(
        session.id,
      );

      throw new UnauthorizedException(
        'Session expired due to inactivity.',
      );
    }

    /**
     * -----------------------------------------
     * Validate Absolute Session Lifetime
     * -----------------------------------------
     */
    const maxLifetimeHours = Number(
      this.configService.get(
        'SESSION_MAX_LIFETIME_HOURS',
        12,
      ),
    );

    const sessionStart = new Date(
      session.created_at,
    );

    const sessionAge =
      now.getTime() -
      sessionStart.getTime();

    const maxLifetimeMs =
      maxLifetimeHours *
      60 *
      60 *
      1000;

    if (sessionAge > maxLifetimeMs) {
      await this.userSessionsRepository.revokeSession(
        session.id,
      );

      throw new UnauthorizedException(
        'Session has expired.',
      );
    }

    /**
     * -----------------------------------------
     * Load User
     * -----------------------------------------
     */
    const { data: user, error } =
      await this.databaseService
        .getClient()
        .from('users')
        .select(`
          *,
          roles (
            id,
            name,
            permissions,
            status
          )
        `)
        .eq(
          'auth_user_id',
          payload.authUserId,
        )
        .eq('is_deleted', false)
        .maybeSingle();

    if (error) {
      throw new UnauthorizedException(
        error.message,
      );
    }

    if (!user) {
      throw new UnauthorizedException(
        'User not found.',
      );
    }

    if (user.status !== 'Active') {
      throw new UnauthorizedException(
        'User account is inactive.',
      );
    }

    /**
     * -----------------------------------------
     * Update Session Activity
     * -----------------------------------------
     */
    await this.userSessionsRepository.updateLastActivity(
      payload.sessionId,
    );

    /**
     * -----------------------------------------
     * Attach User To Request
     * -----------------------------------------
     */
    return {
      id: user.id,

      authUserId:
        user.auth_user_id,

      sessionId: payload.sessionId,

      email: user.email,

      displayName:
        user.display_name,

      role:
        user.roles?.name ??
        user.role,

      roleId:
        user.roles?.id ??
        user.role_id,

      permissions:
        user.roles?.permissions ??
        [],

      hospitalId:
        user.hospital_id,

      // Scope data is loaded from the server on every authenticated request.
      // Controllers must never trust browser localStorage for tenant or
      // geographical access decisions.
      entityType: user.entity_type,
      profileData: user.profile_data ?? {},

      status: user.status,
    };
  }
}
