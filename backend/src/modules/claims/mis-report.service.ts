import { Injectable } from '@nestjs/common';

import { ClaimsService } from './claims.service';
import { MisReportQueryDto } from './dto/mis-report-query.dto';

type ReportValue = string | number;
type ReportClaim = Record<string, any>;
type TimelineEvent = Record<string, any>;

const STATUS = {
  PRE_AUTH_INITIATED: ['Pre Auth initiated', 'PRE_AUTH_INITIATED'],
  PRE_AUTH_APPROVED: ['Pre Auth Approved', 'PRE_AUTH_APPROVED'],
  INITIAL_QUERY_PENDING: ['Initial Query Pending', 'INITIAL_QUERY_PENDING'],
  DISCHARGE_INITIATED: ['Discharge Initiated', 'DISCHARGE_INITIATED'],
  DISCHARGE_APPROVED: ['Discharged Approved', 'Discharge Approved', 'DISCHARGE_APPROVED'],
  DISCHARGE_RECON_APPROVED: ['Discharge Reconsideration Approved', 'DISCHARGE_RECONSIDERATION_APPROVED'],
  DISCHARGE_QUERY: ['Discharge Query Raised', 'DISCHARGE_QUERY_RAISED'],
  FILE_DISPATCHED: ['File Dispatched', 'FILE_DISPATCHED'],
  PARTIAL_RECOVERABLE: ['Partially Claim Settled - Recoverable', 'PARTIAL_SETTLEMENT_RECOVERABLE'],
  PARTIAL_NON_RECOVERABLE: ['Partially Claim Settled - Non-Recoverable', 'PARTIAL_SETTLEMENT_NON_RECOVERABLE'],
  COMPLETE_SETTLEMENT: ['Complete Settlement', 'COMPLETE_SETTLEMENT', 'SETTLED'],
} as const;

@Injectable()
export class MisReportService {
  constructor(private readonly claimsService: ClaimsService) {}

  async generate(query: MisReportQueryDto, actorUserId: string) {
    const claims = (await this.claimsService.findAll(undefined, actorUserId)) as ReportClaim[];
    const start = new Date(`${query.start_date}T00:00:00.000Z`);
    const end = new Date(`${query.end_date}T23:59:59.999Z`);
    const filtered = claims.filter((claim) => {
      const created = new Date(claim.created_at ?? claim.createdAt);
      return Number.isFinite(created.getTime()) && created >= start && created <= end;
    });

    const report = this.buildReport(query.type, filtered);
    return {
      ...report,
      reportType: query.type,
      startDate: query.start_date,
      endDate: query.end_date,
      generatedAt: new Date().toISOString(),
      filename: `${query.type.replace(/\s+/g, '_')}_Report_${query.start_date}_to_${query.end_date}.xlsx`,
    };
  }

  private buildReport(type: MisReportQueryDto['type'], claims: ReportClaim[]) {
    if (type === 'Admission') return this.admissionReport(claims);
    if (type === 'Discharge') return this.dischargeReport(claims);
    if (type === 'Outstanding') return this.outstandingReport(claims);
    if (type === 'TAT') return this.tatReport(claims);
    return this.businessReport(
      type === 'File Dispatch Pending'
        ? claims.filter((claim) => this.matches(claim.status, STATUS.DISCHARGE_APPROVED))
        : claims,
    );
  }

