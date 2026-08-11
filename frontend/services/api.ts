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

// Enable this in the shared development/staging environment to ensure API
// failures are visible instead of being masked by legacy browser storage.
const strictApiMode = import.meta.env.VITE_CLAIMNX_STRICT_API === 'true';

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

function unwrapApiEnvelope(payload: any): any {
  if (
    payload &&
    typeof payload === 'object' &&
    !Array.isArray(payload) &&
    Object.prototype.hasOwnProperty.call(payload, 'data')
  ) {
    return payload.data;
  }
  return payload;
}

function collectionFrom(payload: any, fallback: any[]): any[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.items)) return payload.items;
  }
  return fallback;
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

  return unwrapApiEnvelope(responseBody);
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

function isUuid(value: unknown): value is string {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function toPortalUser(user: any): any {
  return {
    ...user,
    displayName: user?.displayName ?? user?.display_name ?? '',
    emailId: user?.emailId ?? user?.email ?? '',
    mobileNo: user?.mobileNo ?? user?.mobile_no ?? '',
    hospitalId: user?.hospitalId ?? user?.hospital_id ?? '',
    roleId: user?.roleId ?? user?.role_id ?? undefined,
  };
}

function toUserRequestPayload(user: any, includePassword: boolean): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    email: user?.emailId ?? user?.email,
    displayName: user?.displayName ?? user?.display_name,
    role: user?.role,
    roleId: user?.roleId ?? user?.role_id,
    mobileNo: user?.mobileNo ?? user?.mobile_no,
  };

  const hospitalId = user?.hospitalId ?? user?.hospital_id;
  if (isUuid(hospitalId)) payload.hospitalId = hospitalId;
  if (includePassword && user?.password) payload.password = user.password;

  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== ''),
  );
}

function toPortalInsuranceEntity(entity: any): any {
  let metadata: Record<string, unknown> = {};
  if (typeof entity?.data === 'string' && entity.data) {
    try { metadata = JSON.parse(entity.data) as Record<string, unknown>; } catch { /* preserve legacy data */ }
  }

  return {
    ...metadata,
    ...entity,
    name: entity?.name ?? entity?.display_name ?? '',
    emailId: entity?.emailId ?? entity?.email_id ?? '',
    settlementEmail: entity?.settlementEmail ?? metadata.settlementEmail ?? '',
    portalLink: entity?.portalLink ?? entity?.portal_link ?? '',
    automationType: entity?.automationType ?? entity?.automation_type ?? 'Portal',
    onPanel: entity?.onPanel ?? entity?.on_panel ?? true,
    rpaSupported: entity?.rpaSupported ?? entity?.rpa_supported ?? false,
    autoEmailEnabled: entity?.autoEmailEnabled ?? entity?.auto_email_enabled ?? true,
    templateName: entity?.templateName ?? entity?.template_name ?? metadata.templateName,
    regionalContacts: entity?.regionalContacts ?? metadata.regionalContacts ?? [],
  };
}

function toInsuranceRequestPayload(entity: any): Record<string, unknown> {
  const metadata = {
    settlementEmail: entity?.settlementEmail ?? '',
    state: entity?.state ?? '',
    district: entity?.district ?? '',
    zone: entity?.zone ?? '',
    regionalContacts: entity?.regionalContacts ?? [],
  };

  return {
    name: entity?.name,
    email_id: entity?.emailId,
    portal_link: entity?.portalLink,
    type: entity?.type,
    automation_type: entity?.automationType,
    on_panel: entity?.onPanel,
    rpa_supported: entity?.rpaSupported,
    auto_email_enabled: entity?.autoEmailEnabled,
    template_name: entity?.templateName,
    data: JSON.stringify(metadata),
  };
}

async function safe<T>(remote: Promise<T>, fallback: T): Promise<T> {
  try { return await remote; } catch (error) {
    if (strictApiMode) throw error;
    console.warn('[ClaimNX] API unavailable; using local data.', error);
    return fallback;
  }
}

const claimsResource = createLegacyResource('/v1/claims');
export const claimsApi = {
  ...claimsResource,
  getAll: async (hospitalId?: string) => {
    // The backend only accepts UUID hospital IDs and uses snake_case query
    // parameters. Do not send legacy values such as H1 to the API.
    if (hospitalId && !isUuid(hospitalId)) return { data: [] };
    const query = hospitalId ? `?hospital_id=${encodeURIComponent(hospitalId)}` : '';
    return {
      data: collectionFrom(
        await safe(request(`/claims${query}`), localArray('claimnx_claims')),
        localArray('claimnx_claims'),
      ),
    };
  },
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
  getAll: async () => ({
    data: collectionFrom(
      await safe(request('/users'), localArray('claimnx_hospital_users')),
      localArray('claimnx_hospital_users'),
    ).map(toPortalUser),
  }),
  create: async (user: any) => {
    const created = toPortalUser(await request('/users', {
      method: 'POST',
      body: JSON.stringify(toUserRequestPayload(user, true)),
    }));
    const portalUser = { ...user, ...created, password: undefined };
    saveLocal('claimnx_hospital_users', [...localArray('claimnx_hospital_users'), portalUser]);
    return { data: portalUser };
  },
  update: async (id: string, user: any) => {
    const updated = toPortalUser(await request(`/users/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(toUserRequestPayload(user, false)),
    }));
    const portalUser = { ...user, ...updated, password: undefined };
    const all = localArray('claimnx_hospital_users').map((item) => item.id === id ? portalUser : item);
    saveLocal('claimnx_hospital_users', all);
    return { data: portalUser };
  },
  delete: async (id: string) => {
    await request(`/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
    saveLocal('claimnx_hospital_users', localArray('claimnx_hospital_users').filter((item) => item.id !== id));
    return { data: null };
  },
  sync: async (user: any) => ({ data: user }),
};

const configResource = createLegacyResource('/v1/configurations');
export const configApi = {
  ...configResource,
  getInsurers: async () => ({
    data: collectionFrom(await request('/insurance'), []).map(toPortalInsuranceEntity),
  }),
  getRoles: async () => ({ data: localArray('claimnx_roles') }),
  getFields: async () => ({ data: localArray('claimnx_fields') }),
  addRole: async (role: any) => { const all = [...localArray('claimnx_roles'), role]; saveLocal('claimnx_roles', all); return { data: role }; },
  updateRole: async (id: string, role: any) => { saveLocal('claimnx_roles', localArray('claimnx_roles').map((item) => item.id === id ? role : item)); return { data: role }; },
  deleteRole: async (id: string) => { saveLocal('claimnx_roles', localArray('claimnx_roles').filter((item) => item.id !== id)); return { data: null }; },
  createInsurer: async (insurer: any) => {
    const created = toPortalInsuranceEntity(await request('/insurance', {
      method: 'POST',
      body: JSON.stringify(toInsuranceRequestPayload(insurer)),
    }));
    saveLocal('claimnx_insurers', [...localArray('claimnx_insurers'), created]);
    return { data: created };
  },
  updateInsurer: async (id: string, insurer: any) => {
    const updated = toPortalInsuranceEntity(await request(`/insurance/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(toInsuranceRequestPayload(insurer)),
    }));
    const all = localArray('claimnx_insurers').map((item) => item.id === id ? updated : item);
    saveLocal('claimnx_insurers', all);
    return { data: updated };
  },
  resetDummyData: async () => ({ data: null }),
};

export const patientsApi = createLegacyResource('/patients');
export const ordersApi = createLegacyResource('/orders');
