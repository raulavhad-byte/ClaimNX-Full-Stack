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
      // Master data in earlier environments uses ICA for the cashless CPC
      // workflow and CASHLESS_PREAUTH for its claim type. Accept both the
      // current and legacy codes, in priority order.
      this.requireReferenceValue('CLAIM_PRODUCT', ['CPC', 'ICA', 'CASHLESS']),
      this.requireReferenceValue('CLAIM_TYPE', ['CASHLESS', 'CASHLESS_PREAUTH']),
      this.requireReferenceValue('CLAIM_LIFECYCLE_STATUS', 'DRAFT'),
    ]);

    // Never trust a browser-generated case reference. Multiple hospitals and
    // concurrent browser sessions can otherwise produce the same value (for
    // example, "CPC-101"). The legacy case_ref_id is globally unique, while
    // claim_number is a readable organization-scoped number when the database
    // allocator is available.
    let lastError: any;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const caseReferenceId = `CASE-${randomUUID()}`;
      const claimNumber = await this.allocateClaimNumber(hospital.organization_id);
      const { data, error } = await this.supabase
        .from('claims')
        .insert({
          ...createClaimDto,
          case_ref_id: caseReferenceId,
          organization_id: hospital.organization_id,
          claim_number: claimNumber,
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

      if (!error) return data;
      lastError = error;
      // Retry only for the database's uniqueness check. All validation and
      // availability errors must remain visible to the caller immediately.
      if (error.code !== '23505') throw error;
    }

    throw lastError;
  }

  private async allocateClaimNumber(organizationId: string): Promise<string> {
    const { data, error } = await this.supabase.rpc('allocate_claim_number', {
      p_organization_id: organizationId,
    });

    if (!error && typeof data === 'string' && data.trim()) {
      return data;
    }

    // The UUID fallback keeps production claim creation collision-proof even
    // during a rolling deployment where an older database has not yet received
    // the allocator migration. It is also safe for any future tenant count.
    console.warn('Claim number allocator unavailable; using UUID fallback.', error?.message);
    return `CLM-${randomUUID()}`;
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

    // These are mandatory legacy columns in the hospitals table. Reuse the
    // configured default values rather than inserting null and failing after
    // the patient record has already been created.
    const { data: hospitalDefaults, error: defaultsError } = await this.supabase
      .from('hospitals')
      .select('hospital_type_reference_value_id, operational_status_reference_value_id')
      .eq('is_deleted', false)
      .not('hospital_type_reference_value_id', 'is', null)
      .not('operational_status_reference_value_id', 'is', null)
      .limit(1)
      .maybeSingle<{
        hospital_type_reference_value_id: string;
        operational_status_reference_value_id: string;
      }>();
    if (defaultsError) throw defaultsError;
    if (!hospitalDefaults) {
      throw new BadRequestException(
        'Hospital master configuration is incomplete. Configure a Hospital Type and Operational Status before onboarding hospitals.',
      );
    }

    const { data: createdHospital, error: createHospitalError } = await this.supabase
      .from('hospitals')
      .insert({
        organization_id: organizations[0].id,
        hospital_name: hospitalName,
        display_name: hospitalName,
        hospital_code: `HOSP-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`,
        hospital_type: 'General Hospital',
        hospital_type_reference_value_id: hospitalDefaults.hospital_type_reference_value_id,
        operational_status_reference_value_id: hospitalDefaults.operational_status_reference_value_id,
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

  private async requireReferenceValue(
    categoryCode: string,
    valueCodes: string | string[],
  ): Promise<string> {
    const candidates = Array.isArray(valueCodes) ? valueCodes : [valueCodes];
    for (const valueCode of candidates) {
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
      if (data?.id) return data.id;
    }

    throw new NotFoundException(
      `Required active ${categoryCode} reference value (${candidates.join(' or ')}) was not found.`,
    );
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
