import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ContactsService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    clientId: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    jobTitle?: string;
    isPrimary?: boolean;
  }, userId: string) {
    return this.prisma.contact.create({
      data: { ...data, isPrimary: data.isPrimary ?? false, createdBy: userId, updatedBy: userId },
    });
  }

  async findAll(clientId?: string) {
    const where = clientId ? { clientId } : {};
    return this.prisma.contact.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const contact = await this.prisma.contact.findUnique({ where: { id } });
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async update(id: string, data: Record<string, any>, userId: string) {
    await this.findOne(id);
    return this.prisma.contact.update({ where: { id }, data: { ...data, updatedBy: userId } });
  }
}
