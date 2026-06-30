import {
  Controller, Get, Post, Delete,
  Param, Query, Body,
  UploadedFile, UseInterceptors, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@Controller('documents')
export class DocumentsController {
  constructor(private service: DocumentsService) {}

  @Post('upload')
  @Roles('bd')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    @Body() body: { entityType: string; entityId: string; documentCategory?: string },
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.service.upload(file, body, userId, tenantId);
  }

  @Get()
  @Roles('bd')
  findAll(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.service.findAll(entityType, entityId);
  }

  @Get(':id')
  @Roles('bd')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/download')
  @Roles('bd')
  getDownloadUrl(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.service.getDownloadUrl(id, tenantId);
  }

  @Delete(':id')
  @Roles('lawyer')
  delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.service.delete(id, userId, tenantId);
  }
}
