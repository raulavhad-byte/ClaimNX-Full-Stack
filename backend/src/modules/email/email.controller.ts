import { Body, Controller, Get, Post, Param, Query, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { EmailService } from './email.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GmailOAuthService } from './accounts/gmail-oauth.service';
import { MailAccountService } from './accounts/mail-account.service';
import { ExternalOAuthService } from './accounts/external-oauth.service';

@Controller('email')
export class EmailController {
  constructor(
    private readonly emailService: EmailService,
    private readonly gmailOAuthService: GmailOAuthService,
    private readonly mailAccountService: MailAccountService,
    private readonly configService: ConfigService,
    private readonly externalOAuthService: ExternalOAuthService,
  ) {}

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
    @Body() body: { to: string[]; cc?: string[]; bcc?: string[]; subject: string; plainTextBody: string; claimId?: string; attachments?: { filename: string; contentType: string; contentBase64: string }[] },
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
