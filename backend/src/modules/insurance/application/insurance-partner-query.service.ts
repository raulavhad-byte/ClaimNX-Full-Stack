import { Injectable } from '@nestjs/common';

import {
  InsurancePartnerListRecord,
  InsurancePartnerRepository,
} from '../infrastructure/insurance-partner.repository';
import { InsuranceAccessService } from './insurance-access.service';

export interface ListInsurancePartnersQuery {
  actorUserId: string;
  page: number;
  limit: number;
  search?: string;
  partnerTypeReferenceValueId?: string;
  operationalStatusReferenceValueId?: string;
  sortBy:
    | 'partner_code'
    | 'display_name'
    | 'legal_name'
    | 'created_at'
    | 'updated_at';
  sortOrder: 'asc' | 'desc';
}

export interface InsurancePartnerListItem {
  insurancePartnerId: string;
  partnerCode: string;
  displayName: string;
  legalName: string | null;
  partnerTypeReferenceValueId: string;
  operationalStatusReferenceValueId: string;
  registrationNumber: string | null;
  version: number;
}

export interface InsurancePartnerListPage {
  items: InsurancePartnerListItem[];
  page: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

@Injectable()
export class InsurancePartnerQueryService {
  constructor(
    private readonly partnerRepository: InsurancePartnerRepository,
    private readonly accessService: InsuranceAccessService,
  ) {}

  async list(
    input: ListInsurancePartnersQuery,
  ): Promise<InsurancePartnerListPage> {
    await this.accessService.assertActiveUser(input.actorUserId);

    const result = await this.partnerRepository.list({
      page: input.page,
      limit: input.limit,
      search: input.search,
      partnerTypeReferenceValueId:
        input.partnerTypeReferenceValueId,
      operationalStatusReferenceValueId:
        input.operationalStatusReferenceValueId,
      sortBy: input.sortBy,
      sortOrder: input.sortOrder,
    });

    const totalPages =
      result.totalRecords === 0
        ? 0
        : Math.ceil(result.totalRecords / input.limit);

    return {
      items: result.rows.map((row) => this.toListItem(row)),
      page: input.page,
      limit: input.limit,
      totalRecords: result.totalRecords,
      totalPages,
      hasNextPage: input.page < totalPages,
      hasPreviousPage: input.page > 1,
    };
  }

  private toListItem(
    row: InsurancePartnerListRecord,
  ): InsurancePartnerListItem {
    return {
      insurancePartnerId: row.id,
      partnerCode: row.partner_code,
      displayName: row.display_name,
      legalName: row.legal_name,
      partnerTypeReferenceValueId:
        row.partner_type_reference_value_id,
      operationalStatusReferenceValueId:
        row.operational_status_reference_value_id,
      registrationNumber: row.registration_number,
      version: row.version,
    };
  }
}