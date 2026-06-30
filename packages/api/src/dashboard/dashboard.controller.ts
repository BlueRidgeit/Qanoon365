import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@Controller('dashboard')
export class DashboardController {
  constructor(private service: DashboardService) {}

  @Get()
  @Roles('bd')
  getOverview() {
    return this.service.getOverview();
  }

  @Get('pipeline')
  @Roles('bd')
  getPipeline() {
    return this.service.getPipelineSummary();
  }

  @Get('conflicts')
  @Roles('compliance')
  getConflicts() {
    return this.service.getConflictSummary();
  }

  @Get('kyc')
  @Roles('compliance')
  getKyc() {
    return this.service.getKycComplianceSummary();
  }
}
