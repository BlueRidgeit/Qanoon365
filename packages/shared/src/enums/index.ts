// ── User & Auth ──────────────────────────────────────────────
export enum UserRole {
  ADMIN = 'admin',
  PARTNER = 'partner',
  COMPLIANCE = 'compliance',
  LAWYER = 'lawyer',
  BD = 'bd',
}

// ── Client ───────────────────────────────────────────────────
export enum ClientType {
  INDIVIDUAL = 'individual',
  COMPANY = 'company',
  GOVERNMENT_ENTITY = 'government_entity',
}

export enum PreferredLanguage {
  ENGLISH = 'english',
  ARABIC = 'arabic',
  BOTH = 'both',
}

export enum RiskRating {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  PEP = 'pep',
}

// ── Lead ─────────────────────────────────────────────────────
export enum CaseType {
  CORPORATE = 'corporate',
  LITIGATION = 'litigation',
  REAL_ESTATE = 'real_estate',
  EMPLOYMENT = 'employment',
  REGULATORY = 'regulatory',
  IP = 'ip',
  BANKING_FINANCE = 'banking_finance',
  OTHER = 'other',
}

export enum Jurisdiction {
  UAE_ONSHORE = 'uae_onshore',
  DIFC = 'difc',
  ADGM = 'adgm',
  MULTI_JURISDICTIONAL = 'multi_jurisdictional',
  INTERNATIONAL = 'international',
}

export enum Urgency {
  STANDARD = 'standard',
  URGENT = 'urgent',
  EMERGENCY = 'emergency',
}

export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  DISQUALIFIED = 'disqualified',
  CONVERTED = 'converted',
}

// ── Opportunity ──────────────────────────────────────────────
export enum OpportunityStage {
  INQUIRY = 'inquiry',
  CONSULTATION = 'consultation',
  PROPOSAL = 'proposal',
  RETAINER = 'retainer',
  WON = 'won',
  LOST = 'lost',
}

export enum ConflictCheckStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  CLEARED = 'cleared',
  CONFLICT_IDENTIFIED = 'conflict_identified',
}

export enum EngagementType {
  RETAINER = 'retainer',
  FIXED_FEE = 'fixed_fee',
  HOURLY = 'hourly',
  CONTINGENCY = 'contingency',
  PRO_BONO = 'pro_bono',
}

// ── Matter ───────────────────────────────────────────────────
export enum MatterStatus {
  ACTIVE = 'active',
  ON_HOLD = 'on_hold',
  CLOSED = 'closed',
  ARCHIVED = 'archived',
}

// ── Conflict ─────────────────────────────────────────────────
export enum MatchedEntityType {
  CLIENT = 'client',
  CONTACT = 'contact',
  OPPOSING_PARTY = 'opposing_party',
}

export enum MatchSource {
  CRM_DATA = 'crm_data',
  COURT_RECORDS = 'court_records',
  BOTH = 'both',
}

