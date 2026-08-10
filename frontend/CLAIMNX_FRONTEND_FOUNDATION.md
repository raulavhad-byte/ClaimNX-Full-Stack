# ClaimNX Frontend Foundation

## Objective

Provide one safe, reusable route from the React portal to the versioned ClaimNX NestJS APIs.

## Files

- `services/claimnx-api-client.ts` — HTTP client and standard API error type.
- `services/claimnx-session-service.ts` — browser-session token handling and `/auth/login`.
- `services/claimnx-api.ts` — shared API entry point and tenant/hospital URL builders.
- `.env.example` — local API configuration.

## Rules

- Business data must be accessed through the NestJS API; do not add direct browser writes to Supabase.
- Never store passwords, payer portal credentials, tokens, or document contents in UI state, local storage, logs, or source files.
- Every tenant-bound route must use an `organizationId`; every hospital-bound route must use both `organizationId` and `hospitalId`.
- The session service uses `sessionStorage`, so its token is cleared when the browser session ends. Production should move to a secure httpOnly-cookie session when the backend auth contract is ready.

## Example

```ts
import { claimnxApi } from './services/claimnx-api';

const hospitals = await claimnxApi.get(
  claimnxApi.organizationPath(organizationId, 'hospitals'),
);
```

## Validation

Run from `D:\Projects\frontend`:

```powershell
npm run build
```

The existing portal screens remain unchanged by this foundation. Connect one screen at a time, with a loading state, error state, and tenant-aware API route.
