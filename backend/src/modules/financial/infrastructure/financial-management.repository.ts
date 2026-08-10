import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';
import { FinancialClaimSettlement } from '../domain/financial-claim-settlement.aggregate';
import { FinancialRecovery } from '../domain/financial-recovery.aggregate';
import { FinancialRemittanceBatch } from '../domain/financial-remittance-batch.aggregate';
import { FinancialPosting } from '../domain/financial-posting';
import {
  FinancialClaimSettlementPersistenceRow,
  FinancialDatabaseMapper,
  FinancialPostingPersistenceRow,
  FinancialRecoveryPersistenceRow,
  FinancialRemittanceBatchPersistenceRow,
  FinancialRemittanceEvidencePersistenceRow,
  FinancialRemittanceLineItemPersistenceRow,
  FinancialSettlementDeductionPersistenceRow,
} from './financial-database.mapper';

/**
 * Financial persistence boundary. Every read and command carries Organization
 * and Hospital scope; all mutations go through reviewed database functions.
 */
@Injectable()
export class FinancialManagementRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findActiveRemittanceBatchById(organizationId: string, hospitalId: string, batchId: string): Promise<FinancialRemittanceBatch | null> {
    const client = this.databaseService.getClient();
    const { data: root, error } = await client.from('financial_remittance_batch')
      .select('financial_remittance_batch_id, organization_id, hospital_id, insurance_partner_id, claim_product_reference_value_id, remittance_source_type_reference_value_id, remittance_status_reference_value_id, remittance_reference, currency_code, gross_amount, net_amount, created_by, updated_by, version, deleted_at')
      .eq('financial_remittance_batch_id', batchId).eq('organization_id', organizationId).eq('hospital_id', hospitalId).is('deleted_at', null)
      .maybeSingle<FinancialRemittanceBatchPersistenceRow>();
    if (error) throw error;
    if (!root) return null;
    const [lines, evidence] = await Promise.all([
      this.listActiveRemittanceLines(organizationId, hospitalId, batchId),
      this.listActiveRemittanceEvidence(organizationId, hospitalId, batchId),
    ]);
    return FinancialDatabaseMapper.toRemittanceBatch(root, lines, evidence);
  }

  async listActiveSettlementsByClaim(organizationId: string, hospitalId: string, claimId: string): Promise<FinancialClaimSettlement[]> {
    const { data, error } = await this.databaseService.getClient().from('financial_claim_settlement')
      .select('financial_claim_settlement_id, organization_id, hospital_id, claim_id, insurance_partner_id, claim_product_reference_value_id, settlement_status_reference_value_id, settlement_reference, currency_code, gross_payer_paid_amount, tds_amount, payer_deduction_amount, other_payer_adjustment_amount, net_payer_settlement_amount, patient_responsibility_amount, hospital_write_off_amount, created_by, updated_by, version, deleted_at')
      .eq('organization_id', organizationId).eq('hospital_id', hospitalId).eq('claim_id', claimId).is('deleted_at', null)
      .order('settled_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => FinancialDatabaseMapper.toClaimSettlement(row as FinancialClaimSettlementPersistenceRow));
  }

  async findActiveSettlementById(organizationId: string, hospitalId: string, settlementId: string): Promise<FinancialClaimSettlement | null> {
    const { data, error } = await this.databaseService.getClient().from('financial_claim_settlement')
      .select('financial_claim_settlement_id, organization_id, hospital_id, claim_id, insurance_partner_id, claim_product_reference_value_id, settlement_status_reference_value_id, settlement_reference, currency_code, gross_payer_paid_amount, tds_amount, payer_deduction_amount, other_payer_adjustment_amount, net_payer_settlement_amount, patient_responsibility_amount, hospital_write_off_amount, created_by, updated_by, version, deleted_at')
      .eq('financial_claim_settlement_id', settlementId).eq('organization_id', organizationId).eq('hospital_id', hospitalId).is('deleted_at', null)
      .maybeSingle<FinancialClaimSettlementPersistenceRow>();
    if (error) throw error;
    return data ? FinancialDatabaseMapper.toClaimSettlement(data) : null;
  }

  async findActiveRecoveryById(organizationId: string, hospitalId: string, recoveryId: string): Promise<FinancialRecovery | null> {
    const { data, error } = await this.databaseService.getClient().from('financial_recovery')
      .select('financial_recovery_id, organization_id, hospital_id, claim_id, insurance_partner_id, claim_product_reference_value_id, recovery_type_reference_value_id, recovery_status_reference_value_id, recovery_reference, currency_code, original_amount, recovered_amount, outstanding_amount, created_by, updated_by, version, deleted_at')
      .eq('financial_recovery_id', recoveryId).eq('organization_id', organizationId).eq('hospital_id', hospitalId).is('deleted_at', null)
      .maybeSingle<FinancialRecoveryPersistenceRow>();
    if (error) throw error;
    return data ? FinancialDatabaseMapper.toRecovery(data) : null;
  }

  async listPostingsByClaim(organizationId: string, hospitalId: string, claimId: string): Promise<FinancialPosting[]> {
    const { data, error } = await this.databaseService.getClient().from('financial_posting')
      .select('financial_posting_id, organization_id, hospital_id, claim_product_reference_value_id, posting_type_reference_value_id, posting_reference, posting_sequence, currency_code, debit_account_code, credit_account_code, amount, created_by, updated_by, version')
      .eq('organization_id', organizationId).eq('hospital_id', hospitalId).eq('claim_id', claimId).order('posted_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row) => FinancialDatabaseMapper.toPosting(row as FinancialPostingPersistenceRow));
  }

  async createRemittanceBatch(input: Record<string, unknown>): Promise<string> { return this.executeCommand('create_financial_remittance_batch', input); }
  async createRemittanceLineItem(input: Record<string, unknown>): Promise<string> { return this.executeCommand('create_financial_remittance_line_item', input); }
  async createRemittanceEvidence(input: Record<string, unknown>): Promise<string> { return this.executeCommand('create_financial_remittance_evidence', input); }
  async createClaimSettlement(input: Record<string, unknown>): Promise<string> { return this.executeCommand('create_financial_claim_settlement', input); }
  async createSettlementDeduction(input: Record<string, unknown>): Promise<string> { return this.executeCommand('create_financial_settlement_deduction', input); }
  async createRecovery(input: Record<string, unknown>): Promise<string> { return this.executeCommand('create_financial_recovery', input); }
  async createPosting(input: Record<string, unknown>): Promise<string> { return this.executeCommand('create_financial_posting', input); }
  async createBankStatementLine(input: Record<string, unknown>): Promise<string> { return this.executeCommand('create_financial_bank_statement_line', input); }
  async createBankMatch(input: Record<string, unknown>): Promise<string> { return this.executeCommand('create_financial_bank_match', input); }

  private async executeCommand(functionName: string, input: Record<string, unknown>): Promise<string> {
    const { data, error } = await this.databaseService.getClient().rpc(functionName, input);
    if (error) throw error;
    return data as string;
  }

  private async listActiveRemittanceLines(organizationId: string, hospitalId: string, batchId: string): Promise<FinancialRemittanceLineItemPersistenceRow[]> {
    const { data, error } = await this.databaseService.getClient().from('financial_remittance_line_item')
      .select('financial_remittance_line_item_id, financial_remittance_batch_id, organization_id, hospital_id, line_reference, line_status_reference_value_id, gross_amount, deduction_amount, net_amount, currency_code, version, deleted_at')
      .eq('financial_remittance_batch_id', batchId).eq('organization_id', organizationId).eq('hospital_id', hospitalId).is('deleted_at', null);
    if (error) throw error;
    return (data ?? []) as FinancialRemittanceLineItemPersistenceRow[];
  }

  private async listActiveRemittanceEvidence(organizationId: string, hospitalId: string, batchId: string): Promise<FinancialRemittanceEvidencePersistenceRow[]> {
    const { data, error } = await this.databaseService.getClient().from('financial_remittance_evidence')
      .select('financial_remittance_evidence_id, financial_remittance_batch_id, organization_id, hospital_id, storage_object_reference, file_name, version, deleted_at')
      .eq('financial_remittance_batch_id', batchId).eq('organization_id', organizationId).eq('hospital_id', hospitalId).is('deleted_at', null);
    if (error) throw error;
    return (data ?? []) as FinancialRemittanceEvidencePersistenceRow[];
  }
}
