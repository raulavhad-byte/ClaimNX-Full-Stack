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

  async create(createClaimDto: CreateClaimDto) {
    const { data, error } = await this.supabase
      .from('claims')
      .insert(createClaimDto)
      .select()
      .single();

    if (error) throw error;

    return data;
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