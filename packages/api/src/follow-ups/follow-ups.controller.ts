import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { FollowUpsService } from './follow-ups.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@Controller('follow-ups')
export class FollowUpsController {
  constructor(private service: FollowUpsService) {}

  // ── Rules ─────────────────────────────────────────────────

  @Post('rules')
  @Roles('lawyer')
  createRule(
    @Body()
    body: {
      executionFileId: string;
      intervalDays?: number;
      courtContactId: string;
      templateLanguage?: string;
    },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.createRule(body, userId);
  }

  @Get('rules/:executionFileId')
  @Roles('bd')
  getRule(@Param('executionFileId') executionFileId: string) {
    return this.service.getRule(executionFileId);
  }

  @Patch('rules/:id')
  @Roles('lawyer')
  updateRule(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.updateRule(id, body, userId);
  }

  @Delete('rules/:id')
  @Roles('lawyer')
  deactivateRule(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.deactivateRule(id, userId);
  }

  // ── Logs ──────────────────────────────────────────────────

  @Get('logs')
  @Roles('bd')
  getLogs(
    @Query('executionFileId') executionFileId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getLogs({
      executionFileId,
      status,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  // ── Court Contacts ────────────────────────────────────────

  @Post('court-contacts')
  @Roles('lawyer')
  createCourtContact(
    @Body()
    body: {
      court: string;
      department?: string;
      contactName?: string;
      email: string;
      phone?: string;
    },
  ) {
    return this.service.createCourtContact(body);
  }

  @Get('court-contacts')
  @Roles('bd')
  getCourtContacts() {
    return this.service.getCourtContacts();
  }

  @Patch('court-contacts/:id')
  @Roles('lawyer')
  updateCourtContact(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.service.updateCourtContact(id, body);
  }

  @Delete('court-contacts/:id')
  @Roles('lawyer')
  deactivateCourtContact(@Param('id') id: string) {
    return this.service.deactivateCourtContact(id);
  }
}
