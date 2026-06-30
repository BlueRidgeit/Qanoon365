import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { LeadsService } from './leads.service.js';
import { IntakeAssistantService } from './intake-assistant.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@Controller('leads')
export class LeadsController {
  constructor(
    private service: LeadsService,
    private intake: IntakeAssistantService,
  ) {}

  @Post()
  @Roles('bd')
  create(
    @Body() body: { subject: string; caseType: string; jurisdiction: string; urgency: string; caseSummary: string; clientName?: string; clientType?: string; opposingPartyNames?: string; estimatedValue?: number; referralSource?: string; assignedTo?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.create(body, userId);
  }

  @Get()
  @Roles('bd')
  findAll(@Query('cursor') cursor?: string, @Query('limit') limit?: string, @Query('status') status?: string) {
    return this.service.findAll({ cursor, limit: limit ? parseInt(limit) : undefined, status });
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

  @Post('intake')
  @Roles('bd')
  async intakeParse(
    @Body() body: { rawText: string; autoCreate?: boolean },
    @CurrentUser('id') userId: string,
  ) {
    const parsed = await this.intake.parseEnquiry(body.rawText);

    if (body.autoCreate && parsed.confidence >= 0.5) {
      const lead = await this.service.create(
        {
          subject: parsed.subject,
          caseType: parsed.caseType,
          jurisdiction: parsed.jurisdiction,
          urgency: parsed.urgency,
          caseSummary: parsed.caseSummary,
          clientName: parsed.clientName,
          clientType: parsed.clientType,
          opposingPartyNames: parsed.opposingPartyNames,
          estimatedValue: parsed.estimatedValue,
          referralSource: parsed.referralSource,
        },
        userId,
      );
      return { parsed, lead, autoCreated: true };
    }

    return { parsed, lead: null, autoCreated: false };
  }

  @Post(':id/qualify')
  @Roles('lawyer')
  qualify(
    @Param('id') id: string,
    @Body() body: { clientId?: string; clientName?: string; clientType?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.qualify(id, userId, body);
  }
}
