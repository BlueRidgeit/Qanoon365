import { Module } from '@nestjs/common';
import { TimeBillingService } from './time-billing.service.js';
import { TimeBillingController } from './time-billing.controller.js';

@Module({
  controllers: [TimeBillingController],
  providers: [TimeBillingService],
  exports: [TimeBillingService],
})
export class TimeBillingModule {}
