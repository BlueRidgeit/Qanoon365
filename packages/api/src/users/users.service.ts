import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { InvitationService, type InviteOutcome } from '../auth/invitation.service.js';

export const USER_ROLES = ['admin', 'partner', 'compliance', 'lawyer', 'bd'] as const;

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

// "Manage users": list people, change role, remove/restore access, resend the invitation.
// Removing access deactivates the account (it keeps matters/tasks/audit history intact) and the
// person can no longer sign in; restoring turns it back on.
@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private invitations: InvitationService,
  ) {}

  list(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: USER_SELECT,
      orderBy: [{ isActive: 'desc' }, { firstName: 'asc' }, { lastName: 'asc' }],
    });
  }

  private async find(id: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({ where: { id, tenantId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  // At least one active administrator must always remain.
  private async assertNotLastAdmin(tenantId: string, excludingUserId: string) {
    const others = await this.prisma.user.count({
      where: { tenantId, role: 'admin', isActive: true, id: { not: excludingUserId } },
    });
    if (others === 0) {
      throw new BadRequestException('There must be at least one active administrator.');
    }
  }

  async update(
    id: string,
    tenantId: string,
    actingUserId: string,
    changes: { role?: string; isActive?: boolean; firstName?: string; lastName?: string },
  ) {
    const user = await this.find(id, tenantId);
    const data: { role?: string; isActive?: boolean; firstName?: string; lastName?: string } = {};

    if (changes.role !== undefined && changes.role !== user.role) {
      if (!(USER_ROLES as readonly string[]).includes(changes.role)) {
        throw new BadRequestException('Unknown role.');
      }
      if (id === actingUserId) {
        throw new BadRequestException('You cannot change your own role.');
      }
      if (user.role === 'admin') {
        await this.assertNotLastAdmin(tenantId, id);
      }
      data.role = changes.role;
    }

    if (changes.isActive !== undefined && changes.isActive !== user.isActive) {
      if (!changes.isActive) {
        if (id === actingUserId) {
          throw new BadRequestException('You cannot remove your own access.');
        }
        if (user.role === 'admin') {
          await this.assertNotLastAdmin(tenantId, id);
        }
      }
      data.isActive = changes.isActive;
    }

    for (const key of ['firstName', 'lastName'] as const) {
      const value = changes[key]?.trim();
      if (value) data[key] = value.slice(0, 100);
    }

    if (Object.keys(data).length === 0) {
      return this.prisma.user.findUniqueOrThrow({ where: { id }, select: USER_SELECT });
    }
    return this.prisma.user.update({ where: { id }, data, select: USER_SELECT });
  }

  async resendInvite(
    id: string,
    tenantId: string,
    invitedBy: string | undefined,
    apiOrigin: string,
  ): Promise<InviteOutcome> {
    const user = await this.find(id, tenantId);
    if (!user.isActive) {
      throw new BadRequestException('Restore this user before sending an invitation.');
    }
    return this.invitations.invite({
      to: user.email,
      name: [user.firstName, user.lastName].filter(Boolean).join(' '),
      role: user.role,
      invitedBy,
      apiOrigin,
    });
  }
}
