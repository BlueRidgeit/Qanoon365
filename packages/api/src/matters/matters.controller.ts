import { Controller, Get, Patch, Param, Body, Query } from '@nestjs/common';
import { MattersService } from './matters.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@Controller('matters')
export class MattersController {
  constructor(private service: MattersService) {}

  @Get()
  @Roles('lawyer')
  findAll(@Query('cursor') cursor?: string, @Query('limit') limit?: string, @Query('status') status?: string) {
    return this.service.findAll({ cursor, limit: limit ? parseInt(limit) : undefined, status });
  }

  @Get(':id')
  @Roles('lawyer')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles('lawyer')
  update(@Param('id') id: string, @Body() body: Record<string, any>, @CurrentUser('id') userId: string) {
    return this.service.update(id, body, userId);
  }

  @Patch(':id/close')
  @Roles('partner')
  close(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.close(id, userId);
  }
}
