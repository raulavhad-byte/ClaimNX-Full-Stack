import { ClaimNXApiClient } from './claimnx-api-client';

export interface ClaimNXSession {
  readonly accessToken: string;
  readonly refreshToken?: string;
  readonly user?: unknown;
}

const SESSION_STORAGE_KEY = 'claimnx.session.v1';

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

/**
 * Browser-only session holder. It stores no password and clears when the
 * browser session ends. Production can replace this with an httpOnly-cookie
 * session without changing feature API calls.
 */
class ClaimNXSessionService {
  getSession(): ClaimNXSession | null {
    try {
      const serialized = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!serialized) return null;
      const candidate: unknown = JSON.parse(serialized);
      if (!candidate || typeof candidate !== 'object') return null;
      const record = candidate as Record<string, unknown>;
      const accessToken = readString(record.accessToken);
      return accessToken
        ? { accessToken, refreshToken: readString(record.refreshToken), user: record.user }
        : null;
    } catch {
      this.clear();
      return null;
    }
  }

  getAccessToken(): string | null {
    return this.getSession()?.accessToken ?? null;
  }

  save(session: ClaimNXSession): void {
    // Remove a token created by the pre-session implementation so API calls
    // cannot accidentally use a revoked credential after a new login.
    localStorage.removeItem('claimnx_access_token');
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }

  clear(): void {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem('claimnx_access_token');
  }

  async login(email: string, password: string): Promise<ClaimNXSession> {
    const client = new ClaimNXApiClient({ getAccessToken: () => null });
    const response = await client.request<Record<string, unknown>>('POST', '/auth/login', {
      body: { email, password },
    });

    const accessToken =
      readString(response.accessToken) ??
      readString(response.access_token) ??
      readString(response.token);

    if (!accessToken) {
      throw new Error('ClaimNX login response did not contain an access token.');
    }

    const session: ClaimNXSession = {
      accessToken,
      refreshToken: readString(response.refreshToken) ?? readString(response.refresh_token),
      user: response.user,
    };
    this.save(session);
    return session;
  }
}

export const claimnxSessionService = new ClaimNXSessionService();
