import { Controller, Post, Get, Body, Req, Logger } from '@nestjs/common';
import { AiDraftingService } from './ai-drafting.service.js';
import { DraftRequest, DraftTemplateType } from './ai-drafting.provider.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@Controller('ai-drafting')
export class AiDraftingController {
  private readonly logger = new Logger(AiDraftingController.name);

  constructor(private draftingService: AiDraftingService) {}

  @Get('templates')
  getTemplates() {
    return this.draftingService.getTemplates();
  }

  @Post('generate')
  @Roles('admin', 'partner', 'lawyer')
  async generateDraft(
    @Body()
    body: {
      templateType: DraftTemplateType;
      entityType: 'matter' | 'opportunity';
      entityId: string;
      additionalContext?: string;
      language?: 'en' | 'ar';
    },
    @Req() req: any,
  ) {
    const userId = req.user?.sub ?? req.user?.id ?? 'unknown';

    const request: DraftRequest = {
      templateType: body.templateType,
      entityType: body.entityType,
      entityId: body.entityId,
      additionalContext: body.additionalContext,
      language: body.language,
    };

    return this.draftingService.generateDraft(request, userId);
  }
}
