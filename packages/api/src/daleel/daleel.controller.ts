import { Controller, Post, Get, Delete, Body, Param, Req } from '@nestjs/common';
import { DaleelService } from './daleel.service.js';
import { ChatDto } from './dto/chat.dto.js';

@Controller('daleel')
export class DaleelController {
  constructor(private service: DaleelService) {}

  @Post('chat')
  chat(@Body() dto: ChatDto, @Req() req: any) {
    const userId = req.user?.sub ?? req.user?.id;
    const tenantId = req.user?.tenantId ?? 'default';
    return this.service.chat(dto, userId, tenantId);
  }

  @Get('conversations')
  getConversations(@Req() req: any) {
    const userId = req.user?.sub ?? req.user?.id;
    return this.service.getConversations(userId);
  }

  @Get('conversations/:id')
  getConversation(@Param('id') id: string) {
    return this.service.getConversation(id);
  }

  @Delete('conversations/:id')
  deleteConversation(@Param('id') id: string) {
    return this.service.deleteConversation(id);
  }
}
