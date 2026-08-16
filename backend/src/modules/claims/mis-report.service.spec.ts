import { MisReportService } from './mis-report.service';

describe('MisReportService', () => {
  it('reports top-up approval totals and two chronological settlement transactions', () => {
    const service = new MisReportService(null as any);
    const claim = {
      status: 'Complete Settlement',
      claim_number: 'CLM-1',
      admission_date: '2026-08-01',
      form_data: {
        p_name: 'Test Patient',
        dis_date: '2026-08-05',
        dis_total_bill: 150000,
        fin_app_amt: 100000,
        topup_claim_id: 'TOP-1',
        topup_app_amt: 25000,
        history: [
          {
            status: 'Complete Settlement',
            date: '2026-08-15T10:00:00Z',
            stageData: { utr_date: '2026-08-15', utr_number: 'UTR-2', set_net_settled: 24000, set_incl_tds: 25000, set_tds: 1000 },
          },
          {
            status: 'Partially Claim Settled - Recoverable',
            date: '2026-08-10T10:00:00Z',
            stageData: { utr_date: '2026-08-10', utr_number: 'UTR-1', set_net_settled: 48000, set_incl_tds: 50000, set_tds: 2000 },
          },
        ],
      },
    };

    const report = (service as any).businessReport([claim]);
    const value = (header: string) => report.rows[0][report.headers.indexOf(header)];

    expect(report.rows[0]).toHaveLength(report.headers.length);
    expect(value('Top Up Claim NO')).toBe('TOP-1');
    expect(value('Top Up Final Approval Amt')).toBe(25000);
    expect(value('Total Final Approval Amt')).toBe(125000);
    expect(value('UTR NO')).toBe('UTR-1');
    expect(value('UTR NO 2')).toBe('UTR-2');
    expect(value('Total Settled Amount')).toBe(50000);
    expect(value('Total Settled Amount 2')).toBe(25000);
    expect(value('Outstanding')).toBe(50000);
  });

  it.each(['Admission', 'Discharge', 'Outstanding', 'TAT'])(
    'keeps every %s report row aligned with its backend header structure',
    (type) => {
      const service = new MisReportService(null as any);
      const claim = {
        status: 'Claim Approved',
        claim_number: 'CLM-2',
        created_at: '2026-08-05T10:00:00Z',
        admission_date: '2026-08-01',
        form_data: { p_name: 'Patient', dis_date: '2026-08-04', history: [] },
      };
      const method: Record<string, string> = {
        Admission: 'admissionReport',
        Discharge: 'dischargeReport',
        Outstanding: 'outstandingReport',
        TAT: 'tatReport',
      };
      const report = (service as any)[method[type]]([claim]);

      expect(report.rows[0]).toHaveLength(report.headers.length);
    },
  );
});
