import { Module } from '@nestjs/common';
import { EnforcementService } from './enforcement.service.js';
import { EnforcementController } from './enforcement.controller.js';

@Module({
  controllers: [EnforcementController],
  providers: [EnforcementService],
  exports: [EnforcementService],
})
export class EnforcementModule {}
