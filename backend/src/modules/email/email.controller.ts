import { BadRequestException, Body, Controller, ForbiddenException, Get, Post, Param, Query, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { EmailService } from './email.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GmailOAuthService } from './accounts/gmail-oauth.service';
import { MailAccountService } from './accounts/mail-account.service';
import { ExternalOAuthService } from './accounts/external-oauth.service';
import { DatabaseService } from '../../database/database.service';

@Controller('email')
export class EmailController {
  constructor(
    private readonly emailService: EmailService,
    private readonly gmailOAuthService: GmailOAuthService,
    private readonly mailAccountService: MailAccountService,
    private readonly configService: ConfigService,
    private readonly externalOAuthService: ExternalOAuthService,
    private readonly databaseService: DatabaseService,
  ) {}

  @Post('internal/gmail/oauth/authorize')
  @UseGuards(JwtAuthGuard)
  async beginInternalGmailAuthorization(@Body() body: { emailAddress: string; displayName?: string }, @CurrentUser() actor: any) {
    const role = String(actor?.role ?? '').trim().toUpperCase();
    if (!['SUPER ADMIN', 'ADMIN'].includes(role) && !actor?.permissions?.includes?.('all')) throw new ForbiddenException('Only System Admin can connect the central ClaimNX mailbox.');
    const { data: anchor, error } = await this.databaseService.getClient().from('hospitals').select('id').eq('is_deleted', false).limit(1).maybeSingle();
    if (error) throw error;
    if (!anchor?.id) throw new BadRequestException('An active hospital is required as the secure system mailbox anchor.');
    return this.gmailOAuthService.begin(body.emailAddress, body.displayName || 'ClaimNX Central Dispatch', actor, anchor.id, true);
  }

  @Get('internal/mailbox')
  @UseGuards(JwtAuthGuard)
  async getInternalMailbox(@CurrentUser() actor: any) {
    const role = String(actor?.role ?? '').trim().toUpperCase();
    if (!['SUPER ADMIN', 'ADMIN'].includes(role) && !actor?.permissions?.includes?.('all')) throw new ForbiddenException('Only System Admin can view the central ClaimNX mailbox.');
    const { data, error } = await this.databaseService.getClient()
      .from('mail_accounts')
      .select('id,email_address,display_name,provider,status,updated_at')
      .eq('is_deleted', false)
      .eq('is_internal', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  }

  @Get('mailboxes')
  @UseGuards(JwtAuthGuard)
  async activeMailboxes(
    @Query('hospitalIds') hospitalIds: string | undefined,
    @CurrentUser() actor: any,
  ) {
    return this.mailAccountService.getActiveAccountsForActor(
      String(hospitalIds ?? '').split(',').map((id) => id.trim()).filter(Boolean),
      actor,
    );
  }

  /** The CRM screen must resolve the sender from the claim's persisted
   * hospital ownership, rather than trusting a browser-side hospital ID. */
  @Get('claims/:claimId/mailbox')
  @UseGuards(JwtAuthGuard)
  async claimMailbox(@Param('claimId') claimId: string, @CurrentUser() actor: any) {
    const { data: claim, error } = await this.databaseService.getClient()
      .from('claims')
      .select('hospital_id')
      .eq('id', claimId)
      .eq('is_deleted', false)
      .maybeSingle();
    if (error) throw error;
    if (!claim?.hospital_id) throw new BadRequestException('The claim hospital is unavailable.');
    const accounts = await this.mailAccountService.getActiveAccountsForActor([String(claim.hospital_id)], actor);
    return accounts.find((account: any) =>
      String(account.hospital_id) === String(claim.hospital_id)
      && account.status === 'ACTIVE'
      && account.outbound_enabled,
    ) ?? null;
  }

  @Get('messages')
  @UseGuards(JwtAuthGuard)
  async mailboxMessages(@Query('hospitalId') hospitalId: string | undefined, @Query('folder') folder: string | undefined, @Query('limit') limit: string | undefined, @CurrentUser() actor: any) {
    const accounts = await this.mailAccountService.getActiveAccountsForActor(hospitalId ? [hospitalId] : [], actor);
    const allowed = hospitalId ? accounts.filter((account: any) => String(account.hospital_id) === String(hospitalId)) : accounts;
    return this.emailService.getMailboxMessages(allowed.map((account: any) => account.id), folder, Number(limit || 100));
  }

  @Get('folder-counts')
  @UseGuards(JwtAuthGuard)
  async mailboxFolderCounts(@Query('hospitalId') hospitalId: string | undefined, @CurrentUser() actor: any) {
    const accounts = await this.mailAccountService.getActiveAccountsForActor(hospitalId ? [hospitalId] : [], actor);
    const allowed = hospitalId ? accounts.filter((account: any) => String(account.hospital_id) === String(hospitalId)) : accounts;
    return this.emailService.getMailboxFolderCounts(allowed.map((account: any) => account.id));
  }

  @Post('messages/sync')
  @UseGuards(JwtAuthGuard)
  async syncMailboxMessages(@Body() body: { hospitalId?: string }, @CurrentUser() actor: any) {
    const accounts = await this.mailAccountService.getActiveAccountsForActor(body.hospitalId ? [body.hospitalId] : [], actor);
    const allowed = body.hospitalId ? accounts.filter((account: any) => String(account.hospital_id) === String(body.hospitalId)) : accounts;
    return this.emailService.syncMailboxMessages(allowed, actor);
  }

  @Post('microsoft/oauth/authorize')
  @UseGuards(JwtAuthGuard)
  beginMicrosoftAuthorization(@Body() body: { emailAddress: string; displayName?: string; hospitalId?: string }, @CurrentUser() actor: any) {
    return this.externalOAuthService.begin('MICROSOFT_365', body.emailAddress, body.displayName, actor, body.hospitalId);
  }

  @Post('yahoo/oauth/authorize')
  @UseGuards(JwtAuthGuard)
  beginYahooAuthorization(@Body() body: { emailAddress: string; displayName?: string; hospitalId?: string }, @CurrentUser() actor: any) {
    return this.externalOAuthService.begin('YAHOO', body.emailAddress, body.displayName, actor, body.hospitalId);
  }

  @Post('mailboxes/:accountId/send')
  @UseGuards(JwtAuthGuard)
  async sendFromMailbox(
    @Param('accountId') accountId: string,
    @Body() body: { to: string[]; cc?: string[]; bcc?: string[]; subject: string; plainTextBody: string; claimId?: string; claimIds?: string[]; attachments?: { filename: string; contentType: string; contentBase64: string }[] },
    @CurrentUser() actor: any,
  ) {
    return this.emailService.sendFromMailbox(accountId, body, actor);
  }

  @Get('attachments/:attachmentId/download')
  @UseGuards(JwtAuthGuard)
  async getAttachmentDownloadUrl(@Param('attachmentId') attachmentId: string, @CurrentUser() actor: any) {
    return this.emailService.getAttachmentDownloadUrl(attachmentId, actor);
  }

  @Post('gmail/oauth/authorize')
  @UseGuards(JwtAuthGuard)
  async beginGmailAuthorization(
    @Body() body: { emailAddress: string; displayName?: string; hospitalId?: string },
    @CurrentUser() actor: any,
  ) {
    return this.gmailOAuthService.begin(body.emailAddress, body.displayName, actor, body.hospitalId);
  }

  // Keep the original route and the Google Console redirect URI route. OAuth
  // redirect URIs must match exactly, so this prevents a configuration typo
  // from becoming a 404 after the user has granted consent.
  @Get(['gmail/oauth/callback', 'oauth/gmail/callback'])
  async completeGmailAuthorization(
    @Query('code') code?: string,
    @Query('state') state?: string,
    @Query('error') error?: string,
    @Query('error_description') errorDescription?: string,
    @Res() response?: Response,
  ) {
    await this.gmailOAuthService.complete(code, state, error, errorDescription);
    return response!.redirect(302, this.portalRedirect());
  }

  @Get('microsoft/oauth/callback')
  async completeMicrosoftAuthorization(@Query('code') code: string | undefined, @Query('state') state: string | undefined, @Query('error') error: string | undefined, @Query('error_description') description: string | undefined, @Res() response: Response) {
    await this.externalOAuthService.complete('MICROSOFT_365', code, state, error, description);
    return response.redirect(302, this.portalRedirect());
  }

  @Get('yahoo/oauth/callback')
  async completeYahooAuthorization(@Query('code') code: string | undefined, @Query('state') state: string | undefined, @Query('error') error: string | undefined, @Query('error_description') description: string | undefined, @Res() response: Response) {
    await this.externalOAuthService.complete('YAHOO', code, state, error, description);
    return response.redirect(302, this.portalRedirect());
  }

  @Post('claims/:claimId/send')
  @UseGuards(JwtAuthGuard)
  async sendEmail(
    @Param('claimId') claimId: string,
    @Body() body: any
  ) {
    return this.emailService.sendClaimEmail(body.hospitalId || 'default', claimId, body);
  }

  @Post('inbound/process')
  @UseGuards(JwtAuthGuard)
  async processInbound(@Body() body: { accountId: string; email: any }, @CurrentUser() actor: any) {
    return this.emailService.processInboundEmail(body.accountId, body.email, actor);
  }

  private portalRedirect() {
    const origin = (this.configService.get<string>('FRONTEND_ORIGIN') || 'http://localhost:5173').split(',')[0].trim().replace(/\/+$/, '');
    return `${origin}/#/?email=connected`;
  }
}
