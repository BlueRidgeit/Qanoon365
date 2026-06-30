import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ConflictsService } from './conflicts.service.js';
import { ConflictAnalysisService } from './conflict-analysis.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@Controller('conflicts')
export class ConflictsController {
  constructor(
    private service: ConflictsService,
    private analysis: ConflictAnalysisService,
  ) {}

  @Post()
  @Roles('compliance')
  create(
    @Body() body: {
      opportunityId: string;
      matchedEntityType: string;
      matchedEntityId: string;
      matchSource: string;
      matchConfidence: string;
      confidenceScore?: number;
      matchField?: string;
      relationshipPath?: string;
      courtCaseReference?: string;
      relatedMatterId?: string;
    },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.create(body, userId);
  }

  @Get()
  @Roles('lawyer')
  findAll(@Query('opportunityId') opportunityId?: string) {
    return this.service.findAll(opportunityId);
  }

  @Get(':id')
  @Roles('lawyer')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/resolve')
  @Roles('compliance')
  resolve(
    @Param('id') id: string,
    @Body() body: { resolutionStatus: string; resolutionNotes?: string },
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.service.resolve(id, body, userId, userRole);
  }

  @Post('auto-check')
  @Roles('lawyer')
  autoCheck(
    @Body() body: { opportunityId: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.analysis.analyzeOpportunity(body.opportunityId, userId);
  }
}
