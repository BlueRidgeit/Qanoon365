import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service.js';
import { IntakeAssistantService } from './intake-assistant.service.js';
import { LeadsController } from './leads.controller.js';

@Module({
  controllers: [LeadsController],
  providers: [LeadsService, IntakeAssistantService],
  exports: [LeadsService, IntakeAssistantService],
})
export class LeadsModule {}
