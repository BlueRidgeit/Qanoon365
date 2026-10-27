import { Controller, Post, Body, HttpCode, HttpStatus, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import { InvitationService } from './invitation.service.js';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private invitations: InvitationService,
  ) {}

  @Public()
  @Post('microsoft')
  @HttpCode(HttpStatus.OK)
  async microsoft(@Body() body: { accessToken: string }) {
    return this.authService.loginWithMicrosoft(body.accessToken);
  }

  @Roles('admin')
  @Post('register')
  async register(
    @Body()
    body: {
      email: string;
      password?: string;
      firstName: string;
      lastName: string;
      role: string;
      sendInvite?: boolean;
    },
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('firstName') inviterFirst: string | undefined,
    @CurrentUser('lastName') inviterLast: string | undefined,
    @Req() req: Request,
  ) {
    const { sendInvite, ...dto } = body;
    const user = await this.authService.register({ ...dto, tenantId });
    if (sendInvite === false) {
      return { ...user, invite: { status: 'skipped' as const } };
    }

    const proto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0] ?? 'https';
    const host = (req.headers['x-forwarded-host'] as string | undefined) ?? req.headers.host ?? '';
    const invite = await this.invitations.invite({
      to: user.email,
      name: [user.firstName, user.lastName].filter(Boolean).join(' '),
      role: user.role,
      invitedBy: [inviterFirst, inviterLast].filter(Boolean).join(' ') || undefined,
      apiOrigin: `${proto}://${host}`,
    });
    return { ...user, invite };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refresh(body.refreshToken);
  }
}
