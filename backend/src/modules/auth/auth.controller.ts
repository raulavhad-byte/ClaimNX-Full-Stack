import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AuthService } from './auth.service';

import type { Request } from 'express';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { CurrentUser } from './decorators/current-user.decorator';

import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';

import { Permissions } from './decorators/permissions.decorator';
import { DeviceDetectorService } from './device-detector.service';
import { Permissions as PermissionRegistry } from './permissions/permissions';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly deviceDetectorService: DeviceDetectorService,
  ) {}

  /**
 * Login
 */
@Post('login')
async login(
  @Body() loginDto: LoginDto,
  @Req() req: Request,
) {
  const metadata = {
    ipAddress:
      (req.headers['x-forwarded-for'] as string)
        ?.split(',')[0]
        ?.trim() ||
      req.ip ||
      req.socket.remoteAddress ||
      'Unknown',

    userAgent:
      req.get('user-agent') ?? 'Unknown',

    deviceName:
      this.deviceDetectorService.detect(
        req.get('user-agent') ?? '',
      ),
  };

  console.log(metadata);

  return this.authService.login(
    loginDto,
    metadata,
  );
}

  /**
   * Logout
   */
  @Post('logout')
logout(
  @Body() refreshTokenDto: RefreshTokenDto,
) {
  return this.authService.logout(
    refreshTokenDto,
  );
}

/**
   * Other Sessions Logout
   */

@UseGuards(JwtAuthGuard)
@Post('logout-other-sessions')
async logoutOtherSessions(
  @CurrentUser('id') userId: string,
  @CurrentUser('sessionId') sessionId: string,
) {
  return this.authService.logoutOtherSessions(
    userId,
    sessionId,
  );
}

  /**
   * Refresh Access Token
   */
  @Post('refresh')
  async refresh(
    @Body()
    refreshTokenDto: RefreshTokenDto,
  ) {
    return this.authService.refresh(
      refreshTokenDto,
    );
  }

  /**
   * Current User
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    return this.authService.me(req);
  }

  /**
   * Create User
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('users.create')
  @Post('create-user')
  async createUser(
    @Body()
    createUserDto: CreateUserDto,
  ) {
    return this.authService.createUser(
      createUserDto,
    );
  }

  /**
 * Get Current User Sessions
 */
@UseGuards(JwtAuthGuard)
@Get('sessions')
async getSessions(
  @CurrentUser('id') userId: string,
) {
  return this.authService.getSessions(
    userId,
  );
}

  /**
   * Permission Test
   */
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('claims.create')
  @Get('admin')
  admin() {
    return {
      message:
        'Permission validation successful.',
    };
  }

  /**
 * Revoke Single Session
 */
@UseGuards(JwtAuthGuard)
@Delete('sessions/:id')
async revokeSession(
  @Param('id') sessionId: string,
  @CurrentUser('id') userId: string,
) {
  return this.authService.revokeSession(
    sessionId,
    userId,
  );
}

}
