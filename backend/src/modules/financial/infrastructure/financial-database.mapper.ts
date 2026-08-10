import {
  FinancialRemittanceBatch,
  FinancialRemittanceBatchProps,
  FinancialRemittanceEvidence,
  FinancialRemittanceLineItem,
} from '../domain/financial-remittance-batch.aggregate';
import {
  FinancialClaimSettlement,
  FinancialClaimSettlementProps,
  FinancialSettlementDeduction,
} from '../domain/financial-claim-settlement.aggregate';
import { FinancialRecovery, FinancialRecoveryProps } from '../domain/financial-recovery.aggregate';
import { FinancialPosting, FinancialPostingProps } from '../domain/financial-posting';

export interface FinancialRemittanceBatchPersistenceRow {
  financial_remittance_batch_id: string; organization_id: string; hospital_id: string; insurance_partner_id: string;
  claim_product_reference_value_id: string; remittance_source_type_reference_value_id: string; remittance_status_reference_value_id: string;
  remittance_reference: string; currency_code: string; gross_amount: number | string; net_amount: number | string;
  created_by: string; updated_by: string; version: number; deleted_at: string | null;
}
export interface FinancialRemittanceLineItemPersistenceRow {
  financial_remittance_line_item_id: string; financial_remittance_batch_id: string; organization_id: string; hospital_id: string;
  line_reference: string; line_status_reference_value_id: string; gross_amount: number | string; deduction_amount: number | string;
  net_amount: number | string; currency_code: string; version: number; deleted_at: string | null;
}
export interface FinancialRemittanceEvidencePersistenceRow {
  financial_remittance_evidence_id: string; financial_remittance_batch_id: string; organization_id: string; hospital_id: string;
  storage_object_reference: string; file_name: string; version: number; deleted_at: string | null;
}
export interface FinancialClaimSettlementPersistenceRow {
  financial_claim_settlement_id: string; organization_id: string; hospital_id: string; claim_id: string; insurance_partner_id: string;
  claim_product_reference_value_id: string; settlement_status_reference_value_id: string; settlement_reference: string; currency_code: string;
  gross_payer_paid_amount: number | string; tds_amount: number | string; payer_deduction_amount: number | string;
  other_payer_adjustment_amount: number | string; net_payer_settlement_amount: number | string;
  patient_responsibility_amount: number | string; hospital_write_off_amount: number | string;
  created_by: string; updated_by: string; version: number; deleted_at: string | null;
}
export interface FinancialSettlementDeductionPersistenceRow {
  financial_settlement_deduction_id: string; financial_claim_settlement_id: string; organization_id: string; hospital_id: string;
  deduction_type_reference_value_id: string; amount: number | string; currency_code: string; version: number; deleted_at: string | null;
}
export interface FinancialRecoveryPersistenceRow {
  financial_recovery_id: string; organization_id: string; hospital_id: string; claim_id: string; insurance_partner_id: string;
  claim_product_reference_value_id: string; recovery_type_reference_value_id: string; recovery_status_reference_value_id: string;
  recovery_reference: string; currency_code: string; original_amount: number | string; recovered_amount: number | string;
  outstanding_amount: number | string; created_by: string; updated_by: string; version: number; deleted_at: string | null;
}
export interface FinancialPostingPersistenceRow {
  financial_posting_id: string; organization_id: string; hospital_id: string; claim_product_reference_value_id: string;
  posting_type_reference_value_id: string; posting_reference: string; posting_sequence: number; currency_code: string;
  debit_account_code: string; credit_account_code: string; amount: number | string; created_by: string; updated_by: string; version: number;
}

const amount = (value: number | string): number => Number(value);
const date = (value: string | null): Date | null => (value ? new Date(value) : null);

/** Converts only tenant-scoped database rows into Phase 9 domain models. */
export class FinancialDatabaseMapper {
  static toRemittanceBatch(root: FinancialRemittanceBatchPersistenceRow, lines: FinancialRemittanceLineItemPersistenceRow[] = [], evidence: FinancialRemittanceEvidencePersistenceRow[] = []): FinancialRemittanceBatch {
    const props: FinancialRemittanceBatchProps = {
      financialRemittanceBatchId: root.financial_remittance_batch_id, organizationId: root.organization_id, hospitalId: root.hospital_id,
      insurancePartnerId: root.insurance_partner_id, claimProductReferenceValueId: root.claim_product_reference_value_id,
      remittanceSourceTypeReferenceValueId: root.remittance_source_type_reference_value_id, remittanceStatusReferenceValueId: root.remittance_status_reference_value_id,
      remittanceReference: root.remittance_reference, currencyCode: root.currency_code, grossAmount: amount(root.gross_amount), netAmount: amount(root.net_amount),
      createdBy: root.created_by, updatedBy: root.updated_by, version: root.version, deletedAt: date(root.deleted_at),
    };
    return FinancialRemittanceBatch.rehydrate(props, lines.map(this.toRemittanceLineItem), evidence.map(this.toRemittanceEvidence));
  }

