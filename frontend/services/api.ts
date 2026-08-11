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
    // The current signed-in session is authoritative. Older builds stored a
    // token in localStorage; preferring it can send an already-revoked token
    // immediately after a successful new login.
    const session = sessionStorage.getItem('claimnx.session.v1');
    if (session) {
      const parsed = JSON.parse(session) as { accessToken?: unknown };
      return typeof parsed.accessToken === 'string' ? parsed.accessToken : undefined;
    }

    const legacyToken = window.localStorage.getItem('claimnx_access_token');
    if (legacyToken) return legacyToken;
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

  if (
    init.body !== undefined &&
    !(init.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
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
    if (response.status === 401) {
      sessionStorage.removeItem('claimnx.session.v1');
      localStorage.removeItem('claimnx_access_token');
      localStorage.removeItem('claimnx_manual_auth');
      window.dispatchEvent(new Event('claimnx:session-expired'));
    }
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

/**
 * Claim PDFs, scans and image stamps can be several megabytes.  They belong
 * in object storage, not in the JSON request sent to the claims table.  Keep
 * their metadata with the claim while refusing to send inline base64 content
 * through the API (which otherwise produces PostgREST's "request entity too
 * large" error).
 */
function withoutInlineClaimFiles(value: unknown, key?: string): unknown {
  if (key === 'data' || key === 'fileData' || key === 'hospitalSeal' || key === 'doctorStamp') {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.map((item) => withoutInlineClaimFiles(item));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([entryKey, entryValue]) => [entryKey, withoutInlineClaimFiles(entryValue, entryKey)])
        .filter(([, entryValue]) => entryValue !== undefined),
    );
  }
  return value;
}

function claimRequestPayload(claim: any): Record<string, unknown> {
  return withoutInlineClaimFiles(claim) as Record<string, unknown>;
}

function claimUpdatePayload(claim: any): Record<string, unknown> {
  const formData = claim?.formData ?? claim?.form_data ?? {};
  const workflowState = {
    originatingStatus: claim?.originatingStatus,
    assignedMedicalUserId: claim?.assignedMedicalUserId,
    assignedMedicalUserName: claim?.assignedMedicalUserName,
    isAccepted: claim?.isAccepted,
    // KYP/Policy Audit has its own acceptance queue. Keep this separate from
    // the medical-review acceptance flag so a reload cannot send an accepted
    // Policy Audit case back to Pending.
    isKypAccepted: claim?.isKypAccepted ?? formData?.isKypAccepted,
    assignedOpsUserId: claim?.assignedOpsUserId ?? formData?.assignedOpsUserId,
    assignedOpsUserName: claim?.assignedOpsUserName ?? formData?.assignedOpsUserName,
    isMedicallyApproved: claim?.isMedicallyApproved,
    submissionStatus: claim?.submissionStatus,
    failureType: claim?.failureType,
    queryRaisedBy: claim?.queryRaisedBy,
    history: Array.isArray(claim?.history) ? claim.history : formData.history ?? [],
  };

  const payload: Record<string, unknown> = {
    status: claim?.status,
    amount: Number(claim?.amount ?? claim?.estimatedCost ?? 0),
    estimated_cost: Number(claim?.estimatedCost ?? claim?.estimated_cost ?? 0),
    approved_amount: claim?.approvedAmount ?? claim?.approved_amount,
    settled_amount: claim?.settledAmount ?? claim?.settled_amount,
    diagnosis: claim?.diagnosis,
    admission_date: claim?.admissionDate ?? claim?.admission_date,
    discharge_date: claim?.dischargeDate ?? claim?.discharge_date,
    priority: claim?.priority,
    form_data: withoutInlineClaimFiles({ ...formData, ...workflowState }),
  };

  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  );
}

