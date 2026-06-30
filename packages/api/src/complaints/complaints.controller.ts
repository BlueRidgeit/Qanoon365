import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ComplaintsService } from './complaints.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@Controller('complaints')
export class ComplaintsController {
  constructor(private service: ComplaintsService) {}

  @Post('criminal')
  @Roles('lawyer')
  create(
    @Body()
    body: {
      complaintNumber: string;
      complaintType: string;
      court: string;
      complainantName: string;
      complainantNameArabic?: string;
      respondentName: string;
      respondentNameArabic?: string;
      filedDate: string;
      referralDate?: string;
      matterId?: string;
      clientId?: string;
      assignedTo: string;
      notes?: string;
    },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.create(body, userId);
  }

  @Get('criminal')
  @Roles('bd')
  findAll(
    @Query('status') status?: string,
    @Query('complaintType') complaintType?: string,
    @Query('court') court?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('search') search?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll({
      status,
      complaintType,
      court,
      assignedTo,
      search,
      cursor,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('criminal/stats')
  @Roles('bd')
  getStats() {
    return this.service.getStats();
  }

  @Get('criminal/my-stats')
  @Roles('bd')
  getMyStats(@CurrentUser('id') userId: string) {
    return this.service.getMyStats(userId);
  }

  @Get('criminal/:id')
  @Roles('bd')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch('criminal/:id')
  @Roles('lawyer')
  update(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.update(id, body, userId);
  }
}