  private businessReport(claims: ReportClaim[]) {
    const headers = [
      'Month', 'Final Bill Vs Final AL %', 'Final AL Vs Settlement %', 'Claim Settled (In Days)',
      'Settlement Pending TAT (In Days)', 'Ageing', 'Case ID', 'IPD number,', 'Hospital Name', 'Patient Name',
      'TPA Name', 'Insurer Name', 'UHID/TPA Card Number', 'Policy Number', 'Claim No.', 'Top Up Claim NO',
      'Corporate Name', 'Date of Admission', 'Date of Discharge', 'Treating Doctor', 'Diagnosis',
      'Package Expenses', 'Room Rent Expenses', 'Professional Expenses', 'Pharmacy Expenses',
      'Other Investigation Expenses', 'Diagnostics Other Amt', 'Total Bill Amt', 'Final Bill Date',
      'Final Approval Amt', 'Top Up Final Approval Amt', 'Total Final Approval Amt', 'MOU Discount',
      'Co-Payment', 'Non-Medical Expenses', 'Proportionate Expenses', 'Sub-Limit', 'Tariff Deductions',
      'Other Deductions', 'Total Amt', 'Paid by Patient Amt', 'Final Approved Deduction Reason',
      'File Dispatch Date', 'File Dispatch tracking Number', 'File Courier Company Name', 'Claim Status',
      'UTR Date', 'UTR NO', 'Net Settled (Bank Credit)', 'Total Settled Amount', 'TDS Deducted (Rs.)',
      'UTR Date 2', 'UTR NO 2', 'Net Settled (Bank Credit) 2', 'Total Settled Amount 2', 'TDS Deducted (Rs.) 2',
      'Partial Diff', 'Outstanding', 'Partial Payment Reason', 'Partial Payment Reason Comment',
      'Rejection remark', 'Pre Auth Approved TAT (HH:MM)', 'Final AL TAT (HH:MM)',
      'Pre-Auth Query Raised', 'Final AL Query Raised',
    ];

    return { headers, rows: claims.map((claim) => this.businessRow(claim)) };
  }

  private businessRow(claim: ReportClaim): ReportValue[] {
    const fd = this.formData(claim);
    const history = this.history(claim);
    const disDate = fd.dis_date || fd.adm_exp_discharge || claim.discharge_date;
    const finalBill = this.amount(fd.dis_total_bill);
    const finalApproval = this.amount(fd.fin_app_amt);
    const topUpApproval = this.amount(fd.topup_app_amt);
    const totalFinalApproval = finalApproval + topUpApproval;
    const settlements = this.settlementTransactions(claim);
    const first = settlements[0] ?? {};
    const second = settlements[1] ?? {};
    const totalSettled = settlements.reduce((sum, transaction) => sum + this.amount(transaction.set_incl_tds), 0);
    const outstanding = Math.max(totalFinalApproval - totalSettled, 0);
    const partialDiff = Math.max(totalFinalApproval - totalSettled, 0);
    const completed = this.isCompleteSettlement(claim.status);
    const settlementDate = second.settlement_date || first.settlement_date || fd.settlement_date;
    const days = disDate ? this.diffDays(disDate, completed ? settlementDate : new Date().toISOString()) : '';
    const preAuthInit = this.event(history, STATUS.PRE_AUTH_INITIATED);
    const preAuthApproved = this.event(history, STATUS.PRE_AUTH_APPROVED);
    const dischargeInit = this.event(history, STATUS.DISCHARGE_INITIATED);
    const dischargeApproved = this.event(history, [...STATUS.DISCHARGE_APPROVED, ...STATUS.DISCHARGE_RECON_APPROVED]);
    const dispatch = this.event(history, STATUS.FILE_DISPATCHED);
    const rejection = history.find((event) => /reject/i.test(String(event.status ?? '')));

    return [
      this.month(disDate), this.percent(finalApproval, finalBill), this.percent(totalSettled, totalFinalApproval),
      completed ? days : '', completed ? '' : days, completed ? 'NA' : this.ageing(Number(days)),
      claim.claim_number || claim.case_ref_id || '', fd.p_uhid || '', claim.hospital_name || fd.hosp_name || '',
      fd.p_name || fd.patient_name || '', fd.tpa_provider || '', fd.insurance_company || '', fd.p_card_id || '',
      fd.p_policy_no || '', fd.insurer_claim_no || '', fd.topup_claim_id || '', fd.p_employee_id || '',
      this.date(claim.admission_date), this.date(disDate), fd.dr_name || '', claim.diagnosis || fd.diagnosis || '',
      fd.dis_pkg_exp || '', fd.dis_room_rent || '', fd.dis_prof_exp || '', fd.dis_pharm_exp || '',
      fd.dis_inv_exp || '', fd.dis_diag_other || '', finalBill || '', this.date(disDate), finalApproval || '',
      topUpApproval || '', totalFinalApproval || '', fd.fin_mou_disc || '', fd.fin_copay || '', fd.fin_non_med || '',
      fd.fin_prop_exp || '', fd.fin_sub_limit || '', fd.fin_tariff_ded || '', fd.fin_other_ded || '',
      fd.fin_total_amt || '', fd.fin_patient_paid || '', fd.deduction_comment || '', this.date(dispatch?.date),
      fd.tracking_no || '', fd.courier_name || '', this.statusLabel(claim.status),
      this.date(first.utr_date || first.settlement_date), first.utr_number || '', first.set_net_settled || '',
      first.set_incl_tds || '', first.set_tds || '', this.date(second.utr_date || second.settlement_date),
      second.utr_number || '', second.set_net_settled || '', second.set_incl_tds || '', second.set_tds || '',
      partialDiff || '', outstanding, fd.partial_remark_type || first.partial_remark_type || '',
      fd.partial_remark_other_comment || first.partial_remark_other_comment || '', rejection?.comment || '',
      this.tat(preAuthInit?.date, preAuthApproved?.date), this.tat(dischargeInit?.date, dischargeApproved?.date),
      this.count(history, STATUS.INITIAL_QUERY_PENDING), this.count(history, STATUS.DISCHARGE_QUERY),
    ];
  }

