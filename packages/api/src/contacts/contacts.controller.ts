import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ContactsService } from './contacts.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@Controller('contacts')
export class ContactsController {
  constructor(private service: ContactsService) {}

  @Post()
  @Roles('bd')
  create(
    @Body() body: { clientId: string; firstName: string; lastName: string; email?: string; phone?: string; jobTitle?: string; isPrimary?: boolean },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.create(body, userId);
  }

  @Get()
  @Roles('bd')
  findAll(@Query('clientId') clientId?: string) {
    return this.service.findAll(clientId);
  }

  @Get(':id')
  @Roles('bd')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles('bd')
  update(@Param('id') id: string, @Body() body: Record<string, any>, @CurrentUser('id') userId: string) {
    return this.service.update(id, body, userId);
  }
}
