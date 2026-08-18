export type ClaimNXHttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface ClaimNXApiRequestOptions {
  readonly body?: unknown;
  readonly headers?: Readonly<Record<string, string>>;
  readonly signal?: AbortSignal;
}

export interface ClaimNXApiClientOptions {
  readonly baseUrl?: string;
  readonly getAccessToken?: () => string | null;
}

export class ClaimNXApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ClaimNXApiError';
  }
}

/**
 * Raised only when the browser cannot establish a connection to ClaimNX.
 * It deliberately contains no transport internals or endpoint details.
 */
export class ClaimNXNetworkError extends Error {
  constructor() {
    super('Network connection unavailable. Check your internet connection and try again.');
    this.name = 'ClaimNXNetworkError';
  }
}

type JsonObject = Record<string, unknown>;

const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const configuredBaseUrl = (): string => {
  const viteBaseUrl = (import.meta as ImportMeta & {
    readonly env?: { readonly VITE_CLAIMNX_API_BASE_URL?: string };
  }).env?.VITE_CLAIMNX_API_BASE_URL;

  return (viteBaseUrl || 'http://localhost:3000').replace(/\/+$/, '');
};

const readErrorMessage = (payload: unknown, fallback: string): string => {
  if (!isJsonObject(payload)) return fallback;
  if (typeof payload.message === 'string') return payload.message;
  if (Array.isArray(payload.message)) return payload.message.join(', ');
  if (typeof payload.error === 'string') return payload.error;
  return fallback;
};

/**
 * The only supported browser-to-backend transport for ClaimNX business data.
 * It centralises authorization, JSON parsing, and API error handling.
 */
export class ClaimNXApiClient {
  private readonly baseUrl: string;
  private readonly getAccessToken: () => string | null;

  constructor(options: ClaimNXApiClientOptions = {}) {
    this.baseUrl = (options.baseUrl || configuredBaseUrl()).replace(/\/+$/, '');
    this.getAccessToken = options.getAccessToken || (() => null);
  }

  async request<T>(
    method: ClaimNXHttpMethod,
    path: string,
    options: ClaimNXApiRequestOptions = {},
  ): Promise<T> {
    const token = this.getAccessToken();
    const hasBody = options.body !== undefined;
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/${path.replace(/^\/+/, '')}`, {
        method,
        signal: options.signal,
        headers: {
          Accept: 'application/json',
          ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        },
        body: hasBody ? JSON.stringify(options.body) : undefined,
      });
    } catch (error) {
      // An explicit caller cancellation should remain distinguishable from a
      // connectivity fault. All other browser fetch failures are safely shown
      // as a connection error rather than an authentication error.
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new ClaimNXNetworkError();
    }

    const raw = await response.text();
    let payload: unknown = undefined;
    if (raw) {
      try {
        payload = JSON.parse(raw) as unknown;
      } catch {
        payload = raw;
      }
    }

    if (!response.ok) {
      throw new ClaimNXApiError(
        readErrorMessage(payload, `ClaimNX API request failed with HTTP ${response.status}.`),
        response.status,
        payload,
      );
    }

    // Support both direct REST responses and the standard { data: ... } envelope.
    if (isJsonObject(payload) && 'data' in payload) return payload.data as T;
    return payload as T;
  }
}
