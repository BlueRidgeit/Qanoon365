import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UsersService } from './users.service.js';

// Admin-only user management.
@Controller('users')
export class UsersController {
  constructor(private service: UsersService) {}

  @Roles('admin')
  @Get()
  list(@CurrentUser('tenantId') tenantId: string) {
    return this.service.list(tenantId);
  }

  @Roles('admin')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { role?: string; isActive?: boolean; firstName?: string; lastName?: string },
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actingUserId: string,
  ) {
    return this.service.update(id, tenantId, actingUserId, {
      role: typeof body?.role === 'string' ? body.role : undefined,
      isActive: typeof body?.isActive === 'boolean' ? body.isActive : undefined,
      firstName: typeof body?.firstName === 'string' ? body.firstName : undefined,
      lastName: typeof body?.lastName === 'string' ? body.lastName : undefined,
    });
  }

  @Roles('admin')
  @Post(':id/invite')
  async resendInvite(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('firstName') inviterFirst: string | undefined,
    @CurrentUser('lastName') inviterLast: string | undefined,
    @Req() req: Request,
  ) {
    const proto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0] ?? 'https';
    const host = (req.headers['x-forwarded-host'] as string | undefined) ?? req.headers.host ?? '';
    const invite = await this.service.resendInvite(
      id,
      tenantId,
      [inviterFirst, inviterLast].filter(Boolean).join(' ') || undefined,
      `${proto}://${host}`,
    );
    return { invite };
  }
}
