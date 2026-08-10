import { Claim, ClaimProps, ClaimUuid } from '../domain/claim.aggregate';
import { ClaimLifecycleStatusCode, ClaimProductCode } from '../domain/claim-product.strategy';

/** Canonical Phase 8 persistence shape. Legacy claim columns are intentionally excluded. */
export interface ClaimPersistenceRow {
  id: string;
  organization_id: string;
  hospital_id: string;
  claim_number: string;
  claim_product_reference_value_id: string;
  claim_product_code: ClaimProductCode;
  claim_type_reference_value_id: string;
  lifecycle_status_reference_value_id: string;
  lifecycle_status_code: ClaimLifecycleStatusCode;
  hospital_insurance_partner_integration_id: string | null;
  patient_id: string | null;
  currency_code: string;
  total_claimed_amount: string | number;
  approved_amount: string | number | null;
  authorization_reference: string | null;
  external_submission_reference: string | null;
  closure_reason: string | null;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  deleted_by: string | null;
  deleted_at: string | null;
  version: number;
}

export class ClaimDatabaseMapper {
  static toAggregate(row: ClaimPersistenceRow): Claim {
    const props: ClaimProps = {
      claimId: row.id,
      organizationId: row.organization_id,
      hospitalId: row.hospital_id,
      claimNumber: row.claim_number,
      claimProductReferenceValueId: row.claim_product_reference_value_id,
      claimProductCode: row.claim_product_code,
      claimTypeReferenceValueId: row.claim_type_reference_value_id,
      lifecycleStatus: {
        referenceValueId: row.lifecycle_status_reference_value_id,
        code: row.lifecycle_status_code,
      },
      hospitalInsurancePartnerIntegrationId: row.hospital_insurance_partner_integration_id,
      patientId: row.patient_id,
      currencyCode: row.currency_code,
      totalClaimedAmount: Number(row.total_claimed_amount),
      approvedAmount: row.approved_amount === null ? null : Number(row.approved_amount),
      authorizationReference: row.authorization_reference,
      externalSubmissionReference: row.external_submission_reference,
      closureReason: row.closure_reason,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedBy: row.updated_by,
      updatedAt: new Date(row.updated_at),
      deletedBy: row.deleted_by,
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
      version: row.version,
    };
    return Claim.rehydrate(props);
  }

  static toListRecord(row: ClaimPersistenceRow): ClaimListRecord {
    return {
      claimId: row.id,
      organizationId: row.organization_id,
      hospitalId: row.hospital_id,
      claimNumber: row.claim_number,
      claimProductCode: row.claim_product_code,
      lifecycleStatusCode: row.lifecycle_status_code,
      totalClaimedAmount: Number(row.total_claimed_amount),
      approvedAmount: row.approved_amount === null ? null : Number(row.approved_amount),
      version: row.version,
      updatedAt: new Date(row.updated_at),
    };
  }
}

export interface ClaimListRecord {
  claimId: ClaimUuid;
  organizationId: ClaimUuid;
  hospitalId: ClaimUuid;
  claimNumber: string;
  claimProductCode: ClaimProductCode;
  lifecycleStatusCode: ClaimLifecycleStatusCode;
  totalClaimedAmount: number;
  approvedAmount: number | null;
  version: number;
  updatedAt: Date;
}
