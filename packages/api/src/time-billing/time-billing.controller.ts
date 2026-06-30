import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { TimeBillingService } from './time-billing.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@Controller('time-billing')
export class TimeBillingController {
  constructor(private service: TimeBillingService) {}

  // ── Time Entries ──────────────────────────────────────────

  @Post('time-entries')
  @Roles('lawyer')
  createTimeEntry(
    @Body()
    body: {
      matterId: string;
      entryDate: string;
      durationMinutes: number;
      briefNote: string;
      activityType: string;
      isBillable?: boolean;
    },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.createTimeEntry(body, userId);
  }

  @Get('time-entries')
  @Roles('lawyer')
  findTimeEntries(
    @Query('matterId') matterId?: string,
    @Query('userId') userId?: string,
    @Query('isBilled') isBilled?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findTimeEntries({
      matterId,
      userId,
      isBilled: isBilled !== undefined ? isBilled === 'true' : undefined,
      cursor,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('time-entries/:id')
  @Roles('lawyer')
  findOneTimeEntry(@Param('id') id: string) {
    return this.service.findOneTimeEntry(id);
  }

  @Patch('time-entries/:id')
  @Roles('lawyer')
  updateTimeEntry(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.updateTimeEntry(id, body, userId);
  }

  @Delete('time-entries/:id')
  @Roles('lawyer')
  deleteTimeEntry(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.deleteTimeEntry(id, userId);
  }

  @Post('time-entries/:id/generate-narrative')
  @Roles('lawyer')
  generateNarrative(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.generateNarrative(id, userId);
  }

  // ── Billing Rates ─────────────────────────────────────────

  @Post('billing-rates')
  @Roles('partner')
  createBillingRate(
    @Body()
    body: {
      userId?: string;
      role?: string;
      practiceArea?: string;
      hourlyRate: number;
      currency?: string;
      effectiveFrom: string;
      effectiveTo?: string;
    },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.createBillingRate(body, userId);
  }

  @Get('billing-rates')
  @Roles('lawyer')
  findBillingRates(@Query('userId') userId?: string) {
    return this.service.findBillingRates(userId);
  }

  // ── Invoices ──────────────────────────────────────────────

  @Post('invoices')
  @Roles('partner')
  createInvoice(
    @Body() body: { matterId: string; clientId: string; notes?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.createInvoice(body, userId);
  }

  @Get('invoices')
  @Roles('lawyer')
  findInvoices(
    @Query('matterId') matterId?: string,
    @Query('clientId') clientId?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findInvoices({ matterId, clientId, status });
  }

  @Get('invoices/:id')
  @Roles('lawyer')
  findOneInvoice(@Param('id') id: string) {
    return this.service.findOneInvoice(id);
  }

  @Patch('invoices/:id/status')
  @Roles('partner')
  updateInvoiceStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.updateInvoiceStatus(id, body.status, userId);
  }
}
