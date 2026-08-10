import { HospitalDatabaseMapper } from './hospital-database.mapper';

describe('HospitalDatabaseMapper', () => {
  it('rehydrates an approved Hospital Aggregate from Phase 5 rows', () => {
    const hospital = HospitalDatabaseMapper.toAggregate(
      {
        id: 'hospital-1',
        organization_id: 'organization-1',
        hospital_code: 'HOSP-001',
        display_name: 'City Care Hospital',
        registration_number: null,
        hospital_type_reference_value_id: 'hospital-type-1',
        ownership_type_reference_value_id: null,
        operational_status_reference_value_id: 'status-active',
        primary_address_id: 'address-1',
        primary_contact_id: 'contact-1',
        version: 1,
      },
      [
        {
          hospital_address_id: 'address-1',
          hospital_id: 'hospital-1',
          address_type_reference_value_id: 'registered-address',
          address_line1: 'Main Road',
          address_line2: null,
          landmark: null,
          country_id: 'country-1',
          state_id: 'state-1',
          city_id: 'city-1',
          postal_code: '380001',
          is_primary: true,
          deleted_at: null,
        },
      ],
      [
        {
          hospital_contact_id: 'contact-1',
          hospital_id: 'hospital-1',
          contact_type_reference_value_id: 'administrative-contact',
          contact_name: 'Operations Manager',
          designation: null,
          email_address: null,
          phone_number: '9999999999',
          mobile_number: null,
          is_primary: true,
          deleted_at: null,
        },
      ],
      [],
    );

    expect(hospital.id).toBe('hospital-1');
    expect(hospital.hospitalAddresses).toHaveLength(1);
    expect(hospital.hospitalContacts).toHaveLength(1);
    expect(hospital.snapshot.primaryAddressId).toBe('address-1');
  });
});
