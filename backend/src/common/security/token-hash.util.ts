import { createHash } from 'crypto';

/**
 * Generate SHA-256 hash for refresh tokens.
 *
 * The original refresh token is never stored in the database.
 * Only the hexadecimal hash is persisted.
 */
export function hashRefreshToken(
  refreshToken: string,
): string {
  if (!refreshToken?.trim()) {
    throw new Error(
      'Refresh token cannot be empty.',
    );
  }

  return createHash('sha256')
    .update(refreshToken)
    .digest('hex');
}