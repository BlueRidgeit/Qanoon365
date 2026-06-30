import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { TasksService } from './tasks.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@Controller('tasks')
export class TasksController {
  constructor(private service: TasksService) {}

  @Post()
  @Roles('lawyer')
  create(
    @Body()
    body: {
      title: string;
      description?: string;
      entityType?: string;
      entityId?: string;
      priority?: string;
      assignedTo?: string;
      dueDate?: string;
      tags?: string;
      status?: string;
      taskType?: string;
      approvalStatus?: string;
    },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.create(body, userId);
  }

  @Get()
  @Roles('bd')
  findAll(
    @Query('status') status?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('priority') priority?: string,
    @Query('taskType') taskType?: string,
    @Query('approvalStatus') approvalStatus?: string,
    @Query('search') search?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll({
      status,
      assignedTo,
      entityType,
      entityId,
      priority,
      taskType,
      approvalStatus,
      search,
      cursor,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('kanban')
  @Roles('bd')
  getKanbanBoard(
    @Query('assignedTo') assignedTo?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('taskType') taskType?: string,
    @Query('approvalStatus') approvalStatus?: string,
    @Query('search') search?: string,
  ) {
    return this.service.getKanbanBoard({
      assignedTo,
      entityType,
      entityId,
      taskType,
      approvalStatus,
      search,
    });
  }

  @Get(':id')
  @Roles('bd')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles('lawyer')
  update(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.update(id, body, userId);
  }

  @Patch(':id/status')
  @Roles('bd')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.updateStatus(id, body.status, userId);
  }

  @Post('reorder')
  @Roles('bd')
  reorder(
    @Body() body: { taskIds: string[] },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.reorder(body.taskIds, userId);
  }

  @Delete(':id')
  @Roles('lawyer')
  deleteTask(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.deleteTask(id, userId);
  }
}