  private admissionReport(claims: ReportClaim[]) {
    const headers = [
      'Month ( Formula as per the admission date)', 'Case ID', 'IPD number,', 'Hospital Name', 'Patient Name',
      'TPA Name', 'Insurer Name', 'UHID/TPA Card Number', 'Policy Number', 'Claim No.', 'Corporate Name',
      'Date of Admission', 'Date of Discharge', 'Treating Doctor', 'Diagnosis', 'Claim Status',
    ];
    const rows = claims.map((claim) => {
      const fd = this.formData(claim);
      return [this.month(claim.admission_date), claim.claim_number || claim.case_ref_id || '', fd.p_uhid || '',
        claim.hospital_name || fd.hosp_name || '', fd.p_name || fd.patient_name || '', fd.tpa_provider || '',
        fd.insurance_company || '', fd.p_card_id || '', fd.p_policy_no || '', fd.insurer_claim_no || '',
        fd.p_employee_id || '', this.date(claim.admission_date), this.date(fd.dis_date || claim.discharge_date),
        fd.dr_name || '', claim.diagnosis || '', this.statusLabel(claim.status)];
    });
    return { headers, rows };
  }

  private dischargeReport(claims: ReportClaim[]) {
    const business = this.businessReport(claims);
    const wanted = [
      'Month', 'Final Bill Vs Final AL %', 'Case ID', 'IPD number,', 'Hospital Name', 'Patient Name', 'TPA Name',
      'Insurer Name', 'UHID/TPA Card Number', 'Policy Number', 'Claim No.', 'Top Up Claim NO', 'Corporate Name',
      'Date of Admission', 'Date of Discharge', 'Treating Doctor', 'Diagnosis', 'Package Expenses',
      'Room Rent Expenses', 'Professional Expenses', 'Pharmacy Expenses', 'Other Investigation Expenses',
      'Diagnostics Other Amt', 'Total Bill Amt', 'Final Bill Date', 'Final Approval Amt',
      'Top Up Final Approval Amt', 'Total Final Approval Amt', 'MOU Discount', 'Co-Payment', 'Non-Medical Expenses',
      'Proportionate Expenses', 'Sub-Limit', 'Tariff Deductions', 'Other Deductions', 'Total Amt',
      'Paid by Patient Amt', 'Final Approved Deduction Reason', 'File Dispatch Date',
      'File Dispatch tracking Number', 'File Courier Company Name', 'Claim Status',
      'Pre Auth Approved TAT (HH:MM)', 'Final AL TAT (HH:MM)', 'Pre-Auth Query Raised', 'Final AL Query Raised',
    ];
    const report = this.selectColumns(business, wanted);
    report.headers[0] = 'Month (Formula as per Discharge date)';
    return report;
  }

