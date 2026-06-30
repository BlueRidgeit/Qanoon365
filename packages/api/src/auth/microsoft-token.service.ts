import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

interface MicrosoftAccessTokenClaims extends JWTPayload {
  oid?: string;
  tid?: string;
  preferred_username?: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  scp?: string;
}

export interface VerifiedMicrosoftUser {
  entraObjectId: string;
  entraTenantId: string;
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
}

@Injectable()
export class MicrosoftTokenService {
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

  constructor(private readonly config: ConfigService) {}

  async verifyQanoonAccessToken(accessToken: string): Promise<VerifiedMicrosoftUser> {
    const tenantId = this.config.getOrThrow<string>('AZURE_ENTRA_TENANT_ID');
    const scopeName = this.config.get<string>('AZURE_ENTRA_QANOON_SCOPE_NAME', 'access_as_user');
    const audiences = this.getAllowedAudiences();

    const { payload } = await jwtVerify(accessToken, this.getJwks(), {
      issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
      audience: audiences.length === 1 ? audiences[0] : audiences,
    }).catch((error) => {
      throw new UnauthorizedException(
        error instanceof Error ? error.message : 'Invalid Microsoft access token.',
      );
    });

    const claims = payload as MicrosoftAccessTokenClaims;
    const email = claims.preferred_username ?? claims.email;
    const entraObjectId = claims.oid ?? claims.sub;

    if (!claims.tid || claims.tid !== tenantId) {
      throw new UnauthorizedException('Microsoft tenant is not allowed for Qanoon.');
    }

    if (!email || !entraObjectId) {
      throw new UnauthorizedException('Microsoft access token is missing required identity claims.');
    }

    const scopes = (claims.scp ?? '')
      .split(' ')
      .map((scope) => scope.trim())
      .filter(Boolean);

    if (scopeName && !scopes.includes(scopeName)) {
      throw new UnauthorizedException('Microsoft access token is missing the required Qanoon scope.');
    }

    return {
      entraObjectId,
      entraTenantId: claims.tid,
      email: email.toLowerCase(),
      displayName: claims.name,
      firstName: claims.given_name,
      lastName: claims.family_name,
    };
  }

  private getAllowedAudiences() {
    const configuredAudience = this.config
      .get<string>('AZURE_ENTRA_QANOON_API_AUDIENCE', '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    const apiClientId = this.config.get<string>('AZURE_ENTRA_QANOON_API_CLIENT_ID');
    if (apiClientId) {
      configuredAudience.push(apiClientId);
      configuredAudience.push(`api://${apiClientId}`);
    }

    const audiences = [...new Set(configuredAudience)];
    if (audiences.length === 0) {
      throw new UnauthorizedException('Qanoon Microsoft API audience is not configured.');
    }

    return audiences;
  }

  private getJwks() {
    if (!this.jwks) {
      const tenantId = this.config.getOrThrow<string>('AZURE_ENTRA_TENANT_ID');
      this.jwks = createRemoteJWKSet(
        new URL(`https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`),
      );
    }

    return this.jwks;
  }
}
