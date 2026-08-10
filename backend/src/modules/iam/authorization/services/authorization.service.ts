import { Injectable } from '@nestjs/common';

import { PermissionContext } from '../interfaces';

@Injectable()
export class AuthorizationService {
  /**
   * Determines whether the current request
   * is authorized.
   *
   * NOTE:
   * This is a placeholder implementation.
   */
  authorize(context: PermissionContext): boolean {
    void context;

    return true;
  }
}