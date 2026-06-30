import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { KycService } from './kyc.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@Controller('kyc')
export class KycController {
  constructor(private service: KycService) {}

  @Post()
  @Roles('compliance')
  create(
    @Body() body: {
      clientId: string;
      verificationType: string;
      idDocumentType?: string;
      idDocumentNumber?: string;
      idExpiryDate?: string;
      riskRating?: string;
      notes?: string;
    },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.create(body, userId);
  }

  @Get()
  @Roles('compliance')
  findAll(@Query('clientId') clientId?: string) {
    return this.service.findAll(clientId);
  }

  @Get('check-expiry')
  @Roles('compliance')
  checkExpiry() {
    return this.service.checkExpiry();
  }

  @Get(':id')
  @Roles('compliance')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles('compliance')
  update(
    @Param('id') id: string,
    @Body() body: {
      status?: string;
      idDocumentType?: string;
      idDocumentNumber?: string;
      idExpiryDate?: string;
      riskRating?: string;
      notes?: string;
    },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.update(id, body, userId);
  }
}
