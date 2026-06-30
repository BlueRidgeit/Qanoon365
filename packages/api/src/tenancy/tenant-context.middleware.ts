import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const user = (req as any).user;

    // Skip tenant scoping for unauthenticated routes (login, health, etc.)
    if (!user || !user.tenantId) {
      return next();
    }

    const tenantId = user.tenantId;

    // Validate tenant exists and is active
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant || !tenant.isActive) {
      throw new ForbiddenException('Tenant not found or inactive');
    }

    // Set PostgreSQL search_path to tenant schema
    await this.prisma.$executeRawUnsafe(
      `SET search_path TO "tenant_${tenantId}", public`,
    );

    // Attach tenant info to request for downstream use
    (req as any).tenantId = tenantId;

    next();
  }
}
