import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { AppealDeadlinesService } from './appeal-deadlines.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@Controller('appeal-deadlines')
export class AppealDeadlinesController {
  constructor(private service: AppealDeadlinesService) {}

  @Get('stats')
  @Roles('bd')
  getStats() {
    return this.service.getStats();
  }

  @Get('urgent')
  @Roles('bd')
  getUrgent(@Query('days') days?: string) {
    return this.service.getUrgent(days ? parseInt(days) : undefined);
  }

  @Post()
  @Roles('lawyer')
  create(
    @Body()
    body: {
      matterId?: string;
      fileNumber?: string;
      caseNumber?: string;
      clientName?: string;
      clientNameArabic?: string;
      court?: string;
      judgmentDate: string;
      appealType: string;
      appealPeriodDays: number;
      deadlineDate: string;
      status?: string;
      filedDate?: string;
      assignedTo?: string;
      reminderDays?: number;
      notes?: string;
    },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.create(body, userId);
  }

  @Get()
  @Roles('bd')
  findAll(
    @Query('status') status?: string,
    @Query('appealType') appealType?: string,
    @Query('court') court?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('search') search?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll({
      status,
      appealType,
      court,
      assignedTo,
      search,
      cursor,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get(':id')
  @Roles('bd')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles('lawyer')
  update(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.update(id, body, userId);
  }

  @Patch(':id/status')
  @Roles('lawyer')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; filedDate?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.updateStatus(id, body, userId);
  }

  @Delete(':id')
  @Roles('lawyer')
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.remove(id, userId);
  }
}
