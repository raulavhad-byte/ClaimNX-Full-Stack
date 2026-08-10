# Insurance Foundation API Contract

## 1. Document Information

| Property | Value |
|---|---|
| Module | Insurance Foundation |
| API Version | v1 |
| Base Path | /api/v1/insurance |
| Status | Draft |

## 2. API Principles

- Controllers must remain thin.
- Controllers must not call repositories.
- Controllers must invoke application use cases only.
- Domain entities must never be returned directly.
- All request payloads must use validated DTOs.
- All responses must use the ClaimNX response envelope.
- Authentication and authorization are mandatory.
- Tenant context must come from authenticated claims.
- Unknown request fields must be rejected.

## 3. Partner Endpoints

| Operation | Method | Endpoint |
|---|---|---|
| Create partner | POST | /api/v1/insurance/partners |
| List partners | GET | /api/v1/insurance/partners |
| Get partner | GET | /api/v1/insurance/partners/{partnerId} |
| Update partner | PUT | /api/v1/insurance/partners/{partnerId} |
| Activate partner | PATCH | /api/v1/insurance/partners/{partnerId}/activate |
| Deactivate partner | PATCH | /api/v1/insurance/partners/{partnerId}/deactivate |

## 4. Partner Contact Endpoints

| Operation | Method | Endpoint |
|---|---|---|
| Create contact | POST | /api/v1/insurance/partners/{partnerId}/contacts |
| List contacts | GET | /api/v1/insurance/partners/{partnerId}/contacts |
| Get contact | GET | /api/v1/insurance/partners/{partnerId}/contacts/{contactId} |
| Update contact | PUT | /api/v1/insurance/partners/{partnerId}/contacts/{contactId} |
| Delete contact | DELETE | /api/v1/insurance/partners/{partnerId}/contacts/{contactId} |

## 5. Product Plan Endpoints

| Operation | Method | Endpoint |
|---|---|---|
| Create product plan | POST | /api/v1/insurance/partners/{partnerId}/product-plans |
| List product plans | GET | /api/v1/insurance/partners/{partnerId}/product-plans |
| Get product plan | GET | /api/v1/insurance/partners/{partnerId}/product-plans/{productPlanId} |
| Update product plan | PUT | /api/v1/insurance/partners/{partnerId}/product-plans/{productPlanId} |
| Activate product plan | PATCH | /api/v1/insurance/partners/{partnerId}/product-plans/{productPlanId}/activate |
| Deactivate product plan | PATCH | /api/v1/insurance/partners/{partnerId}/product-plans/{productPlanId}/deactivate |

## 6. Organization Enablement Endpoints

| Operation | Method | Endpoint |
|---|---|---|
| Enable partner | POST | /api/v1/insurance/organizations/{organizationId}/partner-enablement |
| Get enablement | GET | /api/v1/insurance/organizations/{organizationId}/partner-enablement/{partnerId} |
| List enabled partners | GET | /api/v1/insurance/organizations/{organizationId}/partner-enablement |
| Update enablement | PUT | /api/v1/insurance/organizations/{organizationId}/partner-enablement/{partnerId} |
| Disable partner | PATCH | /api/v1/insurance/organizations/{organizationId}/partner-enablement/{partnerId}/disable |

## 7. Standard Success Response

```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {}
}