  private outstandingReport(claims: ReportClaim[]) {
    const business = this.businessReport(claims.filter((claim) => !this.isCompleteSettlement(claim.status)));
    const wanted = [
      'Month', 'Settlement Pending TAT (In Days)', 'Ageing', 'Case ID', 'IPD number,', 'Hospital Name',
      'Patient Name', 'TPA Name', 'Insurer Name', 'UHID/TPA Card Number', 'Policy Number', 'Claim No.',
      'Top Up Claim NO', 'Corporate Name', 'Date of Admission', 'Date of Discharge', 'Treating Doctor',
      'Diagnosis', 'Total Bill Amt', 'Final Approval Amt', 'Top Up Final Approval Amt', 'Total Final Approval Amt',
      'File Dispatch Date', 'File Dispatch tracking Number', 'File Courier Company Name', 'Claim Status', 'Outstanding',
    ];
    const report = this.selectColumns(business, wanted);
    report.headers[0] = 'Month (As per discharge date)';
    return report;
  }

  private tatReport(claims: ReportClaim[]) {
    const headers = [
      'Month (As per discharge date)', 'Case ID', 'IPD number', 'Hospital Name', 'Patient Name', 'TPA Name',
      'Insurer Name', 'Pre Auth initiated Date', 'Pre Auth initiated Time', 'Pre auth Approved Date',
      'Pre auth Approved Time', 'Pre auth Approved TAT (Formula =pre auth approved time - pre auth initiated time. If it exceeds 24 hrs then final TAT would be 24 Hrs. do not exceed 24 hrs.', 'Discharge Initiated Date',
      'Discharge Initiated Time', 'Discharge Approved Date', 'Discharge Approved Time',
      'Discharge Approved TAT. (TAT Formula would be =Discharged Approved time – Discharged Initiated time. If it exceeds 24 hrs then final TAT would be 24 Hrs. do not exceed 24 hrs.',
      'File Dispatched TAT. (TAT Formula would be =File Dispatched Date – Discharge Date), TAT should in days.',
      'Settlement TAT. (TAT Formula would be =UTR Date - File Dispatched Date), TAT should in days.',
    ];
    const rows = claims.map((claim) => {
      const fd = this.formData(claim);
      const history = this.history(claim);
      const dischargeDate = fd.dis_date || claim.discharge_date;
      const preInit = this.event(history, STATUS.PRE_AUTH_INITIATED);
      const preApproved = this.event(history, STATUS.PRE_AUTH_APPROVED);
      const disInit = this.event(history, STATUS.DISCHARGE_INITIATED);
      const disApproved = this.event(history, [...STATUS.DISCHARGE_APPROVED, ...STATUS.DISCHARGE_RECON_APPROVED]);
      const dispatch = this.event(history, STATUS.FILE_DISPATCHED);
      const settlements = this.settlementTransactions(claim);
      const finalSettlement = settlements[settlements.length - 1];
      return [
        this.month(dischargeDate), claim.claim_number || claim.case_ref_id || '', fd.p_uhid || '',
        claim.hospital_name || fd.hosp_name || '', fd.p_name || '', fd.tpa_provider || '', fd.insurance_company || '',
        this.date(preInit?.date), this.time(preInit?.date), this.date(preApproved?.date), this.time(preApproved?.date),
        this.tat(preInit?.date, preApproved?.date), this.date(disInit?.date), this.time(disInit?.date),
        this.date(disApproved?.date), this.time(disApproved?.date), this.tat(disInit?.date, disApproved?.date),
        this.diffDays(dischargeDate, dispatch?.date), this.diffDays(dispatch?.date, finalSettlement?.utr_date || finalSettlement?.settlement_date),
      ];
    });
    return { headers, rows };
  }

  private settlementTransactions(claim: ReportClaim): Record<string, any>[] {
    const historyTransactions = this.history(claim)
      .filter((event) => this.isSettlementStatus(event.status))
      .map((event) => ({ ...(event.stageData ?? event.stage_data ?? {}), eventDate: event.date }))
      .filter((data) => data.utr_number || data.set_incl_tds || data.set_net_settled || data.set_tds)
      .sort((left, right) => new Date(left.utr_date || left.settlement_date || left.eventDate).getTime() - new Date(right.utr_date || right.settlement_date || right.eventDate).getTime());
    if (historyTransactions.length) return historyTransactions;
    const fd = this.formData(claim);
    return fd.utr_number || fd.set_incl_tds ? [fd] : [];
  }

