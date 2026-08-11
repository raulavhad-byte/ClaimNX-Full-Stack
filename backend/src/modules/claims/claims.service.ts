import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

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
    const hospital = await this.requireHospitalContext(createClaimDto.hospital_id);
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

  private async requireHospitalContext(hospitalId: string): Promise<{ organization_id: string }> {
    const { data, error } = await this.supabase
      .from('hospitals')
      .select('organization_id')
      .eq('id', hospitalId)
      .eq('is_deleted', false)
      .maybeSingle<{ organization_id: string }>();

    if (error) throw error;
    if (!data?.organization_id) {
      throw new NotFoundException('The selected hospital does not have an active organization assignment.');
    }
    return data;
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