function toPortalUser(user: any): any {
  const profileData = user?.profileData ?? user?.profile_data ?? {};
  const nameParts = String(user?.displayName ?? user?.display_name ?? '').trim().split(/\s+/);
  return {
    ...profileData,
    ...user,
    displayName: user?.displayName ?? user?.display_name ?? '',
    emailId: user?.emailId ?? user?.email ?? '',
    mobileNo: user?.mobileNo ?? user?.mobile_no ?? '',
    hospitalId: user?.hospitalId ?? user?.hospital_id ?? '',
    roleId: user?.roleId ?? user?.role_id ?? undefined,
    entityType: user?.entityType ?? user?.entity_type ?? profileData?.entityType ?? 'User',
    firstName: user?.firstName ?? profileData?.firstName ?? nameParts[0] ?? '',
    lastName: user?.lastName ?? profileData?.lastName ?? nameParts.slice(1).join(' '),
  };
}

function toUserRequestPayload(user: any, includePassword: boolean): Record<string, unknown> {
  const profileData = {
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    empCode: user?.empCode ?? user?.employeeCode ?? '',
    designation: user?.designation ?? '',
    department: user?.department ?? '',
    joiningDate: user?.joiningDate ?? '',
    hospitalName: user?.hospitalName ?? '',
    address: user?.address ?? '',
    state: user?.state ?? '',
    district: user?.district ?? '',
    zone: user?.zone ?? '',
    rohiniId: user?.rohiniId ?? '',
    tpaPersonName: user?.tpaPersonName ?? '',
    tpaPersonMobile: user?.tpaPersonMobile ?? '',
    doctorName: user?.doctorName ?? '',
    doctorMobileNo: user?.doctorMobileNo ?? '',
    reportsToId: user?.reportsToId ?? '',
    invoiceEmail: user?.invoiceEmail ?? '',
    parentHospitalId: user?.parentHospitalId ?? '',
    products: Array.isArray(user?.products) ? user.products : [],
    defaultProduct: user?.defaultProduct ?? '',
    zones: Array.isArray(user?.zones) ? user.zones : [],
    states: Array.isArray(user?.states) ? user.states : [],
    districts: Array.isArray(user?.districts) ? user.districts : [],
    assignedHospitalIds: Array.isArray(user?.assignedHospitalIds)
      ? user.assignedHospitalIds
      : [],
    // Hospital insurance tie-up metadata. Passwords are intentionally not
    // copied into profile_data; browser-readable JSON must never hold payer
    // portal secrets.
    portalCredentials: Array.isArray(user?.portalCredentials)
      ? user.portalCredentials.map((credential: any) => ({
        entityId: credential?.entityId ?? '',
        username: credential?.username ?? '',
        startDate: credential?.startDate ?? '',
        endDate: credential?.endDate ?? '',
        rateListName: credential?.rateListName ?? '',
        // Binary rate-list data belongs in private object storage; profile
        // JSON stores only the file metadata and its storage reference.
        rateListStoragePath: credential?.rateListStoragePath ?? '',
        rateListType: credential?.rateListType ?? '',
      }))
      : [],
    hospitalSeal: user?.hospitalSeal ?? '',
    doctorStamp: user?.doctorStamp ?? '',
    agreementType: user?.agreementType ?? '',
    agreementValue: user?.agreementValue ?? 0,
    agreementStartDate: user?.agreementStartDate ?? '',
    agreementRenewalDate: user?.agreementRenewalDate ?? '',
    agreementStageValues: Array.isArray(user?.agreementStageValues)
      ? user.agreementStageValues
      : [],
    agreementInvoiceCategories: Array.isArray(user?.agreementInvoiceCategories)
      ? user.agreementInvoiceCategories
      : [],
    agreementPercentageBase: user?.agreementPercentageBase ?? '',
    valueAddedServices: user?.valueAddedServices ?? {},
    allowedStages: Array.isArray(user?.allowedStages) ? user.allowedStages : [],
    invoiceGenerationType: user?.invoiceGenerationType ?? '',
    statusReason: user?.statusReason ?? '',
  };
  const payload: Record<string, unknown> = {
    email: user?.emailId ?? user?.email,
    displayName: user?.displayName ?? user?.display_name,
    role: user?.role,
    roleId: user?.roleId ?? user?.role_id,
    mobileNo: user?.mobileNo ?? user?.mobile_no,
    entityType: user?.entityType ?? 'User',
    profileData,
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

function toPortalRole(role: any): any {
  return {
    ...role,
    id: String(role?.id ?? ''),
    name: role?.name ?? '',
    description: role?.description ?? '',
    permissions: Array.isArray(role?.permissions) ? role.permissions : [],
    canCreateRoles: Array.isArray(role?.canCreateRoles)
      ? role.canCreateRoles
      : Array.isArray(role?.can_create_roles)
        ? role.can_create_roles
        : [],
    products: Array.isArray(role?.products) ? role.products : [],
    allowedReports: Array.isArray(role?.allowedReports) ? role.allowedReports : [],
    users: Number(role?.users ?? 0),
    status: role?.status === 'Inactive' ? 'Inactive' : 'Active',
  };
}

function toRoleRequestPayload(role: any): Record<string, unknown> {
  return {
    id: String(role?.id ?? ''),
    name: String(role?.name ?? '').trim(),
    description: String(role?.description ?? ''),
    permissions: Array.isArray(role?.permissions) ? role.permissions : [],
    canCreateRoles: Array.isArray(role?.canCreateRoles) ? role.canCreateRoles : [],
    status: role?.status === 'Inactive' ? 'Inactive' : 'Active',
  };
}

const databaseClaimStatusMap: Record<string, string> = {
  DRAFT: 'Draft',
  READY_FOR_REVIEW: 'Pending Medical Review',
  PENDING_MEDICAL_REVIEW: 'Pending Medical Review',
  PENDING_MEDICAL_TEAM: 'Pending Medical Team',
  PRE_AUTH_INITIATED: 'Pre Auth initiated',
  PRE_AUTH_APPROVED: 'Pre Auth Approved',
  PRE_AUTH_REJECTED: 'Pre Auth Rejected',
  INITIAL_QUERY_PENDING: 'Initial Query Pending',
  DISCHARGE_INITIATED: 'Discharge Initiated',
  DISCHARGE_APPROVED: 'Discharged Approved',
};

function toPortalClaim(claim: any): any {
  const formData = claim?.formData ?? claim?.form_data ?? {};
  const status = String(claim?.status ?? '');
  const product = claim?.product ?? formData?.product ?? 'CPC';

  return {
    ...claim,
    id: claim?.id ?? '',
    caseReferenceId: claim?.caseReferenceId ?? claim?.case_ref_id ?? claim?.claim_number ?? '',
    patientId: claim?.patientId ?? claim?.patient_id ?? '',
    patientName: claim?.patientName ?? formData?.p_name ?? formData?.patient_name ?? 'Unknown Patient',
    hospitalId: claim?.hospitalId ?? claim?.hospital_id ?? formData?.hospitalId ?? '',
    hospitalName: claim?.hospitalName ?? claim?.hospital_name ?? formData?.hospitalName ?? formData?.hospital_name ?? '',
    insuranceProvider: claim?.insuranceProvider ?? formData?.insurance_company ?? '',
    policyNumber: claim?.policyNumber ?? formData?.p_policy_no ?? formData?.policyNumber ?? '',
    estimatedCost: Number(claim?.estimatedCost ?? claim?.estimated_cost ?? claim?.amount ?? 0),
    admissionDate: claim?.admissionDate ?? claim?.admission_date ?? '',
    claimType: claim?.claimType ?? formData?.claimType ?? 'Cashless',
    product,
    status: databaseClaimStatusMap[status] ?? claim?.status ?? 'Draft',
    originatingStatus: claim?.originatingStatus ?? formData?.originatingStatus,
    assignedMedicalUserId: claim?.assignedMedicalUserId ?? formData?.assignedMedicalUserId,
    assignedMedicalUserName: claim?.assignedMedicalUserName ?? formData?.assignedMedicalUserName,
    isAccepted: Boolean(claim?.isAccepted ?? formData?.isAccepted),
    isKypAccepted: Boolean(claim?.isKypAccepted ?? formData?.isKypAccepted),
    assignedOpsUserId: claim?.assignedOpsUserId ?? formData?.assignedOpsUserId,
    assignedOpsUserName: claim?.assignedOpsUserName ?? formData?.assignedOpsUserName,
    isMedicallyApproved: Boolean(claim?.isMedicallyApproved ?? formData?.isMedicallyApproved),
    submissionStatus: claim?.submissionStatus ?? formData?.submissionStatus,
    failureType: claim?.failureType ?? formData?.failureType,
    queryRaisedBy: claim?.queryRaisedBy ?? formData?.queryRaisedBy,
    formData: {
      ...formData,
      hospitalId: claim?.hospital_id ?? formData?.hospitalId ?? '',
      hospitalName: claim?.hospitalName ?? claim?.hospital_name ?? formData?.hospitalName ?? formData?.hospital_name ?? '',
      product,
    },
    history: Array.isArray(claim?.history)
      ? claim.history
      : Array.isArray(formData?.history)
        ? formData.history
        : [],
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
      ).map(toPortalClaim),
    };
  },
  create: async (claim: any) => {
    const current = localArray('claimnx_claims');
    saveLocal('claimnx_claims', [...current, claim]);
    return { data: (await safe(request('/claims', { method: 'POST', body: JSON.stringify(claimRequestPayload(claim)) }), claim)) || claim };
  },
  update: async (id: string, claim: any) => {
    const updated = localArray('claimnx_claims').map((item) => item.id === id ? claim : item);
    saveLocal('claimnx_claims', updated);
    return {
      data: toPortalClaim(
        (await safe(
          request(`/claims/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            body: JSON.stringify(claimUpdatePayload(claim)),
          }),
          claim,
        )) || claim,
      ),
    };
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

export const authApi = {
  getMe: async () => request('/auth/me'),
};

const configResource = createLegacyResource('/v1/configurations');
export const configApi = {
  ...configResource,
  getInsurers: async () => ({
    data: collectionFrom(await request('/insurance'), []).map(toPortalInsuranceEntity),
  }),
  getRoles: async () => ({
    data: collectionFrom(await request('/roles?limit=100'), []).map(toPortalRole),
  }),
  getFields: async () => ({ data: localArray('claimnx_fields') }),
  addRole: async (role: any) => ({
    data: toPortalRole(await request('/roles', {
      method: 'POST',
      body: JSON.stringify(toRoleRequestPayload(role)),
    })),
  }),
  updateRole: async (id: string, role: any) => ({
    data: toPortalRole(await request(`/roles/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(toRoleRequestPayload(role)),
    })),
  }),
  deleteRole: async (id: string) => {
    await request(`/roles/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return { data: null };
  },
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

export const documentsApi = {
  uploadClaimFile: async ({
    claimId,
    file,
    category,
  }: {
    claimId: string;
    file: File;
    category?: string;
  }) => {
    const formData = new FormData();
    formData.append('claim_id', claimId);
    formData.append('file', file, file.name);
    if (category) formData.append('category', category);
    return request('/documents/upload', { method: 'POST', body: formData });
  },
  listClaimDocuments: async (claimId: string) => {
    const result = await request(`/documents?claim_id=${encodeURIComponent(claimId)}&limit=100`);
    return Array.isArray(result) ? result : (result?.data ?? []);
  },
  previewClaimDocument: async (documentId: string) =>
    request(`/documents/${encodeURIComponent(documentId)}/preview`),
  uploadHospitalRateList: async ({
    hospitalUserId,
    payerId,
    file,
  }: {
    hospitalUserId: string;
    payerId: string;
    file: File;
  }) => {
    const formData = new FormData();
    formData.append('hospital_user_id', hospitalUserId);
    formData.append('payer_id', payerId);
    formData.append('file', file, file.name);
    return request('/documents/hospital-asset/upload', { method: 'POST', body: formData });
  },
  previewHospitalRateList: async (storagePath: string) =>
    request(`/documents/hospital-asset/preview?path=${encodeURIComponent(storagePath)}`),
};
