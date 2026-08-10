import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<string[]>(
        'roles',
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    /**
     * No roles required.
     */
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    const user = request.user;
    
    console.log('Required Roles:', requiredRoles);
    console.log('Authenticated User:', user);
    console.log('User Role:', user.role);

    if (!user) {
      throw new ForbiddenException(
        'User not authenticated.',
      );
    }

    /**
     * Compare user role against required roles.
     */
    const hasRole = requiredRoles.includes(
      user.role,
    );

    if (!hasRole) {
      throw new ForbiddenException(
        'You do not have permission to access this resource.',
      );
    }

    return true;
  }
}