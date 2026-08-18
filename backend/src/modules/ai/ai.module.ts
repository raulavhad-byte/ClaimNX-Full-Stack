import { Module } from '@nestjs/common';
import { GeminiAiService } from './gemini-ai.service';
import { AiController } from './ai.controller';

@Module({ controllers: [AiController], providers: [GeminiAiService], exports: [GeminiAiService] })
export class AiModule {}
