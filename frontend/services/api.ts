/**
 * Compatibility adapter for legacy portal screens.
 *
 * New ClaimNX screens should use the typed API client. This file keeps the
 * existing frontend bootable while each legacy screen is migrated safely.
 */

type LegacyApiMethod = (...args: any[]) => Promise<any>;
type LegacyApi = Record<string, LegacyApiMethod>;

const apiBaseUrl = (
  import.meta.env.VITE_CLAIMNX_API_BASE_URL ?? 'http://localhost:3000'
).replace(/\/$/, '');

function getAccessToken(): string | undefined {
  try {
    const legacyToken = window.localStorage.getItem('claimnx_access_token');
    if (legacyToken) return legacyToken;

    const session = sessionStorage.getItem('claimnx.session.v1');
    if (session) {
      const parsed = JSON.parse(session) as { accessToken?: unknown };
      return typeof parsed.accessToken === 'string' ? parsed.accessToken : undefined;
    }
  } catch {
    // Local-only mode is allowed to continue with storage-backed data.
  }
  return undefined;
}

async function request(path: string, init: RequestInit = {}): Promise<any> {
  const headers = new Headers(init.headers);
  const accessToken = getAccessToken();

  // The current local login is intentionally storage-backed and does not
  // issue a JWT. Do not call protected NestJS endpoints in that mode.
  if (!accessToken && path !== '/auth/login') {
    throw new Error('No backend access token; using local development data.');
  }

  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(
    `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`,
    { ...init, headers },
  );
  const responseText = await response.text();

  let responseBody: any = null;
  try {
    responseBody = responseText ? JSON.parse(responseText) : null;
  } catch {
    responseBody = responseText;
  }

  if (!response.ok) {
    const message =
      typeof responseBody === 'object' &&
      responseBody !== null &&
      typeof responseBody.message === 'string'
        ? responseBody.message
        : `ClaimNX API request failed (${response.status}).`;
    throw new Error(message);
  }

  return responseBody;
}

function createLegacyResource(basePath: string): LegacyApi {
  const methods: Record<string, LegacyApiMethod> = {
    get: (suffix = '') => request(`${basePath}${String(suffix)}`),
    list: () => request(basePath),
    create: (payload) =>
      request(basePath, { method: 'POST', body: JSON.stringify(payload) }),
    post: (payload, suffix = '') =>
      request(`${basePath}${String(suffix)}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (id, payload) =>
      request(`${basePath}/${encodeURIComponent(String(id))}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    patch: (suffix, payload) =>
      request(`${basePath}${String(suffix)}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    delete: (id) =>
      request(`${basePath}/${encodeURIComponent(String(id))}`, {
        method: 'DELETE',
      }),
  };

  return new Proxy(methods, {
    get(target, property) {
      if (typeof property !== 'string' || property in target) {
        return Reflect.get(target, property);
      }

      return async () => {
        throw new Error(
          `Legacy API method "${property}" has not been mapped yet. Migrate this screen to the typed ClaimNX API client.`,
        );
      };
    },
  }) as LegacyApi;
}

function localArray(key: string): any[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveLocal(key: string, value: any[]): void {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage is optional */ }
}

async function safe<T>(remote: Promise<T>, fallback: T): Promise<T> {
  try { return await remote; } catch (error) {
    console.warn('[ClaimNX] API unavailable; using local data.', error);
    return fallback;
  }
}

const claimsResource = createLegacyResource('/v1/claims');
export const claimsApi = {
  ...claimsResource,
  getAll: async (hospitalId?: string) => ({
    data: (await safe(request(`/claims${hospitalId ? `?hospitalId=${encodeURIComponent(hospitalId)}` : ''}`), localArray('claimnx_claims')))
      || localArray('claimnx_claims'),
  }),
  create: async (claim: any) => {
    const current = localArray('claimnx_claims');
    saveLocal('claimnx_claims', [...current, claim]);
    return { data: (await safe(request('/claims', { method: 'POST', body: JSON.stringify(claim) }), claim)) || claim };
  },
  update: async (id: string, claim: any) => {
    const updated = localArray('claimnx_claims').map((item) => item.id === id ? claim : item);
    saveLocal('claimnx_claims', updated);
    return { data: (await safe(request(`/claims/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(claim) }), claim)) || claim };
  },
  delete: async (id: string) => {
    saveLocal('claimnx_claims', localArray('claimnx_claims').filter((item) => item.id !== id));
    return safe(request(`/claims/${encodeURIComponent(id)}`, { method: 'DELETE' }), null);
  },
  deleteAll: async () => { saveLocal('claimnx_claims', []); return safe(request('/claims', { method: 'DELETE' }), null); },
};

const usersResource = createLegacyResource('/users');
export const usersApi = {
  ...usersResource,
  getAll: async () => ({ data: (await safe(request('/users'), localArray('claimnx_hospital_users'))) || localArray('claimnx_hospital_users') }),
  create: async (user: any) => { const all = [...localArray('claimnx_hospital_users'), user]; saveLocal('claimnx_hospital_users', all); return { data: user }; },
  update: async (id: string, user: any) => { const all = localArray('claimnx_hospital_users').map((item) => item.id === id ? { ...item, ...user } : item); saveLocal('claimnx_hospital_users', all); return { data: user }; },
  delete: async (id: string) => { saveLocal('claimnx_hospital_users', localArray('claimnx_hospital_users').filter((item) => item.id !== id)); return { data: null }; },
  sync: async (user: any) => ({ data: user }),
};

const configResource = createLegacyResource('/v1/configurations');
export const configApi = {
  ...configResource,
  getInsurers: async () => ({ data: localArray('claimnx_insurers') }),
  getRoles: async () => ({ data: localArray('claimnx_roles') }),
  getFields: async () => ({ data: localArray('claimnx_fields') }),
  addRole: async (role: any) => { const all = [...localArray('claimnx_roles'), role]; saveLocal('claimnx_roles', all); return { data: role }; },
  updateRole: async (id: string, role: any) => { saveLocal('claimnx_roles', localArray('claimnx_roles').map((item) => item.id === id ? role : item)); return { data: role }; },
  deleteRole: async (id: string) => { saveLocal('claimnx_roles', localArray('claimnx_roles').filter((item) => item.id !== id)); return { data: null }; },
  updateInsurer: async (id: string, insurer: any) => { saveLocal('claimnx_insurers', localArray('claimnx_insurers').map((item) => item.id === id ? insurer : item)); return { data: insurer }; },
  resetDummyData: async () => ({ data: null }),
};

export const patientsApi = createLegacyResource('/patients');
export const ordersApi = createLegacyResource('/orders');
