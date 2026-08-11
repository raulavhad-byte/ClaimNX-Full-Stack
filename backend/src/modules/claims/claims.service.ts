import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

import { DatabaseService } from '../../database/database.service';

import { CreateClaimDto } from './dto/create-claim.dto';
import { UpdateClaimDto } from './dto/update-claim.dto';
import { ClaimFilterDto } from './dto/claim-filter.dto';

@Injectable()
export class ClaimsService {
  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  private get supabase() {
    return this.databaseService.getClient();
  }

  async create(createClaimDto: CreateClaimDto, actorUserId: string) {
    const hospital = await this.requireHospitalContext(
      createClaimDto.hospital_id,
      actorUserId,
    );
    const [productReferenceId, claimTypeReferenceId, lifecycleReferenceId] = await Promise.all([
      this.requireReferenceValue('CLAIM_PRODUCT', 'CPC'),
      this.requireReferenceValue('CLAIM_TYPE', 'CASHLESS'),
      this.requireReferenceValue('CLAIM_LIFECYCLE_STATUS', 'DRAFT'),
    ]);

    const { data, error } = await this.supabase
      .from('claims')
      .insert({
        ...createClaimDto,
        organization_id: hospital.organization_id,
        claim_number: createClaimDto.case_ref_id,
        claim_product_reference_value_id: productReferenceId,
        claim_type_reference_value_id: claimTypeReferenceId,
        lifecycle_status_reference_value_id: lifecycleReferenceId,
        created_by: actorUserId,
        updated_by: actorUserId,
        last_updated_by: actorUserId,
        is_deleted: false,
        version: 1,
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  private async requireHospitalContext(
    hospitalId: string,
    actorUserId: string,
  ): Promise<{ id: string; organization_id: string }> {
    const { data, error } = await this.supabase
      .from('hospitals')
      .select('id, organization_id')
      .eq('id', hospitalId)
      .eq('is_deleted', false)
      .maybeSingle<{ id: string; organization_id: string }>();

    if (error) throw error;
    if (data?.organization_id) {
      return data;
    }

    // Legacy Hospital Onboarding created a user profile but did not create the
    // corresponding hospitals row. Provision that missing database hospital
    // only for a Hospital entity, then permanently link the user to it.
    const { data: hospitalUser, error: userError } = await this.supabase
      .from('users')
      .select('id, display_name, email, mobile_no, role, entity_type, profile_data')
      .eq('id', hospitalId)
      .eq('is_deleted', false)
      .maybeSingle<{
        id: string;
        display_name: string;
        email: string;
        mobile_no: string | null;
        role: string | null;
        entity_type: string | null;
        profile_data: Record<string, unknown> | null;
      }>();

    if (userError) throw userError;
    const isHospitalProfile = hospitalUser?.entity_type === 'Hospital' ||
      /^hospital\b/i.test(hospitalUser?.role ?? '');
    if (!hospitalUser || !isHospitalProfile) {
      throw new NotFoundException(
        'The selected hospital does not have an active organization assignment.',
      );
    }

    const { data: organizations, error: organizationError } = await this.supabase
      .from('organizations')
      .select('id')
      .eq('status', 'ACTIVE')
      .eq('is_deleted', false)
      .limit(2);
    if (organizationError) throw organizationError;
    if (!organizations || organizations.length !== 1) {
      throw new BadRequestException(
        'Hospital onboarding requires exactly one active organization. Assign this hospital to an organization before creating a claim.',
      );
    }

    const profile = hospitalUser.profile_data ?? {};
    const hospitalName = String(profile.hospitalName ?? hospitalUser.display_name ?? '').trim();
    if (!hospitalName) {
      throw new BadRequestException('The Hospital profile needs a hospital name before creating a claim.');
    }

    const { data: createdHospital, error: createHospitalError } = await this.supabase
      .from('hospitals')
      .insert({
        organization_id: organizations[0].id,
        hospital_name: hospitalName,
        display_name: hospitalName,
        hospital_code: `HOSP-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`,
        rohini_id: profile.rohiniId ? String(profile.rohiniId) : null,
        address: profile.address ? String(profile.address) : null,
        district: profile.district ? String(profile.district) : null,
        state: profile.state ? String(profile.state) : null,
        email: hospitalUser.email,
        phone: hospitalUser.mobile_no,
        status: 'ACTIVE',
        created_by: actorUserId,
        updated_by: actorUserId,
        is_deleted: false,
        version: 1,
      })
      .select('id, organization_id')
      .single<{ id: string; organization_id: string }>();

    if (createHospitalError || !createdHospital) {
      throw new BadRequestException(
        createHospitalError?.message ?? 'Unable to create the missing Hospital database profile.',
      );
    }

    const { error: linkError } = await this.supabase
      .from('users')
      .update({ hospital_id: createdHospital.id, updated_at: new Date().toISOString() })
      .eq('id', hospitalUser.id);
    if (linkError) throw linkError;

    return createdHospital;
  }

  private async requireReferenceValue(categoryCode: string, valueCode: string): Promise<string> {
    const { data, error } = await this.supabase
      .from('reference_values')
      .select('id, reference_categories!inner(code)')
      .eq('code', valueCode)
      .eq('reference_categories.code', categoryCode)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .is('deleted_at', null)
      .maybeSingle<{ id: string }>();

    if (error) throw error;
    if (!data?.id) {
      throw new NotFoundException(`Required active ${categoryCode} reference value ${valueCode} was not found.`);
    }
    return data.id;
  }

  async findAll(filter?: ClaimFilterDto) {
    let query = this.supabase
      .from('claims')
      .select('*')
      .eq('is_deleted', false);

    if (filter?.status) {
      query = query.eq('status', filter.status);
    }

    if (filter?.priority) {
      query = query.eq('priority', filter.priority);
    }

    if (filter?.patient_id) {
      query = query.eq('patient_id', filter.patient_id);
    }

    if (filter?.hospital_id) {
      query = query.eq('hospital_id', filter.hospital_id);
    }

    if (filter?.payer_id) {
      query = query.eq('payer_id', filter.payer_id);
    }

    const { data, error } = await query.order(
      'created_at',
      { ascending: false },
    );

    if (error) throw error;

    return data;
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .from('claims')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error || !data) {
      throw new NotFoundException('Claim not found');
    }

    return data;
  }

  async update(
    id: string,
    updateClaimDto: UpdateClaimDto,
  ) {
    const { data, error } = await this.supabase
      .from('claims')
      .update({
        ...updateClaimDto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException('Claim not found');
    }

    return data;
  }

  async remove(id: string) {
    const { error } = await this.supabase
      .from('claims')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw error;
    }

    return {
      message: 'Claim deleted successfully',
    };
  }
}
