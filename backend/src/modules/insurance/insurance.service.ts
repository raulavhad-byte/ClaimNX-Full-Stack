import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../../database/database.service';
import { CreateInsuranceDto } from './dto/create-insurance.dto';
import { UpdateInsuranceDto } from './dto/update-insurance.dto';
import { InsuranceFilterDto } from './dto/insurance-filter.dto';

@Injectable()
export class InsuranceService {
  constructor(private readonly database: DatabaseService) {}

  async findAll(filter: InsuranceFilterDto) {
    const supabase = this.database.getClient();

    let query = supabase
      .from('insurance_entities')
      .select('*')
      .order('name', { ascending: true });

    if (filter.name) {
      query = query.ilike('name', `%${filter.name}%`);
    }

    if (filter.type) {
      query = query.eq('type', filter.type);
    }

    if (filter.on_panel !== undefined) {
      query = query.eq('on_panel', filter.on_panel === 'true');
    }

    if (filter.rpa_supported !== undefined) {
      query = query.eq(
        'rpa_supported',
        filter.rpa_supported === 'true',
      );
    }

    if (filter.auto_email_enabled !== undefined) {
      query = query.eq(
        'auto_email_enabled',
        filter.auto_email_enabled === 'true',
      );
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data;
  }

  async findOne(id: string) {
    const supabase = this.database.getClient();

    const { data, error } = await supabase
      .from('insurance_entities')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async create(dto: CreateInsuranceDto, actorUserId: string) {
    const supabase = this.database.getClient();

    const partnerTypeCode = dto.type === 'TPA' ? 'TPA' : 'INSURER';
    const [partnerTypeReferenceValueId, operationalStatusReferenceValueId] =
      await Promise.all([
        this.findReferenceValueId('INSURANCE_PARTNER_TYPE', partnerTypeCode),
        this.findReferenceValueId('INSURANCE_PARTNER_STATUS', 'ACTIVE'),
      ]);

    const partnerCodePrefix = dto.name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 36) || 'PARTNER';
    const partnerCode = `${partnerCodePrefix}_${randomUUID().slice(0, 8)}`;

    const { data, error } = await supabase
      .from('insurance_entities')
      .insert({
        ...dto,
        partner_code: partnerCode,
        display_name: dto.name.trim(),
        partner_type_reference_value_id: partnerTypeReferenceValueId,
        operational_status_reference_value_id: operationalStatusReferenceValueId,
        created_by: actorUserId,
        updated_by: actorUserId,
        is_deleted: false,
        version: 1,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  private async findReferenceValueId(categoryCode: string, valueCode: string): Promise<string> {
    const { data, error } = await this.database
      .getClient()
      .from('reference_values')
      .select('id, reference_categories!inner(code)')
      .eq('reference_categories.code', categoryCode)
      .eq('code', valueCode)
      .is('organization_id', null)
      .eq('is_active', true)
      .is('deleted_at', null)
      .eq('is_deleted', false)
      .maybeSingle<{ id: string }>();

    if (error || !data) {
      throw new Error(
        `Required insurance reference value ${categoryCode}/${valueCode} is unavailable.`,
      );
    }

    return data.id;
  }

  async update(id: string, dto: UpdateInsuranceDto) {
    const supabase = this.database.getClient();

    const { data, error } = await supabase
      .from('insurance_entities')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async remove(id: string) {
    const supabase = this.database.getClient();

    const { error } = await supabase
      .from('insurance_entities')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return {
      message: 'Insurance deleted successfully',
    };
  }
}
