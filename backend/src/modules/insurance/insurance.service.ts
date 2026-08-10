import { Injectable } from '@nestjs/common';
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

  async create(dto: CreateInsuranceDto) {
    const supabase = this.database.getClient();

    console.log('====================================');
    console.log('Insurance CREATE request');
    console.log('Incoming DTO:', dto);

    const { data, error } = await supabase
      .from('insurance_entities')
      .insert(dto)
      .select()
      .single();

    console.log('Inserted Data:', data);
    console.log('Supabase Error:', error);
    console.log('====================================');

    if (error) {
      throw error;
    }

    return data;
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