export enum MatchConfidence {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum ConflictResolution {
  PENDING = 'pending',
  CLEARED = 'cleared',
  CONFIRMED_CONFLICT = 'confirmed_conflict',
  WAIVED = 'waived',
}

// ── KYC ──────────────────────────────────────────────────────
export enum KycStatus {
  NOT_STARTED = 'not_started',
  DOCUMENTS_REQUESTED = 'documents_requested',
  UNDER_REVIEW = 'under_review',
  VERIFIED = 'verified',
  EXPIRED = 'expired',
  REJECTED = 'rejected',
}

export enum VerificationType {
  INDIVIDUAL_KYC = 'individual_kyc',
  CORPORATE_KYC = 'corporate_kyc',
  ENHANCED_DUE_DILIGENCE = 'enhanced_due_diligence',
}

export enum IdDocumentType {
  PASSPORT = 'passport',
  EMIRATES_ID = 'emirates_id',
  TRADE_LICENSE = 'trade_license',
  CERTIFICATE_OF_INCORPORATION = 'certificate_of_incorporation',
  OTHER = 'other',
}

// ── Activity ─────────────────────────────────────────────────
export enum ActivityType {
  EMAIL = 'email',
  PHONE_CALL = 'phone_call',
  MEETING = 'meeting',
  NOTE = 'note',
  TASK = 'task',
  SYSTEM_EVENT = 'system_event',
}

// ── Document ─────────────────────────────────────────────────
export enum DocumentCategory {
  CORRESPONDENCE = 'correspondence',
  COURT_FILING = 'court_filing',
  RESEARCH = 'research',
  CONTRACT = 'contract',
  KYC_DOCUMENT = 'kyc_document',
  ENGAGEMENT_LETTER = 'engagement_letter',
  OTHER = 'other',
}

export enum EntityType {
  CLIENT = 'client',
  LEAD = 'lead',
  OPPORTUNITY = 'opportunity',
  MATTER = 'matter',
  KYC_RECORD = 'kyc_record',
  EXECUTION_FILE = 'execution_file',
  CRIMINAL_COMPLAINT = 'criminal_complaint',
  APPEAL_DEADLINE = 'appeal_deadline',
  TASK = 'task',
}

// ── Court Intelligence ───────────────────────────────────────
export enum CourtIntelQueryType {
  PARTY_INTELLIGENCE = 'party_intelligence',
  COMPARABLE_CASE = 'comparable_case',
  CONTEXTUAL_CASE_LAW = 'contextual_case_law',
  OPPOSING_COUNSEL = 'opposing_counsel',
}

export enum CourtPartyType {
  INDIVIDUAL = 'individual',
  COMPANY = 'company',
}

export enum CourtPartyRole {
  PLAINTIFF = 'plaintiff',
  DEFENDANT = 'defendant',
  INTERVENOR = 'intervenor',
}

// ── Enforcement ─────────────────────────────────────────────
export enum ExecutionFileStatus {
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  STOPPED = 'stopped',
}

export enum CriminalComplaintStatus {
  NEW = 'new',
  UNDER_INVESTIGATION = 'under_investigation',
  REFERRED_TO_PROSECUTION = 'referred_to_prosecution',
  CLOSED = 'closed',
}

export enum ComplaintType {
  BREACH_OF_TRUST = 'breach_of_trust',
  FRAUD = 'fraud',
  FORGERY = 'forgery',
  EMBEZZLEMENT = 'embezzlement',
  DEFAMATION = 'defamation',
  BOUNCED_CHEQUE = 'bounced_cheque',
  THEFT = 'theft',
  OTHER = 'other',
}

export enum UAECourt {
  DUBAI = 'dubai',
  SHARJAH = 'sharjah',
  AJMAN = 'ajman',
  ABU_DHABI = 'abu_dhabi',
  RAS_AL_KHAIMAH = 'ras_al_khaimah',
  FUJAIRAH = 'fujairah',
  UMM_AL_QUWAIN = 'umm_al_quwain',
  DUBAI_RENT = 'dubai_rent',
  SHARJAH_RENT = 'sharjah_rent',
}

export enum FollowUpStatus {
  SCHEDULED = 'scheduled',
  SENT = 'sent',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// ── Appeal Deadlines ────────────────────────────────────────
export enum AppealType {
  FIRST_APPEAL = 'first_appeal',
  CASSATION = 'cassation',
  REVIEW = 'review',
}

export enum AppealDeadlineStatus {
  UPCOMING = 'upcoming',
  WARNING = 'warning',
  CRITICAL = 'critical',
  FILED = 'filed',
  MISSED = 'missed',
  WAIVED = 'waived',
}

// ── Tasks (extended) ───────────────────────────────────────
export enum TaskType {
  STANDARD = 'standard',
  APPROVAL = 'approval',
  REVIEW = 'review',
  FOLLOW_UP = 'follow_up',
}

export enum ApprovalStatus {
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

// ── Archive ────────────────────────────────────────────────
export enum ArchiveCategory {
  RULING = 'ruling',
  BOOK = 'book',
  FILE = 'file',
  LAW = 'law',
  GAZETTE = 'gazette',
  ADVERTISEMENT = 'advertisement',
  OTHER = 'other',
}

export enum PoaType {
  GENERAL = 'general',
  SPECIAL = 'special',
  LITIGATION = 'litigation',
}

export enum PoaStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

// ── Audit ────────────────────────────────────────────────────
export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  STAGE_CHANGE = 'stage_change',
  CONFLICT_RESOLVE = 'conflict_resolve',
  KYC_VERIFY = 'kyc_verify',
  LOGIN = 'login',
}
