import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlobServiceClient, type ContainerClient } from '@azure/storage-blob';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  detectImageType,
  sanitizeBranding,
  type Branding,
  type LogoSlot,
} from './branding.types.js';

const MAX_LOGO_BYTES = 1_000_000;

// Branding is stored in the tenant row (public.tenants.settings.branding) and the logo files in a
// Blob container, so no database migration is needed. A deployment that never saves any branding
// behaves exactly as before.
@Injectable()
export class BrandingService {
  private blobServiceClient?: BlobServiceClient;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const connectionString = this.config.get<string>('AZURE_STORAGE_CONNECTION_STRING');
    if (connectionString) {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    }
  }

  // Branding is deployment-wide. Unauthenticated reads (the login page) cannot know the tenant,
  // so they use the configured default tenant.
  private get tenantId(): string {
    return this.config.get<string>('BRANDING_TENANT_ID') ?? 'default';
  }

  private async readSettings(): Promise<Record<string, unknown>> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: this.tenantId } });
    const settings = tenant?.settings;
    return settings && typeof settings === 'object' && !Array.isArray(settings)
      ? (settings as Record<string, unknown>)
      : {};
  }

  async get(): Promise<Branding> {
    try {
      const settings = await this.readSettings();
      return sanitizeBranding(settings.branding);
    } catch {
      return { colors: {}, logos: {} };
    }
  }

  async save(input: unknown): Promise<Branding> {
    const incoming = sanitizeBranding(input);
    const current = await this.get();
    // Logo versions are managed by the upload/delete endpoints, never by this request.
    const next: Branding = { ...incoming, logos: current.logos };
    await this.write(next);
    return next;
  }

  private async write(branding: Branding) {
    const settings = await this.readSettings();
    await this.prisma.tenant.update({
      where: { id: this.tenantId },
      data: { settings: { ...settings, branding } as never },
    });
  }

  private async container(): Promise<ContainerClient> {
    if (!this.blobServiceClient) {
      throw new ServiceUnavailableException(
        'Logo storage is not configured (AZURE_STORAGE_CONNECTION_STRING).',
      );
    }
    const client = this.blobServiceClient.getContainerClient(`branding-${this.tenantId}`.toLowerCase());
    await client.createIfNotExists();
    return client;
  }

  async uploadLogo(slot: LogoSlot, file: { buffer: Buffer; size: number } | undefined): Promise<Branding> {
    if (!file || !file.buffer?.length) {
      throw new BadRequestException('Choose an image file.');
    }
    if (file.size > MAX_LOGO_BYTES) {
      throw new BadRequestException('The image must be 1 MB or smaller.');
    }
    const contentType = detectImageType(file.buffer);
    if (!contentType) {
      throw new BadRequestException('Use a PNG, JPEG, WebP or SVG image.');
    }

    const container = await this.container();
    await container.getBlockBlobClient(`logo-${slot}`).uploadData(file.buffer, {
      blobHTTPHeaders: { blobContentType: contentType },
    });

    const current = await this.get();
    const next: Branding = { ...current, logos: { ...current.logos, [slot]: Date.now() } };
    await this.write(next);
    return next;
  }

  async deleteLogo(slot: LogoSlot): Promise<Branding> {
    const container = await this.container();
    await container.getBlockBlobClient(`logo-${slot}`).deleteIfExists();
    const current = await this.get();
    const logos = { ...current.logos };
    delete logos[slot];
    const next: Branding = { ...current, logos };
    await this.write(next);
    return next;
  }

  async readLogo(slot: LogoSlot): Promise<{ data: Buffer; contentType: string }> {
    const container = await this.container();
    const blob = container.getBlockBlobClient(`logo-${slot}`);
    if (!(await blob.exists())) {
      throw new NotFoundException();
    }
    const props = await blob.getProperties();
    return {
      data: await blob.downloadToBuffer(),
      contentType: props.contentType ?? 'application/octet-stream',
    };
  }
}
