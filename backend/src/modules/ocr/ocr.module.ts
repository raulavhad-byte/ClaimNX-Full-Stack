import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { AiModule } from '../ai/ai.module';
import { OcrController } from './ocr.controller';
import { PolicyOcrService } from './policy-ocr.service';

@Module({
  imports: [DatabaseModule, AiModule],
  controllers: [OcrController],
  providers: [PolicyOcrService],
  exports: [PolicyOcrService],
})
export class OcrModule {}
