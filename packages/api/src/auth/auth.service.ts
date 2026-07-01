import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import type { JwtPayload } from './strategies/jwt.strategy.js';
import { MicrosoftTokenService } from './microsoft-token.service.js';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private microsoftTokenService: MicrosoftTokenService,
  ) {}

  async register(dto: {
    email: string;
    password?: string;
    firstName: string;
    lastName: string;
    role: string;
    tenantId: string;
  }) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Password is optional. Microsoft-provisioned users never sign in with a
    // password, so store a random, unusable secret when none is supplied.
    const rawPassword =
      dto.password && dto.password.length > 0 ? dto.password : randomUUID();
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        tenantId: dto.tenantId,
      },
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };
  }

  async loginWithMicrosoft(accessToken: string) {
    const identity = await this.microsoftTokenService.verifyQanoonAccessToken(accessToken);

    let user = await this.prisma.user.findFirst({
      where: {
        email: {
          equals: identity.email,
          mode: 'insensitive',
        },
      },
    });

    if (!user) {
      if (!this.isMicrosoftAutoProvisionEnabled()) {
        throw new ForbiddenException(
          `No Qanoon account is provisioned for ${identity.email}.`,
        );
      }

      const firstName = identity.firstName ?? this.deriveFirstName(identity.displayName);
      const lastName = identity.lastName ?? this.deriveLastName(identity.displayName);

      user = await this.prisma.user.create({
        data: {
          email: identity.email,
          passwordHash: await bcrypt.hash(randomUUID(), 10),
          firstName,
          lastName,
          role: this.config.get<string>('AUTH_DEFAULT_ROLE', 'lawyer'),
          tenantId: this.config.get<string>('AUTH_DEFAULT_TENANT_ID', 'default'),
        },
      });
    }

    if (!user.isActive) {
      throw new ForbiddenException('Your Qanoon account is inactive.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.issueTokens(
      user.id,
      user.tenantId,
      user.role,
      user.email,
      user.firstName,
      user.lastName,
    );
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });

      // Set tenant context
      await this.prisma.$executeRawUnsafe(
        `SET search_path TO "tenant_${payload.tenantId}", public`,
      );

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      return this.issueTokens(
        user.id,
        user.tenantId,
        user.role,
        user.email,
        user.firstName,
        user.lastName,
      );
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private issueTokens(
    userId: string,
    tenantId: string,
    role: string,
    email: string,
    firstName?: string,
    lastName?: string,
  ) {
    const payload: JwtPayload = { sub: userId, tenantId, role, email, firstName, lastName };

    const accessToken = this.jwt.sign(payload as unknown as Record<string, unknown>, {
      secret: this.config.getOrThrow<string>('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN', '15m') as any,
    });

    const refreshToken = this.jwt.sign(payload as unknown as Record<string, unknown>, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d') as any,
    });

    return { accessToken, refreshToken };
  }

  private isMicrosoftAutoProvisionEnabled() {
    return this.config.get<string>('AUTH_AUTO_PROVISION_MICROSOFT_USERS', 'false') === 'true';
  }

  private deriveFirstName(displayName?: string) {
    const parts = (displayName ?? '').trim().split(/\s+/).filter(Boolean);
    return parts[0] ?? 'Qanoon';
  }

  private deriveLastName(displayName?: string) {
    const parts = (displayName ?? '').trim().split(/\s+/).filter(Boolean);
    return parts.length > 1 ? parts.slice(1).join(' ') : 'User';
  }
}
