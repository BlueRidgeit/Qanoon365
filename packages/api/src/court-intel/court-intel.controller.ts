import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { CourtIntelService } from './court-intel.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@Controller('court-intel')
export class CourtIntelController {
  constructor(private service: CourtIntelService) {}

  @Post('query')
  @Roles('lawyer')
  executeQuery(
    @Body() body: {
      queryType: 'party_intelligence' | 'comparable_case' | 'contextual_case_law' | 'opposing_counsel';
      partyName?: string;
      caseType?: string;
      jurisdiction?: string;
      practiceArea?: string;
      firmName?: string;
      lawyerName?: string;
      keywords?: string;
      matterId?: string;
      opportunityId?: string;
      clientId?: string;
    },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.executeQuery(body, userId);
  }

  @Get('history')
  @Roles('lawyer')
  getHistory(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.service.getQueryHistory(entityType, entityId);
  }
}
