import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ActivitiesService } from './activities.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@Controller('activities')
export class ActivitiesController {
  constructor(private service: ActivitiesService) {}

  @Post()
  @Roles('bd')
  create(
    @Body() body: { entityType: string; entityId: string; activityType: string; subject: string; body?: string; activityDate?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.create(body, userId);
  }

  @Get()
  @Roles('bd')
  findAll(@Query('entityType') entityType?: string, @Query('entityId') entityId?: string) {
    return this.service.findAll(entityType, entityId);
  }
}
