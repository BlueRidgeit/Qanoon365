import { Module } from '@nestjs/common';
import { KycService } from './kyc.service.js';
import { KycController } from './kyc.controller.js';

@Module({
  controllers: [KycController],
  providers: [KycService],
  exports: [KycService],
})
export class KycModule {}
