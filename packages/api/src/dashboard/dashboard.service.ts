import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getPipelineSummary() {
    const stages = ['inquiry', 'consultation', 'proposal', 'retainer', 'won', 'lost'];
    const counts: Record<string, number> = {};

    for (const stage of stages) {
      counts[stage] = await this.prisma.opportunity.count({ where: { stage } });
    }

    const totalEstimatedValue = await this.prisma.opportunity.aggregate({
      _sum: { estimatedValue: true },
      where: { stage: { notIn: ['lost'] } },
    });

    return {
      stages: counts,
      totalActive: Object.entries(counts)
        .filter(([s]) => !['won', 'lost'].includes(s))
        .reduce((sum, [, c]) => sum + c, 0),
      totalWon: counts['won'] ?? 0,
      totalLost: counts['lost'] ?? 0,
      totalEstimatedValue: totalEstimatedValue._sum.estimatedValue
        ? Number(totalEstimatedValue._sum.estimatedValue)
        : 0,
    };
  }

  async getConflictSummary() {
    const statuses = ['pending', 'cleared', 'confirmed_conflict', 'waived'];
    const counts: Record<string, number> = {};

    for (const status of statuses) {
      counts[status] = await this.prisma.conflictRecord.count({
        where: { resolutionStatus: status },
      });
    }

    // Opportunities with unresolved conflicts
    const opportunitiesWithConflicts = await this.prisma.opportunity.count({
      where: { conflictCheckStatus: { in: ['in_progress', 'conflict_identified'] } },
    });

    return {
      resolutionStatuses: counts,
      totalPending: counts['pending'] ?? 0,
      opportunitiesWithConflicts,
    };
  }

  async getKycComplianceSummary() {
    const statuses = ['not_started', 'documents_requested', 'under_review', 'verified', 'expired', 'rejected'];
    const clientCounts: Record<string, number> = {};

    for (const status of statuses) {
      clientCounts[status] = await this.prisma.client.count({
        where: { kycStatus: status, isActive: true },
      });
    }

    const totalClients = await this.prisma.client.count({ where: { isActive: true } });
    const verifiedCount = clientCounts['verified'] ?? 0;
    const complianceRate = totalClients > 0 ? Math.round((verifiedCount / totalClients) * 100) : 0;

    return {
      clientStatuses: clientCounts,
      totalClients,
      verifiedCount,
      complianceRate,
      expiredCount: clientCounts['expired'] ?? 0,
    };
  }

  async getOverview() {
    const [pipeline, conflicts, kyc] = await Promise.all([
      this.getPipelineSummary(),
      this.getConflictSummary(),
      this.getKycComplianceSummary(),
    ]);

    const recentActivities = await this.prisma.activity.findMany({
      take: 10,
      orderBy: { activityDate: 'desc' },
    });

    const activeMatters = await this.prisma.matter.count({
      where: { status: 'active' },
    });

    return {
      pipeline,
      conflicts,
      kyc,
      activeMatters,
      recentActivities,
    };
  }
}
