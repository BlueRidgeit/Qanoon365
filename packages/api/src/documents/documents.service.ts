import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
// BigInt cannot be JSON-serialized; convert to Number for API responses
function serializeDocument(doc: any) {
  if (!doc) return doc;
  return {
    ...doc,
    fileSizeBytes: doc.fileSizeBytes != null ? Number(doc.fileSizeBytes) : null,
  };
}

import {
  BlobServiceClient,
  ContainerClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  StorageSharedKeyCredential,
  SASProtocol,
} from '@azure/storage-blob';

const SUPPORTED_DOCUMENT_ENTITY_TYPES = new Set([
  'client',
  'contact',
  'lead',
  'opportunity',
  'matter',
  'kyc_record',
  'execution_file',
] as const);

const DOCUMENT_ENTITY_ALIASES = {
  kyc: 'kyc_record',
} as const;

const SUPPORTED_DOCUMENT_CATEGORIES = new Set([
  'correspondence',
  'court_filing',
  'research',
  'contract',
  'kyc_document',
  'engagement_letter',
  'other',
]);

type SupportedDocumentEntityType =
  (typeof SUPPORTED_DOCUMENT_ENTITY_TYPES extends Set<infer T> ? T : never) &
  string;

@Injectable()
export class DocumentsService {
  private blobServiceClient: BlobServiceClient;
  private credential: StorageSharedKeyCredential;

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private config: ConfigService,
  ) {
    const connectionString = this.config.get<string>('AZURE_STORAGE_CONNECTION_STRING');
    if (connectionString) {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      const accountName = this.parseConnectionStringValue(connectionString, 'AccountName');
      const accountKey = this.parseConnectionStringValue(connectionString, 'AccountKey');
      this.credential = new StorageSharedKeyCredential(accountName, accountKey);
    }
  }

  private parseConnectionStringValue(connectionString: string, key: string): string {
    const match = connectionString.match(new RegExp(`${key}=([^;]+)`));
    if (!match) throw new Error(`Missing ${key} in connection string`);
    return match[1];
  }

  private getContainerName(tenantId: string): string {
    return `tenant-${tenantId}`;
  }

  private async ensureContainer(tenantId: string): Promise<ContainerClient> {
    if (!this.blobServiceClient) {
      throw new Error('Azure Blob Storage is not configured. Set AZURE_STORAGE_CONNECTION_STRING to enable document uploads.');
    }
    const containerName = this.getContainerName(tenantId);
    const containerClient = this.blobServiceClient.getContainerClient(containerName);
    await containerClient.createIfNotExists();
    return containerClient;
  }

  private normalizeEntityType(entityType?: string): SupportedDocumentEntityType {
    const trimmedEntityType = entityType?.trim();
    if (!trimmedEntityType) {
      throw new BadRequestException('Document entity type is required');
    }

    const aliasedEntityType =
      DOCUMENT_ENTITY_ALIASES[
        trimmedEntityType as keyof typeof DOCUMENT_ENTITY_ALIASES
      ] ?? trimmedEntityType;

    if (!SUPPORTED_DOCUMENT_ENTITY_TYPES.has(aliasedEntityType as SupportedDocumentEntityType)) {
      throw new BadRequestException(`Unsupported document entity type: ${trimmedEntityType}`);
    }

    return aliasedEntityType as SupportedDocumentEntityType;
  }

  private normalizeDocumentCategory(documentCategory?: string): string {
    const normalizedCategory = documentCategory?.trim() || 'other';
    if (!SUPPORTED_DOCUMENT_CATEGORIES.has(normalizedCategory)) {
      throw new BadRequestException(`Unsupported document category: ${normalizedCategory}`);
    }
    return normalizedCategory;
  }

  private async assertDocumentTargetExists(
    entityType: SupportedDocumentEntityType,
    entityId?: string,
  ): Promise<string> {
    const normalizedEntityId = entityId?.trim();
    if (!normalizedEntityId) {
      throw new BadRequestException('Document entity ID is required');
    }

    const target = await (() => {
      switch (entityType) {
        case 'client':
          return this.prisma.client.findUnique({
            where: { id: normalizedEntityId },
            select: { id: true },
          });
        case 'contact':
          return this.prisma.contact.findUnique({
            where: { id: normalizedEntityId },
            select: { id: true },
          });
        case 'lead':
          return this.prisma.lead.findUnique({
            where: { id: normalizedEntityId },
            select: { id: true },
          });
        case 'opportunity':
          return this.prisma.opportunity.findUnique({
            where: { id: normalizedEntityId },
            select: { id: true },
          });
        case 'matter':
          return this.prisma.matter.findUnique({
            where: { id: normalizedEntityId },
            select: { id: true },
          });
        case 'kyc_record':
          return this.prisma.kycRecord.findUnique({
            where: { id: normalizedEntityId },
            select: { id: true },
          });
        case 'execution_file':
          return this.prisma.executionFile.findUnique({
            where: { id: normalizedEntityId },
            select: { id: true },
          });
      }
    })();

    if (!target) {
      throw new NotFoundException(`${entityType} not found`);
    }

    return normalizedEntityId;
  }

  async upload(
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    metadata: { entityType: string; entityId: string; documentCategory?: string },
    userId: string,
    tenantId: string,
  ) {
    const entityType = this.normalizeEntityType(metadata.entityType);
    const entityId = await this.assertDocumentTargetExists(entityType, metadata.entityId);
    const documentCategory = this.normalizeDocumentCategory(metadata.documentCategory);
    const containerClient = await this.ensureContainer(tenantId);

    // Build blob path: entityType/entityId/timestamp-filename
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const blobPath = `${entityType}/${entityId}/${timestamp}-${safeName}`;

    const blockBlobClient = containerClient.getBlockBlobClient(blobPath);
    let blobUploaded = false;

    try {
      await blockBlobClient.uploadData(file.buffer, {
        blobHTTPHeaders: { blobContentType: file.mimetype },
      });
      blobUploaded = true;

      const document = await this.prisma.document.create({
        data: {
          entityType,
          entityId,
          fileName: file.originalname,
          blobPath,
          fileSizeBytes: file.size,
          contentType: file.mimetype,
          documentCategory,
          uploadedBy: userId,
        },
      });

      await this.audit.log({
        entityType: 'document', entityId: document.id,
        action: 'create', performedBy: userId,
      });

      return serializeDocument(document);
    } catch (error) {
      if (blobUploaded) {
        try {
          await blockBlobClient.deleteIfExists();
        } catch {
          // Best effort cleanup; preserve the original failure.
        }
      }
      throw error;
    }
  }

  async findAll(entityType?: string, entityId?: string) {
    const where: any = {};
    if (entityType) where.entityType = this.normalizeEntityType(entityType);
    if (entityId?.trim()) where.entityId = entityId.trim();
    const docs = await this.prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return docs.map(serializeDocument);
  }

  async findOne(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    return serializeDocument(doc);
  }

  async getDownloadUrl(id: string, tenantId: string) {
    if (!this.blobServiceClient) {
      throw new Error('Azure Blob Storage is not configured.');
    }
    const doc = await this.findOne(id);
    const containerName = this.getContainerName(tenantId);
    const containerClient = this.blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(doc.blobPath);

    // Generate SAS URL with 15 minute expiry
    const expiresOn = new Date();
    expiresOn.setMinutes(expiresOn.getMinutes() + 15);

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName,
        blobName: doc.blobPath,
        permissions: BlobSASPermissions.parse('r'),
        expiresOn,
        protocol: SASProtocol.HttpsAndHttp,
      },
      this.credential,
    ).toString();

    return {
      url: `${blobClient.url}?${sasToken}`,
      expiresOn: expiresOn.toISOString(),
      fileName: doc.fileName,
      contentType: doc.contentType,
    };
  }

  async delete(id: string, userId: string, tenantId: string) {
    const doc = await this.findOne(id);
    const containerClient = await this.ensureContainer(tenantId);
    const blockBlobClient = containerClient.getBlockBlobClient(doc.blobPath);

    try {
      await blockBlobClient.deleteIfExists();
    } catch {
      // Log but don't fail if blob is already gone
    }

    await this.prisma.document.delete({ where: { id } });

    await this.audit.log({
      entityType: 'document', entityId: id,
      action: 'delete', performedBy: userId,
    });

    return { deleted: true };
  }
}
