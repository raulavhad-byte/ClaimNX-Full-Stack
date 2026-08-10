import {
  ClaimNXApiClient,
  type ClaimNXApiRequestOptions,
} from './claimnx-api-client';
import { claimnxSessionService } from './claimnx-session-service';

/**
 * Typed entry point for ClaimNX REST calls. Keep endpoint paths here rather
 * than embedding fetch calls in React components.
 */
class ClaimNXApi {
  private readonly client = new ClaimNXApiClient({
    getAccessToken: () => claimnxSessionService.getAccessToken(),
  });

  login(email: string, password: string) {
    return claimnxSessionService.login(email, password);
  }

  logout(): void {
    claimnxSessionService.clear();
  }

  get<T>(path: string, options?: Omit<ClaimNXApiRequestOptions, 'body'>): Promise<T> {
    return this.client.request<T>('GET', path, options);
  }

  post<T>(path: string, body?: unknown, options?: Omit<ClaimNXApiRequestOptions, 'body'>): Promise<T> {
    return this.client.request<T>('POST', path, { ...options, body });
  }

  patch<T>(path: string, body?: unknown, options?: Omit<ClaimNXApiRequestOptions, 'body'>): Promise<T> {
    return this.client.request<T>('PATCH', path, { ...options, body });
  }

  delete<T>(path: string, options?: Omit<ClaimNXApiRequestOptions, 'body'>): Promise<T> {
    return this.client.request<T>('DELETE', path, options);
  }

  organizationPath(organizationId: string, resource: string): string {
    return `/v1/organizations/${encodeURIComponent(organizationId)}/${resource.replace(/^\/+/, '')}`;
  }

  hospitalPath(organizationId: string, hospitalId: string, resource: string): string {
    return `${this.organizationPath(organizationId, `hospitals/${encodeURIComponent(hospitalId)}`)}/${resource.replace(/^\/+/, '')}`;
  }
}

export const claimnxApi = new ClaimNXApi();