  private selectColumns(report: { headers: string[]; rows: ReportValue[][] }, wanted: string[]) {
    const indices = wanted.map((header) => report.headers.indexOf(header));
    return { headers: wanted, rows: report.rows.map((row) => indices.map((index) => row[index] ?? '')) };
  }

  private formData(claim: ReportClaim) { return claim.form_data ?? claim.formData ?? {}; }
  private history(claim: ReportClaim): TimelineEvent[] {
    const history = claim.history ?? this.formData(claim).history;
    return Array.isArray(history) ? history : [];
  }
  private matches(value: unknown, values: readonly string[]) { return values.includes(String(value) as never); }
  private event(history: TimelineEvent[], statuses: readonly string[]) {
    return [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .find((event) => this.matches(event.status, statuses));
  }
  private count(history: TimelineEvent[], statuses: readonly string[]) {
    return history.filter((event) => this.matches(event.status, statuses)).length;
  }
  private isSettlementStatus(status: unknown) {
    return this.matches(status, [...STATUS.PARTIAL_RECOVERABLE, ...STATUS.PARTIAL_NON_RECOVERABLE, ...STATUS.COMPLETE_SETTLEMENT]);
  }
  private isCompleteSettlement(status: unknown) {
    return this.matches(status, [...STATUS.COMPLETE_SETTLEMENT, ...STATUS.PARTIAL_NON_RECOVERABLE]);
  }
  private statusLabel(status: unknown) {
    const map: Record<string, string> = { DISCHARGE_APPROVED: 'Discharged Approved', COMPLETE_SETTLEMENT: 'Complete Settlement', PARTIAL_SETTLEMENT_RECOVERABLE: 'Partially Claim Settled - Recoverable', PARTIAL_SETTLEMENT_NON_RECOVERABLE: 'Partially Claim Settled - Non-Recoverable' };
    return map[String(status)] ?? String(status ?? '');
  }
  private amount(value: unknown) {
    const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  private percent(numerator: number, denominator: number) {
    return numerator > 0 && denominator > 0 ? `${((numerator / denominator) * 100).toFixed(2)}%` : '';
  }
  private date(value: unknown) {
    if (!value) return '';
    const date = new Date(String(value));
    return Number.isFinite(date.getTime()) ? `${String(date.getUTCDate()).padStart(2, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${date.getUTCFullYear()}` : '';
  }
  private time(value: unknown) {
    if (!value) return '';
    const date = new Date(String(value));
    return Number.isFinite(date.getTime()) ? `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` : '';
  }
  private month(value: unknown) {
    if (!value) return '';
    const date = new Date(String(value));
    return Number.isFinite(date.getTime()) ? date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' }).replace(' ', '-') : '';
  }
  private diffDays(start: unknown, end: unknown): string {
    if (!start || !end) return '';
    const difference = new Date(String(end)).getTime() - new Date(String(start)).getTime();
    return Number.isFinite(difference) && difference >= 0 ? String(Math.ceil(difference / 86_400_000)) : '';
  }
  private tat(start: unknown, end: unknown): string {
    if (!start || !end) return '';
    const difference = new Date(String(end)).getTime() - new Date(String(start)).getTime();
    if (!Number.isFinite(difference) || difference < 0) return '';
    const minutes = Math.min(Math.floor(difference / 60_000), 1_440);
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  }
  private ageing(days: number) {
    if (!Number.isFinite(days) || days < 0) return 'NA';
    if (days > 90) return 'Above 90 Days';
    if (days > 60) return '60 to 90 Days';
    if (days > 45) return '45 to 60 Days';
    if (days > 30) return '30 to 45 Days';
    if (days > 15) return '15 to 30 Days';
    return '0 to 15 Days';
  }
}