  static toRemittanceLineItem(row: FinancialRemittanceLineItemPersistenceRow): FinancialRemittanceLineItem {
    return { financialRemittanceLineItemId: row.financial_remittance_line_item_id, financialRemittanceBatchId: row.financial_remittance_batch_id,
      organizationId: row.organization_id, hospitalId: row.hospital_id, lineReference: row.line_reference,
      lineStatusReferenceValueId: row.line_status_reference_value_id, grossAmount: amount(row.gross_amount), deductionAmount: amount(row.deduction_amount),
      netAmount: amount(row.net_amount), currencyCode: row.currency_code, version: row.version, deletedAt: date(row.deleted_at) };
  }

  static toRemittanceEvidence(row: FinancialRemittanceEvidencePersistenceRow): FinancialRemittanceEvidence {
    return { financialRemittanceEvidenceId: row.financial_remittance_evidence_id, financialRemittanceBatchId: row.financial_remittance_batch_id,
      organizationId: row.organization_id, hospitalId: row.hospital_id, storageObjectReference: row.storage_object_reference,
      fileName: row.file_name, version: row.version, deletedAt: date(row.deleted_at) };
  }

  static toClaimSettlement(root: FinancialClaimSettlementPersistenceRow, deductions: FinancialSettlementDeductionPersistenceRow[] = []): FinancialClaimSettlement {
    const props: FinancialClaimSettlementProps = {
      financialClaimSettlementId: root.financial_claim_settlement_id, organizationId: root.organization_id, hospitalId: root.hospital_id,
      claimId: root.claim_id, insurancePartnerId: root.insurance_partner_id, claimProductReferenceValueId: root.claim_product_reference_value_id,
      settlementStatusReferenceValueId: root.settlement_status_reference_value_id, settlementReference: root.settlement_reference, currencyCode: root.currency_code,
      grossPayerPaidAmount: amount(root.gross_payer_paid_amount), tdsAmount: amount(root.tds_amount), payerDeductionAmount: amount(root.payer_deduction_amount),
      otherPayerAdjustmentAmount: amount(root.other_payer_adjustment_amount), netPayerSettlementAmount: amount(root.net_payer_settlement_amount),
      patientResponsibilityAmount: amount(root.patient_responsibility_amount), hospitalWriteOffAmount: amount(root.hospital_write_off_amount),
      createdBy: root.created_by, updatedBy: root.updated_by, version: root.version, deletedAt: date(root.deleted_at),
    };
    return FinancialClaimSettlement.rehydrate(props, deductions.map(this.toSettlementDeduction));
  }

  static toSettlementDeduction(row: FinancialSettlementDeductionPersistenceRow): FinancialSettlementDeduction {
    return { financialSettlementDeductionId: row.financial_settlement_deduction_id, financialClaimSettlementId: row.financial_claim_settlement_id,
      organizationId: row.organization_id, hospitalId: row.hospital_id, deductionTypeReferenceValueId: row.deduction_type_reference_value_id,
      amount: amount(row.amount), currencyCode: row.currency_code, version: row.version, deletedAt: date(row.deleted_at) };
  }

  static toRecovery(row: FinancialRecoveryPersistenceRow): FinancialRecovery {
    const props: FinancialRecoveryProps = { financialRecoveryId: row.financial_recovery_id, organizationId: row.organization_id, hospitalId: row.hospital_id,
      claimId: row.claim_id, insurancePartnerId: row.insurance_partner_id, claimProductReferenceValueId: row.claim_product_reference_value_id,
      recoveryTypeReferenceValueId: row.recovery_type_reference_value_id, recoveryStatusReferenceValueId: row.recovery_status_reference_value_id,
      recoveryReference: row.recovery_reference, currencyCode: row.currency_code, originalAmount: amount(row.original_amount),
      recoveredAmount: amount(row.recovered_amount), outstandingAmount: amount(row.outstanding_amount), createdBy: row.created_by,
      updatedBy: row.updated_by, version: row.version, deletedAt: date(row.deleted_at) };
    return FinancialRecovery.rehydrate(props);
  }

  static toPosting(row: FinancialPostingPersistenceRow): FinancialPosting {
    const props: FinancialPostingProps = { financialPostingId: row.financial_posting_id, organizationId: row.organization_id, hospitalId: row.hospital_id,
      claimProductReferenceValueId: row.claim_product_reference_value_id, postingTypeReferenceValueId: row.posting_type_reference_value_id,
      postingReference: row.posting_reference, postingSequence: row.posting_sequence, currencyCode: row.currency_code,
      debitAccountCode: row.debit_account_code, creditAccountCode: row.credit_account_code, amount: amount(row.amount),
      createdBy: row.created_by, updatedBy: row.updated_by, version: row.version };
    return FinancialPosting.create(props);
  }
}
