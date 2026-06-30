import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ClientsService } from './clients.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@Controller('clients')
export class ClientsController {
  constructor(private service: ClientsService) {}

  @Post()
  @Roles('bd')
  create(
    @Body() body: { name: string; clientType: string; registrationNumber?: string; industry?: string; preferredLanguage?: string; riskRating?: string; notes?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.create(body, userId);
  }

  @Get()
  @Roles('bd')
  findAll(@Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    return this.service.findAll({ cursor, limit: limit ? parseInt(limit) : undefined });
  }

  @Get(':id')
  @Roles('bd')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles('bd')
  update(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.update(id, body, userId);
  }
}
