import { InsuranceDatabaseMapper } from './insurance-database.mapper';

describe('InsuranceDatabaseMapper', () => {
  it('rehydrates the Partner root with its owned Contacts', () => {
    const partner = InsuranceDatabaseMapper.toPartnerAggregate(
      {
        id: 'partner-1', partner_code: 'BLUE_CROSS', display_name: 'Blue Cross', legal_name: null,
        partner_type_reference_value_id: 'type-1', operational_status_reference_value_id: 'status-1',
        registration_number: null, version: 1,
      },
      [{
        insurance_partner_contact_id: 'contact-1', insurance_partner_id: 'partner-1',
        contact_type_reference_value_id: 'contact-type-1', contact_name: 'Operations', designation: null,
        email_address: null, phone_number: '9999999999', mobile_number: null, is_primary: false,
        version: 1, deleted_at: null,
      }],
    );

    expect(partner.id).toBe('partner-1');
    expect(partner.insurancePartnerContacts).toHaveLength(1);
  });
});
