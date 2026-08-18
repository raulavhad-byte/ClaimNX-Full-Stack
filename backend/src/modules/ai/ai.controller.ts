import { BadRequestException, Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GeminiAiService } from './gemini-ai.service';

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly gemini: GeminiAiService) {}

  @Post('clinical/icd10')
  suggestIcd10(@Body() body: { diagnosis?: unknown }) {
    const diagnosis = String(body?.diagnosis ?? '').trim();
    if (!diagnosis) throw new BadRequestException('Diagnosis is required.');
    return this.gemini.suggestIcd10(diagnosis);
  }

  @Post('clinical/query-reply')
  draftQueryReply(@Body() body: { query?: unknown; claimContext?: unknown }) {
    const query = String(body?.query ?? '').trim();
    if (!query) throw new BadRequestException('Query text is required.');
    const claimContext = body?.claimContext && typeof body.claimContext === 'object' ? body.claimContext as Record<string, unknown> : {};
    return this.gemini.draftQueryReply(query, claimContext);
  }

  @Post('claims/analyze')
  analyzeClaim(@Body() body: { claim?: unknown; comparisonClaims?: unknown }) {
    if (!body?.claim || typeof body.claim !== 'object') throw new BadRequestException('Claim context is required.');
    const comparisonClaims = Array.isArray(body.comparisonClaims) ? body.comparisonClaims.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object') : [];
    return this.gemini.analyzeClaim(body.claim as Record<string, unknown>, comparisonClaims);
  }
}
