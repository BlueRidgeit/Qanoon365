import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';

type QualifyLeadInput = {
  clientId?: string;
  clientName?: string;
  clientType?: string;
};

@Injectable()
export class LeadsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(data: {
    subject: string;
    caseType: string;
    jurisdiction: string;
    urgency: string;
    caseSummary: string;
    clientName?: string;
    clientType?: string;
    opposingPartyNames?: string;
    estimatedValue?: number;
    referralSource?: string;
    assignedTo?: string;
  }, userId: string) {
    const lead = await this.prisma.lead.create({
      data: { ...data, createdBy: userId, updatedBy: userId },
    });
    await this.audit.log({
      entityType: 'lead', entityId: lead.id,
      action: 'create', performedBy: userId,
    });
    return lead;
  }

  async findAll(params: { cursor?: string; limit?: number; status?: string }) {
    const limit = params.limit ?? 20;
    const where: any = {};
    if (params.status) where.status = params.status;
    const query: any = { where, orderBy: { createdAt: 'desc' as const }, take: limit };
    if (params.cursor) { query.cursor = { id: params.cursor }; query.skip = 1; }
    return this.prisma.lead.findMany(query);
  }

  async findOne(id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async update(id: string, data: Record<string, any>, userId: string) {
    await this.findOne(id);
    const lead = await this.prisma.lead.update({
      where: { id },
      data: { ...data, updatedBy: userId },
    });
    await this.audit.log({
      entityType: 'lead', entityId: id,
      action: 'update', performedBy: userId,
    });
    return lead;
  }

  async qualify(id: string, userId: string, input: QualifyLeadInput = {}) {
    let previousStatus: string | undefined;
    const result = await this.prisma.$transaction(async (tx) => {
      const lead = await tx.lead.findUnique({ where: { id } });
      if (!lead) throw new NotFoundException('Lead not found');

      previousStatus = lead.status;

      if (lead.status === 'qualified' || lead.status === 'converted') {
        throw new BadRequestException('Lead is already qualified or converted');
      }
      if (!lead.subject || !lead.caseType || !lead.jurisdiction || !lead.caseSummary) {
        throw new BadRequestException('Required fields missing for qualification');
      }

      let clientId: string;

      if (input.clientId) {
        const existingClient = await tx.client.findUnique({ where: { id: input.clientId } });
        if (!existingClient) {
          throw new NotFoundException('Client not found');
        }
        clientId = existingClient.id;
      } else {
        const clientName = (input.clientName ?? lead.clientName)?.trim();
        if (!clientName) {
          throw new BadRequestException('Client name or client ID is required to qualify a lead');
        }

        const client = await tx.client.create({
          data: {
            name: clientName,
            clientType: input.clientType ?? lead.clientType ?? 'individual',
            createdBy: userId,
            updatedBy: userId,
          },
        });
        clientId = client.id;
      }

      const opportunity = await tx.opportunity.create({
        data: {
          clientId,
          name: lead.subject,
          practiceArea: lead.caseType,
          assignedPartner: userId,
          leadId: lead.id,
          estimatedValue: lead.estimatedValue,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      const updatedLead = await tx.lead.update({
        where: { id },
        data: {
          status: 'converted',
          convertedOpportunityId: opportunity.id,
          updatedBy: userId,
        },
      });

      return { lead: updatedLead, opportunity, clientId };
    });

    await this.audit.log({
      entityType: 'lead',
      entityId: id,
      action: 'stage_change',
      performedBy: userId,
      fieldChanged: 'status',
      oldValue: previousStatus,
      newValue: 'converted',
    });

    return result;
  }
}
