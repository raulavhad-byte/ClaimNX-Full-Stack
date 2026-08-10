import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(
        PERMISSIONS_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    /**
     * No permissions required.
     */
    if (
      !requiredPermissions ||
      requiredPermissions.length === 0
    ) {
      return true;
    }

    const request =
      context.switchToHttp().getRequest();

    const user = request.user;

    if (!user) {
      throw new ForbiddenException(
        'User not authenticated.',
      );
    }

    const userPermissions =
      user.permissions ?? [];

    /**
     * Super Admin
     */
    if (
      userPermissions.includes('all')
    ) {
      return true;
    }

    /**
     * Check whether the user has
     * every required permission.
     */
    const hasPermission =
      requiredPermissions.every(
        (permission) =>
          userPermissions.includes(
            permission,
          ),
      );

    if (!hasPermission) {
      throw new ForbiddenException(
        'You do not have permission to access this resource.',
      );
    }

    return true;
  }
}