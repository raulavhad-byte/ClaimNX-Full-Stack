import {
  InsurancePartner,
  InsurancePartnerAggregateProps,
  InsurancePartnerContact,
  InsuranceProductPlan,
  InsuranceProductPlanProps,
  OrganizationInsurancePartnerEnablement,
  OrganizationInsurancePartnerEnablementProps,
} from '../domain/insurance-partner.aggregate';

export interface InsurancePartnerPersistenceRow {
  id: string;
  partner_code: string;
  display_name: string;
  legal_name: string | null;
  partner_type_reference_value_id: string;
  operational_status_reference_value_id: string;
  registration_number: string | null;
  version: number;
  created_at?: string;
  updated_at?: string;
}

export interface InsurancePartnerContactPersistenceRow {
  insurance_partner_contact_id: string;
  insurance_partner_id: string;
  contact_type_reference_value_id: string;
  contact_name: string;
  designation: string | null;
  email_address: string | null;
  phone_number: string;
  mobile_number: string | null;
  is_primary: boolean;
  version: number;
  deleted_at: string | null;
}

export interface InsuranceProductPlanPersistenceRow {
  insurance_product_plan_id: string;
  insurance_partner_id: string;
  plan_code: string;
  plan_name: string;
  description: string | null;
  operational_status_reference_value_id: string;
  version: number;
  deleted_at: string | null;
}

export interface OrganizationInsurancePartnerEnablementPersistenceRow {
  organization_insurance_partner_enablement_id: string;
  organization_id: string;
  insurance_partner_id: string;
  tenant_partner_code: string | null;
  operational_status_reference_value_id: string;
  version: number;
  deleted_at: string | null;
}

const asDate = (value: string | null): Date | null => (value ? new Date(value) : null);

export class InsuranceDatabaseMapper {
  static toPartnerAggregate(
    root: InsurancePartnerPersistenceRow,
    contacts: InsurancePartnerContactPersistenceRow[],
  ): InsurancePartner {
    const props: InsurancePartnerAggregateProps = {
      insurancePartnerId: root.id,
      partnerCode: root.partner_code,
      displayName: root.display_name,
      legalName: root.legal_name,
      partnerTypeReferenceValueId: root.partner_type_reference_value_id,
      operationalStatusReferenceValueId: root.operational_status_reference_value_id,
      registrationNumber: root.registration_number,
      version: root.version,
    };
    return InsurancePartner.rehydrate(props, contacts.map(this.toContact));
  }

  static toContact(row: InsurancePartnerContactPersistenceRow): InsurancePartnerContact {
    return {
      insurancePartnerContactId: row.insurance_partner_contact_id,
      insurancePartnerId: row.insurance_partner_id,
      contactTypeReferenceValueId: row.contact_type_reference_value_id,
      contactName: row.contact_name,
      designation: row.designation,
      emailAddress: row.email_address,
      phoneNumber: row.phone_number,
      mobileNumber: row.mobile_number,
      isPrimary: row.is_primary,
      version: row.version,
      deletedAt: asDate(row.deleted_at),
    };
  }

  static toProductPlan(row: InsuranceProductPlanPersistenceRow): InsuranceProductPlan {
    const props: InsuranceProductPlanProps = {
      insuranceProductPlanId: row.insurance_product_plan_id,
      insurancePartnerId: row.insurance_partner_id,
      planCode: row.plan_code,
      planName: row.plan_name,
      description: row.description,
      operationalStatusReferenceValueId: row.operational_status_reference_value_id,
      version: row.version,
      deletedAt: asDate(row.deleted_at),
    };
    return InsuranceProductPlan.rehydrate(props);
  }

  static toEnablement(
    row: OrganizationInsurancePartnerEnablementPersistenceRow,
  ): OrganizationInsurancePartnerEnablement {
    const props: OrganizationInsurancePartnerEnablementProps = {
      organizationInsurancePartnerEnablementId:
        row.organization_insurance_partner_enablement_id,
      organizationId: row.organization_id,
      insurancePartnerId: row.insurance_partner_id,
      tenantPartnerCode: row.tenant_partner_code,
      operationalStatusReferenceValueId: row.operational_status_reference_value_id,
      version: row.version,
      deletedAt: asDate(row.deleted_at),
    };
    return OrganizationInsurancePartnerEnablement.rehydrate(props);
  }
}
