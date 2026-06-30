import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import * as bcrypt from 'bcrypt';

@Injectable()
export class TenancyService {
  constructor(private prisma: PrismaService) {}

  async provisionTenant(dto: {
    id: string;
    name: string;
    slug: string;
    adminEmail: string;
    adminPassword: string;
  }) {
    // Check if tenant already exists
    const existing = await this.prisma.tenant.findUnique({ where: { id: dto.id } });
    if (existing) {
      throw new ConflictException(`Tenant "${dto.id}" already exists`);
    }

    const slugExists = await this.prisma.tenant.findUnique({ where: { slug: dto.slug } });
    if (slugExists) {
      throw new ConflictException(`Slug "${dto.slug}" already taken`);
    }

    // 1. Create tenant record in public schema
    const tenant = await this.prisma.tenant.create({
      data: {
        id: dto.id,
        name: dto.name,
        slug: dto.slug,
        isActive: true,
        settings: {},
      },
    });

    // 2. Create the tenant schema by cloning tenant_default
    const schemaName = `tenant_${dto.id}`;
    await this.createTenantSchema(schemaName);

    // 3. Create admin user in the new tenant schema
    // Use $transaction to ensure SET search_path and user.create share the same DB connection
    const passwordHash = await bcrypt.hash(dto.adminPassword, 10);
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET search_path TO "${schemaName}", public`);
      await tx.user.create({
        data: {
          email: dto.adminEmail,
          passwordHash,
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin',
          tenantId: dto.id,
          isActive: true,
        },
      });
    });

    return { tenant, message: `Tenant "${dto.id}" provisioned successfully` };
  }

  async getTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException(`Tenant "${id}" not found`);
    }
    return tenant;
  }

  async listTenants() {
    return this.prisma.tenant.findMany({ orderBy: { createdAt: 'desc' } });
  }

  private async createTenantSchema(schemaName: string) {
    // Create the new schema
    await this.prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

    // Read the migration SQL and adapt it for the new schema
    // We replicate the tenant_default tables into the new schema
    const tables = [
      'users', 'clients', 'contacts', 'leads', 'opportunities', 'matters',
      'conflict_records', 'kyc_records', 'opposing_parties', 'documents',
      'activities', 'court_intel_queries', 'notifications', 'audit_log',
    ];

    for (const table of tables) {
      await this.prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "${schemaName}"."${table}" (LIKE "tenant_default"."${table}" INCLUDING ALL)`,
      );
    }
  }
}
