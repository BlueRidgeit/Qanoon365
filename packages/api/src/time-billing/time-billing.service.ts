import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AzureOpenAI } from 'openai';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';

const NARRATIVE_SYSTEM_PROMPT = `You are a billing narrative specialist at a UAE law firm.
Convert brief time entry notes into professional billing narratives suitable for client invoices.

RULES:
- Expand abbreviations and short notes into full, professional language
- Use formal legal billing style (e.g. "Telephone conference with client regarding...")
- Include relevant context from the matter if provided
- Keep narratives concise but descriptive (1-3 sentences)
- Use active voice and past tense
- Never fabricate details not supported by the note or matter context
- Respond with ONLY the narrative text, no JSON or formatting`;

@Injectable()
export class TimeBillingService {
  private readonly logger = new Logger(TimeBillingService.name);
  private openai: AzureOpenAI;
  private deploymentName: string;

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private config: ConfigService,
  ) {
    const endpoint = this.config.getOrThrow<string>('AZURE_OPENAI_ENDPOINT');
    const apiKey = this.config.getOrThrow<string>('AZURE_OPENAI_API_KEY');
    const apiVersion = this.config.get<string>(
      'AZURE_OPENAI_API_VERSION',
      '2024-12-01-preview',
    );
    this.deploymentName = this.config.get<string>(
      'AZURE_OPENAI_DEPLOYMENT',
      'gpt-4o',
    );
    this.openai = new AzureOpenAI({ endpoint, apiKey, apiVersion });
  }

  // ── Time Entries ──────────────────────────────────────────

  async createTimeEntry(
    data: {
      matterId: string;
      entryDate: string;
      durationMinutes: number;
      briefNote: string;
      activityType: string;
      isBillable?: boolean;
    },
    userId: string,
  ) {
    // Look up billing rate for this user
    const rate = await this.prisma.billingRate.findFirst({
      where: {
        userId,
        isActive: true,
        effectiveFrom: { lte: new Date(data.entryDate) },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: new Date(data.entryDate) } },
        ],
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    const rateAmount = rate?.hourlyRate ?? null;
    const totalAmount =
      rateAmount !== null
        ? (Number(rateAmount) * data.durationMinutes) / 60
        : null;

    const entry = await this.prisma.timeEntry.create({
      data: {
        matterId: data.matterId,
        userId,
        entryDate: new Date(data.entryDate),
        durationMinutes: data.durationMinutes,
        briefNote: data.briefNote,
        activityType: data.activityType,
        isBillable: data.isBillable ?? true,
        billingRateId: rate?.id,
        rateAmount,
        totalAmount,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    await this.audit.log({
      entityType: 'time_entry',
      entityId: entry.id,
      action: 'create',
      performedBy: userId,
    });

    return entry;
  }

  async findTimeEntries(params: {
    matterId?: string;
    userId?: string;
    isBilled?: boolean;
    cursor?: string;
    limit?: number;
  }) {
    const limit = params.limit ?? 50;
    const where: any = {};
    if (params.matterId) where.matterId = params.matterId;
    if (params.userId) where.userId = params.userId;
    if (params.isBilled !== undefined) where.isBilled = params.isBilled;

    const query: any = {
      where,
      orderBy: { entryDate: 'desc' as const },
      take: limit,
      include: { matter: { select: { id: true, matterNumber: true, name: true } } },
    };
    if (params.cursor) {
      query.cursor = { id: params.cursor };
      query.skip = 1;
    }
    return this.prisma.timeEntry.findMany(query);
  }

  async findOneTimeEntry(id: string) {
    const entry = await this.prisma.timeEntry.findUnique({
      where: { id },
      include: {
        matter: { select: { id: true, matterNumber: true, name: true } },
        billingRate: true,
      },
    });
    if (!entry) throw new NotFoundException('Time entry not found');
    return entry;
  }

  async updateTimeEntry(id: string, data: Record<string, any>, userId: string) {
    await this.findOneTimeEntry(id);
    const entry = await this.prisma.timeEntry.update({
      where: { id },
      data: { ...data, updatedBy: userId },
    });
    await this.audit.log({
      entityType: 'time_entry',
      entityId: id,
      action: 'update',
      performedBy: userId,
    });
    return entry;
  }

  async deleteTimeEntry(id: string, userId: string) {
    const entry = await this.findOneTimeEntry(id);
    if (entry.isBilled) {
      throw new BadRequestException('Cannot delete a billed time entry');
    }
    await this.prisma.timeEntry.delete({ where: { id } });
    await this.audit.log({
      entityType: 'time_entry',
      entityId: id,
      action: 'delete',
      performedBy: userId,
    });
    return { deleted: true };
  }

  // ── AI Narrative Generation ───────────────────────────────

  async generateNarrative(timeEntryId: string, userId: string) {
    const entry = await this.prisma.timeEntry.findUnique({
      where: { id: timeEntryId },
      include: {
        matter: { select: { name: true, practiceArea: true, matterNumber: true } },
      },
    });
    if (!entry) throw new NotFoundException('Time entry not found');

    const matterContext = entry.matter
      ? `Matter: ${entry.matter.matterNumber} — ${entry.matter.name} (${entry.matter.practiceArea ?? 'General'})`
      : '';

    const userMessage = `Generate a professional billing narrative for this time entry.

${matterContext}
Activity type: ${entry.activityType}
Duration: ${entry.durationMinutes} minutes
Brief note: ${entry.briefNote}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.deploymentName,
        messages: [
          { role: 'system', content: NARRATIVE_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      const narrative = response.choices[0]?.message?.content?.trim() ?? entry.briefNote;

      // Save the narrative back to the time entry
      await this.prisma.timeEntry.update({
        where: { id: timeEntryId },
        data: { narrative, updatedBy: userId },
      });

      await this.audit.log({
        entityType: 'time_entry',
        entityId: timeEntryId,
        action: 'ai_narrative',
        performedBy: userId,
        fieldChanged: 'narrative',
        newValue: narrative,
      });

      return { timeEntryId, narrative };
    } catch (error: any) {
      this.logger.error(`AI narrative generation failed: ${error.message}`);
      return { timeEntryId, narrative: entry.briefNote, error: 'AI generation failed' };
    }
  }

  // ── Billing Rates ─────────────────────────────────────────

  async createBillingRate(
    data: {
      userId?: string;
      role?: string;
      practiceArea?: string;
      hourlyRate: number;
      currency?: string;
      effectiveFrom: string;
      effectiveTo?: string;
    },
    createdBy: string,
  ) {
    const rate = await this.prisma.billingRate.create({
      data: {
        userId: data.userId,
        role: data.role,
        practiceArea: data.practiceArea,
        hourlyRate: data.hourlyRate,
        currency: data.currency ?? 'AED',
        effectiveFrom: new Date(data.effectiveFrom),
        effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : undefined,
        createdBy,
        updatedBy: createdBy,
      },
    });
    return rate;
  }

  async findBillingRates(userId?: string) {
    const where: any = { isActive: true };
    if (userId) where.userId = userId;
    return this.prisma.billingRate.findMany({
      where,
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  // ── Invoices ──────────────────────────────────────────────

  async createInvoice(
    data: { matterId: string; clientId: string; notes?: string },
    userId: string,
  ) {
    // Get unbilled time entries for this matter
    const unbilled = await this.prisma.timeEntry.findMany({
      where: { matterId: data.matterId, isBilled: false, isBillable: true },
    });

    if (unbilled.length === 0) {
      throw new BadRequestException('No unbilled time entries for this matter');
    }

    const subtotal = unbilled.reduce(
      (sum, e) => sum + Number(e.totalAmount ?? 0),
      0,
    );
    const vatRate = 0.05; // UAE VAT
    const vatAmount = Math.round(subtotal * vatRate * 100) / 100;
    const totalAmount = Math.round((subtotal + vatAmount) * 100) / 100;

    // Generate invoice number
    const count = await this.prisma.invoice.count();
    const invoiceNumber = `INV-${String(count + 1).padStart(5, '0')}`;

    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        matterId: data.matterId,
        clientId: data.clientId,
        subtotal,
        vatRate,
        vatAmount,
        totalAmount,
        notes: data.notes,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    // Mark time entries as billed
    await this.prisma.timeEntry.updateMany({
      where: { id: { in: unbilled.map((e) => e.id) } },
      data: { isBilled: true, invoiceId: invoice.id },
    });

    await this.audit.log({
      entityType: 'invoice',
      entityId: invoice.id,
      action: 'create',
      performedBy: userId,
      newValue: invoiceNumber,
    });

    return { ...invoice, lineItemCount: unbilled.length };
  }

  async findInvoices(params: { matterId?: string; clientId?: string; status?: string }) {
    const where: any = {};
    if (params.matterId) where.matterId = params.matterId;
    if (params.clientId) where.clientId = params.clientId;
    if (params.status) where.status = params.status;

    return this.prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        matter: { select: { id: true, matterNumber: true, name: true } },
        client: { select: { id: true, name: true } },
      },
    });
  }

  async findOneInvoice(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        matter: { select: { id: true, matterNumber: true, name: true } },
        client: { select: { id: true, name: true } },
        timeEntries: true,
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async updateInvoiceStatus(
    id: string,
    status: string,
    userId: string,
  ) {
    const invoice = await this.findOneInvoice(id);
    const data: any = { status, updatedBy: userId };
    if (status === 'issued') data.issuedDate = new Date();
    if (status === 'paid') data.paidDate = new Date();

    const updated = await this.prisma.invoice.update({
      where: { id },
      data,
    });

    await this.audit.log({
      entityType: 'invoice',
      entityId: id,
      action: 'stage_change',
      performedBy: userId,
      fieldChanged: 'status',
      oldValue: invoice.status,
      newValue: status,
    });

    return updated;
  }
}
