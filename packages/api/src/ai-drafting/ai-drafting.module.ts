import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { AiDraftingService } from './ai-drafting.service.js';
import { AiDraftingController } from './ai-drafting.controller.js';
import { AzureOpenAIDraftingProvider } from './providers/azure-openai-drafting.provider.js';
import { AI_DRAFTING_PROVIDER } from './ai-drafting.provider.js';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [AiDraftingController],
  providers: [
    AiDraftingService,
    {
      provide: AI_DRAFTING_PROVIDER,
      useClass: AzureOpenAIDraftingProvider,
    },
  ],
  exports: [AiDraftingService],
})
export class AiDraftingModule {}
