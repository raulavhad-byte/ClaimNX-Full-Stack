import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateAutomationWorkRequestDto, StartAutomationWorkRequestDto } from './automation-command-request.dto';

describe('automation command DTOs', () => {
  it('accepts a valid automation work request', async () => {
    const errors = await validate(plainToInstance(CreateAutomationWorkRequestDto, {
      claimId: '00000000-0000-4000-8000-000000000001',
      claimProductReferenceValueId: '00000000-0000-4000-8000-000000000002',
      workPurposeReferenceValueId: '00000000-0000-4000-8000-000000000003',
      queuedWorkStatusReferenceValueId: '00000000-0000-4000-8000-000000000004',
      sourceRecordType: 'CLAIM',
      idempotencyKey: 'automation-request-1',
      safeInputSummary: { claimNumber: 'CLM-1' },
    }));
    expect(errors).toEqual([]);
  });

  it('rejects an invalid reference ID and a non-positive expected version', async () => {
    const workRequestErrors = await validate(plainToInstance(CreateAutomationWorkRequestDto, {
      claimId: 'not-a-uuid', claimProductReferenceValueId: '00000000-0000-4000-8000-000000000002',
      workPurposeReferenceValueId: '00000000-0000-4000-8000-000000000003', queuedWorkStatusReferenceValueId: '00000000-0000-4000-8000-000000000004', sourceRecordType: 'CLAIM', idempotencyKey: 'automation-request-1',
    }));
    const startErrors = await validate(plainToInstance(StartAutomationWorkRequestDto, { expectedVersion: 0, inProgressStatusReferenceValueId: '00000000-0000-4000-8000-000000000004' }));
    expect(workRequestErrors.length).toBeGreaterThan(0);
    expect(startErrors.length).toBeGreaterThan(0);
  });
});
