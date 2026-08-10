import {
  InsuranceDomainError,
  InsurancePartner,
  InsurancePartnerContact,
  InsuranceProductPlan,
  OrganizationInsurancePartnerEnablement,
} from './insurance-partner.aggregate';

const partnerId = 'insurance-partner-1';

const createPartner = (): InsurancePartner =>
  InsurancePartner.create({
    insurancePartnerId: partnerId,
    partnerCode: 'BLUE_CROSS',
    displayName: 'Blue Cross',
    partnerTypeReferenceValueId: 'partner-type-insurer',
    operationalStatusReferenceValueId: 'partner-status-active',
    version: 1,
  });

const contact = (id: string, isPrimary = false): InsurancePartnerContact => ({
  insurancePartnerContactId: id,
  insurancePartnerId: partnerId,
  contactTypeReferenceValueId: 'contact-type-operational',
  contactName: 'Operations Contact',
  phoneNumber: '9999999999',
  isPrimary,
  version: 1,
});

describe('Insurance Partner domain model', () => {
  it('does not permit a Contact to be reassigned to another Partner', () => {
    const partner = createPartner();
    expect(() => partner.addContact({ ...contact('contact-1'), insurancePartnerId: 'other-partner' })).toThrow(
      'Contact cannot be reassigned to another Insurance Partner.',
    );
  });

  it('permits only one active primary Contact per Contact Type', () => {
    const partner = createPartner();
    partner.addContact(contact('contact-1', true));
    expect(() => partner.addContact(contact('contact-2', true))).toThrow(InsuranceDomainError);
  });

  it('rejects invalid aggregate versions', () => {
    expect(() =>
      InsuranceProductPlan.create({
        insuranceProductPlanId: 'plan-1', insurancePartnerId: partnerId,
        planCode: 'PLAN', planName: 'Plan', operationalStatusReferenceValueId: 'draft', version: 0,
      }),
    ).toThrow('Insurance Product Plan version must be greater than or equal to 1.');
  });

  it('keeps Enablement ownership separate from the Partner root', () => {
    const enablement = OrganizationInsurancePartnerEnablement.create({
      organizationInsurancePartnerEnablementId: 'enablement-1', organizationId: 'organization-1',
      insurancePartnerId: partnerId, operationalStatusReferenceValueId: 'active', version: 1,
    });
    expect(enablement.snapshot.organizationId).toBe('organization-1');
  });
});
