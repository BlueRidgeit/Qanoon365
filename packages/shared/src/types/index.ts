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
  CourtPartyType,
  CourtPartyRole,
  AuditAction,
} from '../enums';

// ── Base ─────────────────────────────────────────────────────
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

// ── Tenant (public schema) ───────────────────────────────────
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ── User ─────────────────────────────────────────────────────
export interface User extends BaseEntity {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  tenantId: string;
  isActive: boolean;
  lastLoginAt?: Date;
}

// ── Client ───────────────────────────────────────────────────
export interface Client extends BaseEntity {
  name: string;
  clientType: ClientType;
  registrationNumber?: string;
  industry?: string;
  preferredLanguage: PreferredLanguage;
  kycStatus: KycStatus;
  kycExpiryDate?: Date;
  riskRating?: RiskRating;
  notes?: string;
  isActive: boolean;
}

// ── Contact ──────────────────────────────────────────────────
export interface Contact extends BaseEntity {
  clientId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  isPrimary: boolean;
}

// ── Lead ─────────────────────────────────────────────────────
export interface Lead extends BaseEntity {
  subject: string;
  caseType: CaseType;
  jurisdiction: Jurisdiction;
  urgency: Urgency;
  caseSummary: string;
  clientName?: string;
  clientType?: ClientType;
  opposingPartyNames?: string;
  estimatedValue?: number;
  referralSource?: string;
  courtIntelFlag: boolean;
  status: LeadStatus;
  assignedTo?: string;
  convertedOpportunityId?: string;
}

// ── Opportunity ──────────────────────────────────────────────
export interface Opportunity extends BaseEntity {
  leadId?: string;
  clientId: string;
  name: string;
  stage: OpportunityStage;
  conflictCheckStatus: ConflictCheckStatus;
  conflictApprovedBy?: string;
  conflictResolutionNotes?: string;
  kycStatus: KycStatus;
  practiceArea: CaseType;
  engagementType?: EngagementType;
  assignedPartner: string;
  estimatedValue?: number;
  courtIntelSummary?: string;
  riskScore?: RiskRating;
  closedAt?: Date;
  closeReason?: string;
}

// ── Matter ───────────────────────────────────────────────────
export interface Matter extends BaseEntity {
  matterNumber: string;
  name: string;
  clientId: string;
  opportunityId?: string;
  status: MatterStatus;
  practiceArea?: CaseType;
  leadPartner: string;
  openDate: Date;
  targetCloseDate?: Date;
  courtIntelContext?: string;
  notes?: string;
}

// ── Conflict Record ──────────────────────────────────────────
export interface ConflictRecord extends BaseEntity {
  opportunityId: string;
  matchedEntityType: MatchedEntityType;
  matchedEntityId: string;
  matchSource: MatchSource;
  matchConfidence: MatchConfidence;
  confidenceScore?: number;
  matchField?: string;
  relationshipPath?: string;
  courtCaseReference?: string;
  relatedMatterId?: string;
  resolutionStatus: ConflictResolution;
  resolvedBy?: string;
  resolutionNotes?: string;
  resolvedAt?: Date;
}

// ── KYC Record ───────────────────────────────────────────────
export interface KycRecord extends BaseEntity {
  clientId: string;
  verificationType: VerificationType;
  status: KycStatus;
  idDocumentType?: IdDocumentType;
  idDocumentNumber?: string;
  idExpiryDate?: Date;
  verificationDate?: Date;
  verifiedBy?: string;
  riskRating?: RiskRating;
  notes?: string;
  documentFolderPath?: string;
}

// ── Opposing Party ───────────────────────────────────────────
export interface OpposingParty extends BaseEntity {
  name: string;
  nameNormalized?: string;
  nameArabic?: string;
  partyType?: CourtPartyType;
  matterId?: string;
  opportunityId?: string;
}

// ── Document ─────────────────────────────────────────────────
export interface Document extends BaseEntity {
  entityType: EntityType;
  entityId: string;
  fileName: string;
  blobPath: string;
  fileSizeBytes: number;
  contentType: string;
  documentCategory: DocumentCategory;
  uploadedBy: string;
  version: number;
}

// ── Activity ─────────────────────────────────────────────────
export interface Activity extends BaseEntity {
  entityType: EntityType;
  entityId: string;
  activityType: ActivityType;
  subject: string;
  body?: string;
  activityDate: Date;
  completedBy?: string;
  isSystemGenerated: boolean;
}

// ── Court Intel Query ────────────────────────────────────────
export interface CourtIntelQuery extends BaseEntity {
  queryType: CourtIntelQueryType;
  sourceEntityType?: EntityType;
  sourceEntityId?: string;
  queryInput?: Record<string, unknown>;
  resultSummary?: string;
  resultData?: Record<string, unknown>;
  executedAt: Date;
  executedBy: string;
}

// ── Notification ─────────────────────────────────────────────
export interface Notification extends BaseEntity {
  userId: string;
  title: string;
  body: string;
  entityType?: EntityType;
  entityId?: string;
  isRead: boolean;
  readAt?: Date;
}

// ── Audit Log ────────────────────────────────────────────────
export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
  performedBy: string;
  performedAt: Date;
  ipAddress?: string;
}

// ── Court Data (public/shared schema) ────────────────────────
export interface CourtCase {
  id: string;
  caseNumber: string;
  filingDate?: Date;
  court?: string;
  jurisdiction?: string;
  caseType?: string;
  subjectMatter?: string;
  outcome?: string;
  outcomeDate?: Date;
  durationDays?: number;
  notes?: string;
  rawDocumentPath?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CourtParty {
  id: string;
  name: string;
  nameNormalized?: string;
  nameArabic?: string;
  partyType: CourtPartyType;
  createdAt: Date;
  updatedAt: Date;
}

export interface CourtCaseParty {
  courtCaseId: string;
  courtPartyId: string;
  role: CourtPartyRole;
  representingFirm?: string;
  representingLawyer?: string;
  outcomeForParty?: string;
}

// ── Auth DTOs ────────────────────────────────────────────────
export interface TokenPayload {
  sub: string;
  tenantId: string;
  role: UserRole;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
