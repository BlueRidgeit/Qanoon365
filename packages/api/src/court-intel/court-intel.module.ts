import { Module } from '@nestjs/common';
import { CourtIntelService } from './court-intel.service.js';
import { CourtIntelController } from './court-intel.controller.js';
import { AzureOpenAIProvider } from './providers/azure-openai.provider.js';
import { COURT_INTEL_PROVIDER } from './court-intel.provider.js';

@Module({
  controllers: [CourtIntelController],
  providers: [
    CourtIntelService,
    {
      provide: COURT_INTEL_PROVIDER,
      useClass: AzureOpenAIProvider,
    },
  ],
  exports: [CourtIntelService],
})
export class CourtIntelModule {}
