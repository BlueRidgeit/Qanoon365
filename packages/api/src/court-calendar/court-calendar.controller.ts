import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { CourtCalendarService } from './court-calendar.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@Controller('court-calendar')
export class CourtCalendarController {
  constructor(private service: CourtCalendarService) {}

  // ── Hearings ──────────────────────────────────────────────

  @Post('hearings')
  @Roles('lawyer')
  createHearing(
    @Body()
    body: {
      matterId: string;
      eventType: string;
      title: string;
      description?: string;
      court?: string;
      courtRoom?: string;
      judge?: string;
      caseNumber?: string;
      scheduledDate: string;
      scheduledEndDate?: string;
      location?: string;
      reminderDays?: number;
      assignedTo?: string;
    },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.createHearing(body, userId);
  }

  @Get('hearings')
  @Roles('lawyer')
  findHearings(
    @Query('matterId') matterId?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('assignedTo') assignedTo?: string,
  ) {
    return this.service.findHearings({ matterId, status, from, to, assignedTo });
  }

  @Get('hearings/:id')
  @Roles('lawyer')
  findOneHearing(@Param('id') id: string) {
    return this.service.findOneHearing(id);
  }

  @Patch('hearings/:id')
  @Roles('lawyer')
  updateHearing(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.updateHearing(id, body, userId);
  }

  // ── Deadlines ─────────────────────────────────────────────

  @Post('deadlines')
  @Roles('lawyer')
  createDeadline(
    @Body()
    body: {
      matterId: string;
      deadlineType: string;
      title: string;
      description?: string;
      dueDate: string;
      priority?: string;
      reminderDays?: number;
      assignedTo?: string;
    },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.createDeadline(body, userId);
  }

  @Get('deadlines')
  @Roles('lawyer')
  findDeadlines(
    @Query('matterId') matterId?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('priority') priority?: string,
  ) {
    return this.service.findDeadlines({ matterId, status, from, to, assignedTo, priority });
  }

  @Patch('deadlines/:id/complete')
  @Roles('lawyer')
  completeDeadline(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.completeDeadline(id, userId);
  }

  // ── Calendar View ─────────────────────────────────────────

  @Get('events')
  @Roles('lawyer')
  getCalendarEvents(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('matterId') matterId?: string,
  ) {
    return this.service.getCalendarEvents({ from, to, matterId });
  }
}
