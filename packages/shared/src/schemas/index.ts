import { z } from 'zod';
import {
  UserRole,
  ClientType,
  PreferredLanguage,
  RiskRating,
  CaseType,
  Jurisdiction,
  Urgency,
  LeadStatus,
  OpportunityStage,
  ConflictCheckStatus,
  EngagementType,
  MatterStatus,
  MatchedEntityType,
  MatchSource,
  MatchConfidence,
  ConflictResolution,
  KycStatus,
  VerificationType,
  IdDocumentType,
  ActivityType,
  DocumentCategory,
  EntityType,
  CourtIntelQueryType,
} from '../enums';

// ── Auth ─────────────────────────────────────────────────────
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});
export type LoginDto = z.infer<typeof LoginSchema>;

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.nativeEnum(UserRole),
});
export type RegisterDto = z.infer<typeof RegisterSchema>;

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshTokenDto = z.infer<typeof RefreshTokenSchema>;

// ── Tenant ───────────────────────────────────────────────────
export const ProvisionTenantSchema = z.object({
  id: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(255),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8).max(128),
});
export type ProvisionTenantDto = z.infer<typeof ProvisionTenantSchema>;

// ── Client ───────────────────────────────────────────────────
export const CreateClientSchema = z.object({
  name: z.string().min(1).max(255),
  clientType: z.nativeEnum(ClientType),
  registrationNumber: z.string().max(100).optional(),
  industry: z.string().max(100).optional(),
  preferredLanguage: z.nativeEnum(PreferredLanguage).default(PreferredLanguage.ENGLISH),
  riskRating: z.nativeEnum(RiskRating).optional(),
  notes: z.string().optional(),
});
export type CreateClientDto = z.infer<typeof CreateClientSchema>;

export const UpdateClientSchema = CreateClientSchema.partial();
export type UpdateClientDto = z.infer<typeof UpdateClientSchema>;

// ── Contact ──────────────────────────────────────────────────
export const CreateContactSchema = z.object({
  clientId: z.string().uuid(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  jobTitle: z.string().max(100).optional(),
  isPrimary: z.boolean().default(false),
});
export type CreateContactDto = z.infer<typeof CreateContactSchema>;

export const UpdateContactSchema = CreateContactSchema.partial().omit({ clientId: true });
export type UpdateContactDto = z.infer<typeof UpdateContactSchema>;

// ── Lead ─────────────────────────────────────────────────────
export const CreateLeadSchema = z.object({
  subject: z.string().min(1).max(255),
  caseType: z.nativeEnum(CaseType),
  jurisdiction: z.nativeEnum(Jurisdiction),
  urgency: z.nativeEnum(Urgency),
  caseSummary: z.string().min(1),
  clientName: z.string().max(255).optional(),
  clientType: z.nativeEnum(ClientType).optional(),
  opposingPartyNames: z.string().optional(),
  estimatedValue: z.number().nonnegative().optional(),
  referralSource: z.string().max(100).optional(),
  assignedTo: z.string().uuid().optional(),
});
export type CreateLeadDto = z.infer<typeof CreateLeadSchema>;

export const UpdateLeadSchema = CreateLeadSchema.partial();
export type UpdateLeadDto = z.infer<typeof UpdateLeadSchema>;

// ── Opportunity ──────────────────────────────────────────────
export const CreateOpportunitySchema = z.object({
  leadId: z.string().uuid().optional(),
  clientId: z.string().uuid(),
  name: z.string().min(1).max(255),
  practiceArea: z.nativeEnum(CaseType),
  engagementType: z.nativeEnum(EngagementType).optional(),
  assignedPartner: z.string().uuid(),
  estimatedValue: z.number().nonnegative().optional(),
});
export type CreateOpportunityDto = z.infer<typeof CreateOpportunitySchema>;

export const UpdateOpportunitySchema = CreateOpportunitySchema.partial();
export type UpdateOpportunityDto = z.infer<typeof UpdateOpportunitySchema>;

export const StageTransitionSchema = z.object({
  stage: z.nativeEnum(OpportunityStage),
  notes: z.string().optional(),
});
export type StageTransitionDto = z.infer<typeof StageTransitionSchema>;

// ── Matter ───────────────────────────────────────────────────
export const UpdateMatterSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  status: z.nativeEnum(MatterStatus).optional(),
  targetCloseDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});
