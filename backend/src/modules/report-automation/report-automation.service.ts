import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../database/database.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class ReportAutomationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReportAutomationService.name);
  private timer?: NodeJS.Timeout;
  constructor(private readonly database: DatabaseService, private readonly email: EmailService, private readonly config: ConfigService) {}
  private get db() { return this.database.getClient(); }
  onModuleInit() { this.timer = setInterval(() => void this.runDueAutomations(), 60_000); }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  async list(actor?: any) {
    this.requireAdministrator(actor);
    const { data, error } = await this.db.from('report_automation_configs').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }
  async logs(actor?: any) {
    this.requireAdministrator(actor);
    const { data, error } = await this.db.from('report_automation_logs').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    return data ?? [];
  }
  async templates(actor?: any) {
    this.requireAdministrator(actor);
    const { data, error } = await this.db.from('report_email_templates').select('*').eq('status', 'ACTIVE').order('name');
    if (error) throw error;
    return data ?? [];
  }
  async createTemplate(body: any, actor: any) {
    this.requireAdministrator(actor);
    if (!body?.name?.trim() || !body?.subject?.trim() || !body?.body?.trim()) throw new BadRequestException('Template name, subject, and body are required.');
    const { data, error } = await this.db.from('report_email_templates').insert({ name: body.name.trim(), subject: body.subject.trim(), body: body.body, created_by: actor?.id }).select().single();
    if (error) throw error;
    return data;
  }
  async updateTemplate(id: string, body: any, actor: any) {
    this.requireAdministrator(actor);
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) patch.name = String(body.name).trim();
    if (body.subject !== undefined) patch.subject = String(body.subject).trim();
    if (body.body !== undefined) patch.body = String(body.body);
    if (body.status !== undefined) patch.status = String(body.status).toUpperCase();
    if (!patch.name && !patch.subject && !patch.body && !patch.status) throw new BadRequestException('Provide at least one template field to update.');
    const { data, error } = await this.db.from('report_email_templates').update(patch).eq('id', id).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundException('Report email template not found.');
    return data;
  }
  async create(body: any, actor: any) {
    this.requireAdministrator(actor);
    if (!body?.name?.trim() || !body?.frequency?.type || !Array.isArray(body?.recipientHospitalIds) || !body.recipientHospitalIds.length) {
      throw new BadRequestException('Name, schedule, and at least one recipient hospital are required.');
    }
    const { data, error } = await this.db.from('report_automation_configs').insert({
      name: body.name.trim(), products: body.products ?? [], frequency: body.frequency,
      recipient_hospital_ids: body.recipientHospitalIds, template_id: body.templateId || null, delivery_channels: ['Email'], status: 'ACTIVE', created_by: actor?.id,
    }).select().single();
    if (error) throw error;
    return data;
  }
  async manualDispatch(body: any, actor: any) {
    this.requireAdministrator(actor);
    if (!body?.hospitalId || !body?.subject?.trim() || !body?.body?.trim()) throw new BadRequestException('Hospital, subject, and report body are required.');
    const recipientEmail = String(body.to ?? '').trim().toLowerCase();
    const cc = Array.isArray(body.cc) ? body.cc : String(body.cc ?? '').split(',').map((value) => value.trim()).filter(Boolean);
    const bcc = Array.isArray(body.bcc) ? body.bcc : String(body.bcc ?? '').split(',').map((value) => value.trim()).filter(Boolean);
    if (recipientEmail && !this.isEmail(recipientEmail)) throw new BadRequestException('Enter a valid recipient email address.');
    if ([...cc, ...bcc].some((value: string) => !this.isEmail(value))) throw new BadRequestException('One or more CC or BCC email addresses are invalid.');
    const attachments = Array.isArray(body.attachments) ? body.attachments : [];
    return this.deliver(body.hospitalId, body.subject, body.body, null, actor, recipientEmail || undefined, cc, bcc, attachments);
  }
  async run(configId: string, actor: any) {
    this.requireAdministrator(actor);
    const { data: item, error } = await this.db.from('report_automation_configs').select('*').eq('id', configId).maybeSingle();
    if (error) throw error;
    if (!item) throw new BadRequestException('Report automation was not found.');
    const hospitalIds = Array.isArray(item.recipient_hospital_ids) ? item.recipient_hospital_ids : [];
    const template = item.template_id ? await this.requireTemplate(item.template_id) : null;
    const subject = template?.subject ?? item.name;
    const body = template?.body ?? `Your scheduled ${item.name} is ready. Please sign in to ClaimNX to view the latest report.`;
    const results = await Promise.all(hospitalIds.map((hospitalId: string) => this.deliver(hospitalId, subject, body, item.id, actor)));
    await this.db.from('report_automation_configs').update({ last_run_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', item.id);
    return results;
  }
  private async runDueAutomations() {
    const { data, error } = await this.db.from('report_automation_configs').select('*').eq('status', 'ACTIVE');
    if (error) return;
    const now = new Date();
    for (const item of data ?? []) {
      const frequency = item.frequency ?? {};
      const [hour, minute] = String(frequency.time ?? '').split(':').map(Number);
      const lastRun = item.last_run_at ? new Date(item.last_run_at) : null;
      const alreadyRanToday = lastRun && lastRun.toDateString() === now.toDateString();
      const dueTime = Number.isFinite(hour) && now.getHours() === hour && now.getMinutes() === minute;
      const dayMatches = frequency.type !== 'Monthly' || String(frequency.day ?? '1') === String(now.getDate());
      if (dueTime && dayMatches && !alreadyRanToday) {
        try { await this.run(item.id, { role: 'SUPER ADMIN', permissions: ['all'] }); } catch { /* failure is persisted per delivery */ }
      }
    }
  }
  private async deliver(hospitalId: string, subject: string, body: string, configId: string | null, actor: any, overrideRecipient?: string, cc: string[] = [], bcc: string[] = [], attachments: any[] = []) {
    const { data: hospital, error } = await this.db.from('hospitals').select('id,hospital_name,email').eq('id', hospitalId).eq('is_deleted', false).maybeSingle();
    if (error) throw error;
    if (!hospital?.id) throw new BadRequestException('The selected hospital is no longer available. Please refresh and select the hospital again.');
    const recipientEmail = overrideRecipient || hospital?.email;
    if (!recipientEmail) throw new BadRequestException('The selected hospital has no registered email address.');
    const accountId = await this.resolveCentralMailboxId();
    try {
      const rendered = await this.renderReportTemplate(hospital, subject, body);
      const delivery = await this.email.sendFromMailbox(accountId, { to: [recipientEmail], cc, bcc, subject: rendered.subject, plainTextBody: rendered.body, htmlBody: rendered.htmlBody, attachments }, actor);
      const log = await this.tryLog(configId, hospital, accountId, rendered.subject, 'SENT', undefined, recipientEmail);
      // A provider-confirmed delivery must not be reported as failed merely
      // because a secondary audit insert is temporarily unavailable.  The
      // server records the audit failure for operations to remediate.
      return { ...delivery, auditRecorded: Boolean(log) };
    } catch (error: any) {
      this.logger.error(`Report dispatch failed before a confirmed response (code=${String(error?.code ?? error?.status ?? 'unknown')}).`);
      await this.tryLog(configId, hospital, accountId, subject, 'FAILED', error?.message, recipientEmail);
      throw error;
    }
  }
  private async resolveCentralMailboxId(): Promise<string> {
    const configuredMailbox = this.config.get<string>('CLAIMNX_AUTOMATION_MAILBOX_ID')?.trim();
    // The active internal mailbox is authoritative. The environment setting is
    // retained for backwards compatibility, but must never point dispatch at a
    // hospital mailbox after an administrator changes the central sender.
    let query = this.db.from('mail_accounts').select('id').eq('is_deleted', false).eq('status', 'ACTIVE').eq('is_internal', true);
    if (configuredMailbox) query = configuredMailbox.includes('@') ? query.eq('email_address', configuredMailbox) : query.eq('id', configuredMailbox);
    const { data: configured, error } = await query.maybeSingle();
    if (error) throw error;
    if (configured?.id) return configured.id;
    const { data: activeInternal, error: fallbackError } = await this.db.from('mail_accounts').select('id').eq('is_deleted', false).eq('status', 'ACTIVE').eq('is_internal', true).order('updated_at', { ascending: false }).limit(1).maybeSingle();
    if (fallbackError) throw fallbackError;
    if (!activeInternal?.id) throw new BadRequestException('No active internal ClaimNX mailbox is connected. Connect it in System Admin → API & Integrations before dispatching reports.');
    return activeInternal.id;
  }
  private async log(configId: string | null, hospital: any, accountId: string, name: string, status: 'SENT' | 'FAILED', error?: string, recipientEmail?: string) {
    const { data, error: dbError } = await this.db.from('report_automation_logs').insert({ config_id: configId, hospital_id: hospital.id, recipient_email: recipientEmail || hospital.email, sender_mail_account_id: accountId, report_name: name, channel: 'EMAIL', status, error_message: error ?? null }).select().single();
    if (dbError) throw dbError;
    return data;
  }

  /**
   * Report history is important, but it must never change a confirmed email
   * delivery into an apparent delivery failure.  We deliberately retain the
   * original dispatch exception and write only a non-PHI diagnostic server
   * log if the independent audit store is temporarily unavailable.
   */
  private async tryLog(configId: string | null, hospital: any, accountId: string, name: string, status: 'SENT' | 'FAILED', error?: string, recipientEmail?: string) {
    try {
      return await this.log(configId, hospital, accountId, name, status, error, recipientEmail);
    } catch (auditError: any) {
      this.logger.error(`Report dispatch audit logging failed (status=${status}, code=${String(auditError?.code ?? 'unknown')}).`);
      return null;
    }
  }
  private isEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }

  private requireAdministrator(actor: any) {
    const role = String(actor?.role ?? '').trim().toUpperCase();
    const permissions = Array.isArray(actor?.permissions) ? actor.permissions.map(String) : [];
    if (!['SUPER ADMIN', 'ADMIN'].includes(role) && !permissions.includes('all')) {
      throw new ForbiddenException('Only System Admin can manage or dispatch automated reports.');
    }
  }

  private async requireTemplate(id: string) {
    const { data, error } = await this.db.from('report_email_templates').select('id,subject,body').eq('id', id).eq('status', 'ACTIVE').maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundException('The report email template is unavailable.');
    return data;
  }

  /**
   * Report templates are deliberately rendered only on the server.  A browser
   * preview must never be the source of operational figures, otherwise a
   * stale tab could send inaccurate analysis.
   */
  private async renderReportTemplate(hospital: any, subject: string, body: string): Promise<{ subject: string; body: string; htmlBody: string }> {
    const { data, error } = await this.db.from('claims').select('*').eq('hospital_id', hospital.id).eq('is_deleted', false);
    if (error) throw error;
    const claims = data ?? [];
    const amount = (value: unknown) => {
      const numeric = Number(value ?? 0);
      return Number.isFinite(numeric) ? numeric : 0;
    };
    const statusOf = (claim: any) => String(claim.status ?? claim.lifecycle_status_code ?? claim.current_stage ?? '').trim().toUpperCase();
    const approved = claims.filter((claim: any) => /APPROVED|SETTLED|RECONCILIATION COMPLETED/.test(statusOf(claim)));
    const settled = claims.filter((claim: any) => /SETTLED|SETTLEMENT|RECONCILIATION COMPLETED/.test(statusOf(claim)));
    const totalApproved = approved.reduce((sum: number, claim: any) => sum + amount(claim.approved_amount ?? claim.final_approval_amount ?? claim.form_data?.fin_app_amt), 0);
    const totalSettled = settled.reduce((sum: number, claim: any) => sum + amount(claim.settled_amount ?? claim.total_settled_amount ?? claim.form_data?.set_incl_tds), 0);
    const pending = claims.filter((claim: any) => !/SETTLED|SETTLEMENT|RECONCILIATION COMPLETED/.test(statusOf(claim)));
    const today = new Date();
    // Keep the manual-dispatch report aligned with the reconciliation
    // dashboard: four mutually exclusive buckets, for both case count and
    // the outstanding amount. These are calculated at dispatch time so a
    // browser cannot send stale or altered figures.
    const ageingBuckets = {
      within30: { count: 0, amount: 0 },
      days31to60: { count: 0, amount: 0 },
      days61to90: { count: 0, amount: 0 },
      over90: { count: 0, amount: 0 },
    };
    pending.forEach((claim: any) => {
      const created = new Date(claim.created_at ?? claim.createdAt ?? today);
      const days = Math.max(0, Math.floor((today.getTime() - created.getTime()) / 86_400_000));
      const outstandingAmount = amount(
        claim.outstanding_amount ?? claim.total_claimed_amount ?? claim.claim_amount ?? claim.form_data?.total_amt,
      );
      const bucket = days <= 30
        ? ageingBuckets.within30
        : days <= 60
          ? ageingBuckets.days31to60
          : days <= 90
            ? ageingBuckets.days61to90
            : ageingBuckets.over90;
      bucket.count += 1;
      bucket.amount += outstandingAmount;
    });
    const currency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
    const replacements: Record<string, string> = {
      hospitalName: String(hospital.hospital_name ?? 'Hospital'),
      dateRange: new Intl.DateTimeFormat('en-GB').format(today),
      totalCases: String(claims.length),
      approvedCases: String(approved.length),
      approvalRatio: claims.length ? ((approved.length / claims.length) * 100).toFixed(1) : '0.0',
      reconciliationSummary: `Settled cases: ${settled.length}\nTotal approved: ${currency(totalApproved)}\nTotal settled: ${currency(totalSettled)}\nPending recovery: ${currency(Math.max(totalApproved - totalSettled, 0))}`,
      agingAnalysis: `Pending cases: ${pending.length}\n0–30 days: ${ageingBuckets.within30.count}\n31–60 days: ${ageingBuckets.days31to60.count}\n61–90 days: ${ageingBuckets.days61to90.count}\n90+ days: ${ageingBuckets.over90.count}`,
      portalLink: `${(this.config.get<string>('FRONTEND_ORIGIN') || 'http://localhost:5173').split(',')[0].trim().replace(/\/+$/, '')}/#/reconciliation-dashboard`,
    };
    const replace = (value: string) => value.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (token, key) => replacements[key] ?? token);
    const renderedBody = replace(body);
    const escape = (value: unknown) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const metric = (label: string, value: string, accent: string) => `<td style="width:33.33%;padding:0 5px 10px"><div style="border:1px solid #dbeafe;border-top:4px solid ${accent};border-radius:10px;padding:14px;background:#f8fbff"><div style="font:700 10px Arial,sans-serif;letter-spacing:1px;color:#64748b;text-transform:uppercase">${escape(label)}</div><div style="font:700 21px Arial,sans-serif;color:#0f172a;margin-top:7px">${escape(value)}</div></div></td>`;
    const reportMonths = Array.from({ length: 7 }, (_, index) => new Date(today.getFullYear(), today.getMonth() - (6 - index), 1));
    const monthKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}`;
    const reconciliationCategories = ['Complete Settlement', 'Partial Settled Recoverable', 'Partial Settled - Non Recoverable', 'Outstanding'];
    const reconciliationData = reconciliationCategories.reduce((result, category) => ({ ...result, [category]: { count: new Map<string, number>(), amount: new Map<string, number>() } }), {} as Record<string, { count: Map<string, number>; amount: Map<string, number> }>);
    const categoryOf = (claim: any) => {
      const status = statusOf(claim);
      if (/PARTIALLY?.*(NON[ -]?RECOVERABLE)|PARTIAL.*NON[ -]?RECOVERABLE/.test(status)) return 'Partial Settled - Non Recoverable';
      if (/PARTIALLY?.*RECOVERABLE|PARTIAL.*RECOVERABLE/.test(status)) return 'Partial Settled Recoverable';
      if (/COMPLETE SETTLEMENT|ACCOUNT RECONCILIATION|BANK RECONCILIATION COMPLETED/.test(status)) return 'Complete Settlement';
      return 'Outstanding';
    };
    claims.forEach((claim: any) => {
      const eventDate = new Date(claim.updated_at ?? claim.created_at ?? today);
      const key = Number.isNaN(eventDate.getTime()) ? monthKey(today) : monthKey(eventDate);
      if (!reportMonths.some((month) => monthKey(month) === key)) return;
      const category = categoryOf(claim);
      const row = reconciliationData[category];
      row.count.set(key, (row.count.get(key) ?? 0) + 1);
      const reportAmount = category === 'Outstanding'
        ? amount(claim.outstanding_amount ?? claim.total_claimed_amount ?? claim.claim_amount ?? claim.form_data?.total_amt)
        : amount(claim.settled_amount ?? claim.total_settled_amount ?? claim.approved_amount ?? claim.final_approval_amount ?? claim.form_data?.set_incl_tds);
      row.amount.set(key, (row.amount.get(key) ?? 0) + reportAmount);
    });
    const reconciliationTable = (title: string, metric: 'count' | 'amount') => {
      const headers = reportMonths.map((month) => `<th style="padding:8px 6px;background:#f8fafc;border:1px solid #e2e8f0;font:700 9px Arial,sans-serif;color:#64748b;text-transform:uppercase">${escape(new Intl.DateTimeFormat('en-GB', { month: 'short', year: '2-digit' }).format(month))}</th>`).join('');
      const rows = reconciliationCategories.map((category) => {
        const values = reportMonths.map((month) => reconciliationData[category][metric].get(monthKey(month)) ?? 0);
        const total = values.reduce((sum, value) => sum + value, 0);
        return `<tr><td style="padding:8px 9px;border:1px solid #e2e8f0;font:600 10px Arial,sans-serif;color:#334155">${escape(category)}</td>${values.map((value) => `<td style="padding:8px 6px;border:1px solid #e2e8f0;text-align:right;font:600 10px Arial,sans-serif;color:#334155">${metric === 'amount' ? escape(currency(value)) : escape(value)}</td>`).join('')}<td style="padding:8px 6px;background:#eff6ff;border:1px solid #e2e8f0;text-align:right;font:700 10px Arial,sans-serif;color:#0f172a">${metric === 'amount' ? escape(currency(total)) : escape(total)}</td></tr>`;
      }).join('');
      return `<div style="margin-top:14px;border-radius:10px;overflow:hidden;border:1px solid #dbeafe"><div style="padding:9px 12px;background:#000080;color:#fff;font:700 10px Arial,sans-serif;letter-spacing:1px;text-transform:uppercase">${escape(title)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse"><tr><th style="padding:8px 9px;background:#f8fafc;border:1px solid #e2e8f0;text-align:left;font:700 9px Arial,sans-serif;color:#64748b;text-transform:uppercase">Settlement type</th>${headers}<th style="padding:8px 6px;background:#eff6ff;border:1px solid #e2e8f0;font:700 9px Arial,sans-serif;color:#64748b;text-transform:uppercase">Total</th></tr>${rows}</table></div>`;
    };
    const reconciliationSummaryHtml = `${reconciliationTable('Count wise', 'count')}${reconciliationTable('Amount wise', 'amount')}`;
    const ageingDefinitions = [
      ['0–30 days', ageingBuckets.within30],
      ['31–60 days', ageingBuckets.days31to60],
      ['61–90 days', ageingBuckets.days61to90],
      ['90+ days', ageingBuckets.over90],
    ] as const;
    const ageingCards = (value: 'count' | 'amount') => ageingDefinitions.map(([label, bucket]) =>
      `<td style="width:25%;padding:0 4px"><div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px;background:#f8fafc"><div style="font:700 9px Arial,sans-serif;color:#64748b;text-transform:uppercase">${escape(label)}</div><div style="font:700 19px Arial,sans-serif;color:#0f172a;margin-top:6px">${escape(value === 'amount' ? currency(bucket.amount) : bucket.count)}</div></div></td>`,
    ).join('');
    // The standard template contains text placeholders for these three summaries.
    // They are removed from the narrative because the canonical server-rendered
    // cards and tables below are the accurate, current-data version.
    const narrativeBody = renderedBody
      .replace(/\n?KPI Summary:[\s\S]*?(?=--- ENCLOSED RECONCILIATION SUMMARY ---|--- AGING ANALYSIS ---|View full details here:|$)/i, '')
      .replace(/\n?--- ENCLOSED RECONCILIATION SUMMARY ---[\s\S]*?(?=--- AGING ANALYSIS ---|View full details here:|$)/i, '')
      .replace(/\n?--- AGING ANALYSIS ---[\s\S]*?(?=View full details here:|$)/i, '')
      .replace(/\n?View full details here:[^\n]*/i, '')
      .trim();
    const htmlBody = `<!doctype html><html><body style="margin:0;background:#f1f5f9;padding:22px;font-family:Arial,sans-serif;color:#0f172a"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:720px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden"><tr><td style="padding:24px 28px;background:#000080;color:#fff"><div style="font-size:20px;font-weight:700">ClaimNX Operations Report</div><div style="font-size:12px;opacity:.82;margin-top:5px">${escape(replacements.hospitalName)} · ${escape(replacements.dateRange)}</div></td></tr><tr><td style="padding:26px 28px">${narrativeBody ? `<div style="font-size:14px;line-height:1.65;color:#334155;white-space:pre-line">${escape(narrativeBody).replace(/\n/g, '<br>')}</div>` : ''}<div style="font-size:13px;font-weight:700;margin:26px 0 12px;color:#0f172a">KPI Summary</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>${metric('Total cases', replacements.totalCases, '#2563eb')}${metric('Approved cases', replacements.approvedCases, '#10b981')}${metric('Approval ratio', `${replacements.approvalRatio}%`, '#8b5cf6')}</tr></table><div style="font-size:13px;font-weight:700;margin:22px 0 10px;color:#0f172a">Month wise reconciliation</div>${reconciliationSummaryHtml}<div style="font-size:13px;font-weight:700;margin:22px 0 10px;color:#0f172a">Aging Analysis (Recon)</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>${ageingCards('count')}</tr></table><div style="font-size:13px;font-weight:700;margin:22px 0 10px;color:#0f172a">Outstanding Amount of Aging</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>${ageingCards('amount')}</tr></table><div style="margin-top:24px;font-size:12px"><a style="color:#1455e8;font-weight:700" href="${escape(replacements.portalLink)}">View full details in ClaimNX</a></div></td></tr></table></body></html>`;
    return { subject: replace(subject), body: renderedBody, htmlBody };
  }
}
