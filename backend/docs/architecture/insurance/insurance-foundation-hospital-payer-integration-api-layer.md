# Hospital–Payer Integration API Layer

## Objective

Expose Hospital-specific Insurer/TPA routing configuration through a versioned, tenant-scoped REST API.

## Why

The portal needs a secure contract for each Hospital’s payer routing settings without exposing passwords, API tokens, mailbox credentials, or opaque secret-manager references.

## File Paths

- `src/modules/insurance/presentation/controllers/hospital-payer-integration-v1.controller.ts`
- `src/modules/insurance/presentation/dto/hospital-payer-integration-request.dto.ts`
- `src/modules/insurance/presentation/dto/hospital-payer-integration-response.dto.ts`

## Routes and Permissions

Base route:

`/v1/organizations/:organizationId/hospitals/:hospitalId/insurance-partner-integrations`

| Method | Route | Permission | Purpose |
| --- | --- | --- | --- |
| GET | `/` | `insurance.read` | List active Hospital payer integrations |
| POST | `/` | `insurance.update` | Create a routing configuration |
| GET | `/:hospitalInsurancePartnerIntegrationId` | `insurance.read` | Read one configuration |
| PATCH | `/:hospitalInsurancePartnerIntegrationId` | `insurance.update` | Update mutable configuration fields with `version` |
| PATCH | `/:hospitalInsurancePartnerIntegrationId/status` | `insurance.update` | Change lifecycle status with `version` |
| DELETE | `/:hospitalInsurancePartnerIntegrationId` | `insurance.update` | Soft retire with `version` |

## Security and Validation

- JWT and permission guards are mandatory on every route.
- URL parameters are UUID-validated.
- All writes enforce optimistic concurrency using `version >= 1`.
- Email addresses, lengths, and HTTPS portal URLs are validated at the API boundary.
- `credentialSecretReference` is an opaque, write-only secret-manager pointer. It is never included in the response DTO, response mapper, repository reads, logs, or tests.
- Application services enforce active IAM membership and Hospital-to-Organization scope; the controller does not trust client-supplied tenant context.

## Validation

Run:

```powershell
npm test -- --runInBand hospital-payer-integration
npm run build
```

For an authenticated local HTTP lifecycle test (create, read, update,
activate, retire), run `hospital-payer-integration-api-integration-test.ps1`
with the Hospital, Insurance Partner, and Reference Data UUIDs. The script
prompts for credentials and never writes them to a file.

## Approval Gate

Approve the API layer only after API tests and build both pass.