export type UpdateMatterDto = z.infer<typeof UpdateMatterSchema>;

// ── Conflict Record ──────────────────────────────────────────
export const CreateConflictRecordSchema = z.object({
  opportunityId: z.string().uuid(),
  matchedEntityType: z.nativeEnum(MatchedEntityType),
  matchedEntityId: z.string().uuid(),
  matchSource: z.nativeEnum(MatchSource),
  matchConfidence: z.nativeEnum(MatchConfidence),
  confidenceScore: z.number().min(0).max(1).optional(),
  matchField: z.string().max(100).optional(),
  relationshipPath: z.string().optional(),
  courtCaseReference: z.string().optional(),
  relatedMatterId: z.string().uuid().optional(),
});
export type CreateConflictRecordDto = z.infer<typeof CreateConflictRecordSchema>;

export const ResolveConflictSchema = z.object({
  resolutionStatus: z.enum([ConflictResolution.CLEARED, ConflictResolution.CONFIRMED_CONFLICT, ConflictResolution.WAIVED]),
  resolutionNotes: z.string().optional(),
}).refine(
  (data) => data.resolutionStatus !== ConflictResolution.WAIVED || (data.resolutionNotes && data.resolutionNotes.length > 0),
  { message: 'Resolution notes are required when waiving a conflict', path: ['resolutionNotes'] }
);
export type ResolveConflictDto = z.infer<typeof ResolveConflictSchema>;

// ── KYC Record ───────────────────────────────────────────────
export const CreateKycRecordSchema = z.object({
  clientId: z.string().uuid(),
  verificationType: z.nativeEnum(VerificationType),
  idDocumentType: z.nativeEnum(IdDocumentType).optional(),
  idDocumentNumber: z.string().max(100).optional(),
  idExpiryDate: z.string().datetime().optional(),
  riskRating: z.nativeEnum(RiskRating).optional(),
  notes: z.string().optional(),
});
export type CreateKycRecordDto = z.infer<typeof CreateKycRecordSchema>;

export const UpdateKycRecordSchema = z.object({
  status: z.nativeEnum(KycStatus).optional(),
  idDocumentType: z.nativeEnum(IdDocumentType).optional(),
  idDocumentNumber: z.string().max(100).optional(),
  idExpiryDate: z.string().datetime().optional(),
  riskRating: z.nativeEnum(RiskRating).optional(),
  notes: z.string().optional(),
});
export type UpdateKycRecordDto = z.infer<typeof UpdateKycRecordSchema>;

// ── Activity ─────────────────────────────────────────────────
export const CreateActivitySchema = z.object({
  entityType: z.nativeEnum(EntityType),
  entityId: z.string().uuid(),
  activityType: z.nativeEnum(ActivityType),
  subject: z.string().min(1).max(255),
  body: z.string().optional(),
  activityDate: z.string().datetime().optional(),
});
export type CreateActivityDto = z.infer<typeof CreateActivitySchema>;

// ── Document Upload ──────────────────────────────────────────
export const DocumentUploadSchema = z.object({
  entityType: z.nativeEnum(EntityType),
  entityId: z.string().uuid(),
  documentCategory: z.nativeEnum(DocumentCategory),
});
export type DocumentUploadDto = z.infer<typeof DocumentUploadSchema>;

// ── Court Intelligence ───────────────────────────────────────
export const CourtIntelQuerySchema = z.object({
  queryType: z.nativeEnum(CourtIntelQueryType),
  sourceEntityType: z.nativeEnum(EntityType).optional(),
  sourceEntityId: z.string().uuid().optional(),
  queryInput: z.record(z.unknown()),
});
export type CourtIntelQueryDto = z.infer<typeof CourtIntelQuerySchema>;

// ── Pagination ───────────────────────────────────────────────
export const PaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});
export type PaginationDto = z.infer<typeof PaginationSchema>;
