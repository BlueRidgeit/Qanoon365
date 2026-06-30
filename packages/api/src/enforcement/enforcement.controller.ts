import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { EnforcementService } from './enforcement.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@Controller('enforcement')
export class EnforcementController {
  constructor(private service: EnforcementService) {}

  // ── Dashboard & Reports (must be before :id routes) ──────

  @Get('dashboard')
  @Roles('bd')
  getDashboard(@CurrentUser('id') userId: string) {
    return this.service.getDashboard(userId);
  }

  @Get('reports')
  @Roles('partner')
  getReports(@Query('month') month?: string, @Query('year') year?: string) {
    return this.service.getReports({ month, year });
  }

  // ── Execution Files ───────────────────────────────────────

  @Post('execution-files')
  @Roles('lawyer')
  createFile(
    @Body()
    body: {
      fileNumber: string;
      caseNumber?: string;
      court: string;
      filingDate: string;
      claimAmount: number;
      currency?: string;
      debtorName: string;
      debtorNameArabic?: string;
      creditorName: string;
      creditorNameArabic?: string;
      matterId?: string;
      clientId?: string;
      assignedTo: string;
      notes?: string;
    },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.create(body, userId);
  }

  @Get('execution-files')
  @Roles('bd')
  findAllFiles(
    @Query('court') court?: string,
    @Query('status') status?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('isStalled') isStalled?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll({
      court,
      status,
      assignedTo,
      isStalled,
      search,
      dateFrom,
      dateTo,
      cursor,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('execution-files/stats')
  @Roles('bd')
  getStats() {
    return this.service.getStats();
  }

  @Get('execution-files/my-stats')
  @Roles('bd')
  getMyStats(@CurrentUser('id') userId: string) {
    return this.service.getMyStats(userId);
  }

  @Get('execution-files/:id')
  @Roles('bd')
  findOneFile(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch('execution-files/:id')
  @Roles('lawyer')
  updateFile(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.update(id, body, userId);
  }

  @Delete('execution-files/:id')
  @Roles('lawyer')
  removeFile(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.remove(id, userId);
  }

}
