import { Module } from '@nestjs/common';
import { TenancyService } from './tenancy.service.js';
import { TenancyController } from './tenancy.controller.js';

@Module({
  controllers: [TenancyController],
  providers: [TenancyService],
  exports: [TenancyService],
})
export class TenancyModule {}
