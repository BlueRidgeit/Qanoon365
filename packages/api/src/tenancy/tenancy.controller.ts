import { Controller, Post, Get, Body } from '@nestjs/common';
import { TenancyService } from './tenancy.service.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@Controller('tenants')
export class TenancyController {
  constructor(private tenancyService: TenancyService) {}

  @Roles('admin')
  @Post('provision')
  async provision(
    @Body() body: { id: string; name: string; slug: string; adminEmail: string; adminPassword: string },
  ) {
    return this.tenancyService.provisionTenant(body);
  }

  @Roles('admin')
  @Get()
  async list() {
    return this.tenancyService.listTenants();
  }
}
