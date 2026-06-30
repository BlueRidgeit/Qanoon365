import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { OpportunitiesService } from './opportunities.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@Controller('opportunities')
export class OpportunitiesController {
  constructor(private service: OpportunitiesService) {}

  @Post()
  @Roles('lawyer')
  create(
    @Body() body: { clientId: string; name: string; practiceArea: string; assignedPartner: string; leadId?: string; engagementType?: string; estimatedValue?: number },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.create(body, userId);
  }

  @Get()
  @Roles('bd')
  findAll(@Query('cursor') cursor?: string, @Query('limit') limit?: string, @Query('stage') stage?: string) {
    return this.service.findAll({ cursor, limit: limit ? parseInt(limit) : undefined, stage });
  }

  @Get(':id')
  @Roles('bd')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles('lawyer')
  update(@Param('id') id: string, @Body() body: Record<string, any>, @CurrentUser('id') userId: string) {
    return this.service.update(id, body, userId);
  }

  @Patch(':id/stage')
  @Roles('lawyer')
  transitionStage(
    @Param('id') id: string,
    @Body() body: { stage: string },
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.service.transitionStage(id, body.stage, userId, userRole);
  }
}
