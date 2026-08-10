import {
  Hospital,
  HospitalDomainError,
  HospitalAddress,
  HospitalContact,
  HospitalDepartment,
} from './hospital.aggregate';

const hospitalId = 'hospital-1';

const createHospital = (): Hospital =>
  Hospital.create({
    hospitalId,
    organizationId: 'organization-1',
    hospitalCode: 'HOSP-001',
    displayName: 'City Care Hospital',
    hospitalTypeReferenceValueId: 'hospital-type-1',
    operationalStatusReferenceValueId: 'active-status-1',
    version: 1,
  });

const address = (id: string, isPrimary = false): HospitalAddress => ({
  hospitalAddressId: id,
  hospitalId,
  addressTypeReferenceValueId: 'address-type-1',
  addressLine1: 'Main Road',
  countryId: 'country-1',
  stateId: 'state-1',
  cityId: 'city-1',
  postalCode: '380001',
  isPrimary,
});

const contact = (id: string, isPrimary = false): HospitalContact => ({
  hospitalContactId: id,
  hospitalId,
  contactTypeReferenceValueId: 'contact-type-1',
  contactName: 'Operations Manager',
  phoneNumber: '9999999999',
  isPrimary,
});

const department = (id: string, code: string, name: string): HospitalDepartment => ({
  hospitalDepartmentId: id,
  hospitalId,
  departmentCode: code,
  departmentName: name,
  operationalStatusReferenceValueId: 'active-status-1',
});

describe('Hospital Aggregate', () => {
  it('allows exactly one active primary Address', () => {
    const hospital = createHospital();
    hospital.addAddress(address('address-1', true));

    expect(() => hospital.addAddress(address('address-2', true))).toThrow(
      HospitalDomainError,
    );
  });

  it('rejects a child entity owned by another Hospital', () => {
    const hospital = createHospital();

    expect(() =>
      hospital.addAddress({ ...address('address-1'), hospitalId: 'hospital-2' }),
    ).toThrow('Address cannot be reassigned to another Hospital.');
  });

  it('allows only one active primary Contact for a Contact Type', () => {
    const hospital = createHospital();
    hospital.addContact(contact('contact-1', true));

    expect(() => hospital.addContact(contact('contact-2', true))).toThrow(
      HospitalDomainError,
    );
  });

  it('enforces unique active Department Code and Name within a Hospital', () => {
    const hospital = createHospital();
    hospital.addDepartment(department('department-1', 'CARD', 'Cardiology'));

    expect(() =>
      hospital.addDepartment(department('department-2', 'card', 'Cardiology Two')),
    ).toThrow(HospitalDomainError);
    expect(() =>
      hospital.addDepartment(department('department-3', 'NEUR', 'cardiology')),
    ).toThrow(HospitalDomainError);
  });
});
