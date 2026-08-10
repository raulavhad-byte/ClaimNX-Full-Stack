import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import {
  CreateHospitalPayerIntegrationRequestDto,
  UpdateHospitalPayerIntegrationRequestDto,
} from './hospital-payer-integration-request.dto';

describe('Hospital payer integration request DTOs', () => {
  it('accepts an HTTPS portal URL and an opaque secret-manager reference', async () => {
    const dto = plainToInstance(CreateHospitalPayerIntegrationRequestDto, {
      insurancePartnerId: '6e2ce5a8-7a95-4ab9-97fb-04924f3c9bbd',
      integrationCode: 'PAYER-RPA',
      submissionChannelReferenceValueId: 'a7fbc8fd-a260-4f49-8191-6d7884a1cdbb',
      operationalStatusReferenceValueId: '8c5a5b4b-429e-47a7-b8e6-bf4d73903dbd',
      portalUrl: 'https://payer.example/portal',
      credentialSecretReference: 'vault://claimnx/payers/blue-cross',
    });

    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects a non-HTTPS portal URL and an invalid optimistic version', async () => {
    const dto = plainToInstance(UpdateHospitalPayerIntegrationRequestDto, {
      version: 0,
      integrationCode: 'PAYER-RPA',
      submissionChannelReferenceValueId: 'a7fbc8fd-a260-4f49-8191-6d7884a1cdbb',
      portalUrl: 'http://payer.example/portal',
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['version', 'portalUrl']),
    );
  });
});
