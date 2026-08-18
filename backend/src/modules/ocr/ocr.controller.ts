import { BadRequestException, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PolicyOcrService } from './policy-ocr.service';

@UseGuards(JwtAuthGuard)
@Controller('ocr')
export class OcrController {
  constructor(private readonly policyOcrService: PolicyOcrService) {}

  @Post('policy-e-card')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  extractPolicyECard(@UploadedFile() file: any, @CurrentUser() actor: any) {
    if (!file) throw new BadRequestException('A policy e-card or policy document is required.');
    return this.policyOcrService.extractPolicyECard({ file, actor });
  }
}
