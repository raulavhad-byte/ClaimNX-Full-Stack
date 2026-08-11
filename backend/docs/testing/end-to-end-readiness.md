# ClaimNX local end-to-end testing readiness

## Required local services

Run the backend at `http://localhost:3000` and the frontend at
`http://localhost:5173`. The frontend development environment sets
`VITE_CLAIMNX_STRICT_API=true`, so supported API calls fail visibly instead of
falling back to browser storage.

Use an account created through Supabase Auth and the ClaimNX `users` table.
The local-only login fallback is not valid for end-to-end persistence testing.

## Current persistence status

| Area | Status | Notes |
| --- | --- | --- |
| Login | Connected | Supabase Auth, ClaimNX JWT, and `public.users` are used. |
| User creation | Connected | Creates the Supabase Auth identity and ClaimNX user row through `POST /users`. |
| User update/delete | Connected | Uses guarded `PATCH`/`DELETE /users/:id`; password rotation is not included in profile updates. |
| Claims read | Connected only for API-compatible records | Reads use `GET /claims`; records must follow the UUID-based backend claim schema. |
| Claims create/update/delete | Not ready for portal-form testing | The legacy form payload has not yet been mapped to the backend claim DTO. |
| Hospitals | Backend available, portal not connected | The legacy hospital screen currently treats hospitals as user records. |
| Insurance entities | Backend available, portal configuration remains local | Needs a DTO mapper before enabling writes. |
| Roles and permissions | Read API available, portal configuration remains local | Create/update/delete endpoints are not exposed by the controller. |
| KYP, documents, CRM email, invoices, announcements | Local-only | Corresponding frontend modules use browser storage and require dedicated backend APIs. |

## Test method

1. Start the backend: `npm run start:dev` in `backend`.
2. Start the frontend: `npm run dev` in `frontend`.
3. Sign in with a real Supabase Auth account. Confirm a Bearer token is sent to `localhost:3000` in DevTools Network.
4. Create a user and verify both a Supabase Auth user and `public.users` row exist.
5. Run read-only claim checks only with records already created through the backend-compatible API.
6. Treat every local-only section above as not production-ready until its API and persistence contract are implemented.

## Security checks

- Keep `SUPABASE_SERVICE_ROLE_KEY` only in `backend/.env`; it must never be a `VITE_` variable.
- RLS remains enabled and browser roles have no direct table access.
- Rotate the Supabase service-role key if it has been shared, logged, or exposed.
