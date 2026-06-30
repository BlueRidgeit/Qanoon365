import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ArchiveService } from './archive.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@Controller('archive')
export class ArchiveController {
  constructor(private service: ArchiveService) {}

  // ── Archived Documents ────────────────────────────────────

  @Get('stats')
  @Roles('bd')
  getStats() {
    return this.service.getDocumentStats();
  }

  @Get('search')
  @Roles('bd')
  search(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('court') court?: string,
    @Query('caseStage') caseStage?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.searchDocuments({
      q,
      category,
      court,
      caseStage,
      dateFrom,
      dateTo,
      cursor,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Post()
  @Roles('lawyer')
  createDocument(
    @Body()
    body: {
      title: string;
      description?: string;
      category: string;
      tags?: string;
      content?: string;
      fileName: string;
      blobPath: string;
      fileSizeBytes?: number;
      contentType?: string;
      court?: string;
      caseNumber?: string;
      caseStage?: string;
      archiveDate?: string;
      clientId?: string;
      matterId?: string;
      isClassified?: boolean;
      classificationLabel?: string;
    },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.createDocument(body, userId);
  }

  @Get('documents')
  @Roles('bd')
  findAllDocuments(
    @Query('category') category?: string,
    @Query('court') court?: string,
    @Query('isClassified') isClassified?: string,
    @Query('search') search?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAllDocuments({
      category,
      court,
      isClassified,
      search,
      cursor,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('documents/:id')
  @Roles('bd')
  findOneDocument(@Param('id') id: string) {
    return this.service.findOneDocument(id);
  }

  @Patch('documents/:id')
  @Roles('lawyer')
  updateDocument(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.updateDocument(id, body, userId);
  }

  @Delete('documents/:id')
  @Roles('lawyer')
  removeDocument(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.removeDocument(id, userId);
  }

  // ── Powers of Attorney ────────────────────────────────────

  @Get('poa/stats')
  @Roles('bd')
  getPoaStats() {
    return this.service.getPoaStats();
  }

  @Post('poa')
  @Roles('lawyer')
  createPoa(
    @Body()
    body: {
      poaNumber: string;
      clientId?: string;
      matterId?: string;
      grantorName: string;
      grantorNameArabic?: string;
      granteeUserId?: string;
      poaType: string;
      issueDate: string;
      expiryDate?: string;
      notarizationNumber?: string;
      court?: string;
      status?: string;
      documentBlobPath?: string;
      notes?: string;
    },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.createPoa(body, userId);
  }

  @Get('poa')
  @Roles('bd')
  findAllPoas(
    @Query('poaType') poaType?: string,
    @Query('status') status?: string,
    @Query('court') court?: string,
    @Query('search') search?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAllPoas({
      poaType,
      status,
      court,
      search,
      cursor,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('poa/:id')
  @Roles('bd')
  findOnePoa(@Param('id') id: string) {
    return this.service.findOnePoa(id);
  }

  @Patch('poa/:id')
  @Roles('lawyer')
  updatePoa(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.updatePoa(id, body, userId);
  }

  @Patch('poa/:id/status')
  @Roles('lawyer')
  updatePoaStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.updatePoaStatus(id, body.status, userId);
  }

  @Delete('poa/:id')
  @Roles('lawyer')
  removePoa(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.removePoa(id, userId);
  }
}
