import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types — matched to actual NestJS API response shapes
// ---------------------------------------------------------------------------

// Auth
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface RegisterResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

// Clients
export interface Client {
  id: string;
  name: string;
  clientType: string;
  registrationNumber?: string;
  industry?: string;
  preferredLanguage: string;
  kycStatus: string;
  kycExpiryDate?: string;
  riskRating?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  contacts?: Contact[];
  opportunities?: Opportunity[];
  matters?: Matter[];
}

export interface CreateClientRequest {
  name: string;
  clientType: string;
  registrationNumber?: string;
  industry?: string;
  preferredLanguage?: string;
  riskRating?: string;
  notes?: string;
}

export interface UpdateClientRequest extends Partial<CreateClientRequest> {
  id: string;
}

// Contacts
export interface Contact {
  id: string;
  clientId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
  client?: { id: string; name: string };
}

export interface CreateContactRequest {
  clientId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  isPrimary?: boolean;
}

export interface UpdateContactRequest extends Partial<Omit<CreateContactRequest, 'clientId'>> {
  id: string;
}

// Leads
export interface Lead {
  id: string;
  subject: string;
  caseType: string;
  jurisdiction: string;
  urgency: string;
  caseSummary: string;
  clientName?: string;
  clientType?: string;
  opposingPartyNames?: string;
  estimatedValue?: number;
  referralSource?: string;
  courtIntelFlag: boolean;
  status: string;
  assignedTo?: string;
  convertedOpportunityId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface CreateLeadRequest {
  subject: string;
  caseType: string;
  jurisdiction: string;
  urgency: string;
  caseSummary: string;
  clientName?: string;
  clientType?: string;
  opposingPartyNames?: string;
  estimatedValue?: number;
  referralSource?: string;
  assignedTo?: string;
}

export interface UpdateLeadRequest extends Partial<CreateLeadRequest> {
  id: string;
}

export interface QualifyLeadRequest {
  id: string;
  clientId?: string;
  clientName?: string;
  clientType?: string;
}

// Opportunities
export interface Opportunity {
  id: string;
  leadId?: string;
  clientId: string;
  name: string;
  stage: string;
  conflictCheckStatus: string;
  conflictApprovedBy?: string;
  conflictResolutionNotes?: string;
  kycStatus: string;
  practiceArea: string;
  engagementType?: string;
  assignedPartner: string;
  estimatedValue?: number;
  courtIntelSummary?: string;
  riskScore?: string;
  closedAt?: string;
  closeReason?: string;
  createdAt: string;
  updatedAt: string;
  client?: Client;
  conflictRecords?: ConflictRecord[];
  matters?: Matter[];
}

export interface CreateOpportunityRequest {
  clientId: string;
  name: string;
  practiceArea: string;
  assignedPartner: string;
  leadId?: string;
  engagementType?: string;
  estimatedValue?: number;
}

export interface UpdateOpportunityRequest extends Partial<CreateOpportunityRequest> {
  id: string;
}

export interface AdvanceStageRequest {
  id: string;
  stage: string;
}

// Matters
export interface Matter {
  id: string;
  matterNumber: string;
  name: string;
  clientId: string;
  opportunityId?: string;
  status: string;
  practiceArea?: string;
  leadPartner: string;
  openDate: string;
  targetCloseDate?: string;
  courtIntelContext?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  client?: Client;
  opportunity?: Opportunity;
}

export interface UpdateMatterRequest {
  id: string;
  status?: string;
  notes?: string;
  targetCloseDate?: string;
}

// Tasks
export interface TaskUser {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  name: string;
}

export interface TaskRecord {
  id: string;
  title: string;
  description?: string;
  entityType?: string;
  entityId?: string;
  status: string;
  priority: string;
  assignedTo?: string;
  dueDate?: string;
  completedAt?: string;
  completedBy?: string;
  tags?: string;
  sortOrder: number;
  taskType?: string;
  approvalStatus?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  assignedUser?: TaskUser | null;
  createdUser?: TaskUser | null;
  updatedUser?: TaskUser | null;
  approvedUser?: TaskUser | null;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  entityType?: string;
  entityId?: string;
  status?: string;
  priority?: string;
  assignedTo?: string;
  dueDate?: string;
  tags?: string;
  taskType?: string;
  approvalStatus?: string;
}

export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {
  id: string;
  approvedAt?: string | null;
  approvedBy?: string | null;
}

export interface TaskBoard {
  columns: Record<'todo' | 'in_progress' | 'review' | 'done', TaskRecord[]>;
  totalTasks: number;
}

// Conflicts
export interface ConflictRecord {
  id: string;
  opportunityId: string;
  matchedEntityType: string;
  matchedEntityId: string;
  matchSource: string;
  matchConfidence: string;
  confidenceScore?: number;
  matchField?: string;
  relationshipPath?: string;
  courtCaseReference?: string;
  relatedMatterId?: string;
  resolutionStatus: string;
  resolvedBy?: string;
  resolutionNotes?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  opportunity?: { id: string; name: string; stage: string; clientId?: string };
}

export interface CreateConflictRequest {
  opportunityId: string;
  matchedEntityType: string;
  matchedEntityId: string;
  matchSource: string;
  matchConfidence: string;
  confidenceScore?: number;
  matchField?: string;
  relationshipPath?: string;
  courtCaseReference?: string;
}

export interface ResolveConflictRequest {
  id: string;
  resolutionStatus: string;
  resolutionNotes?: string;
  opportunityId?: string;
}

export interface AutoConflictCheckResponse {
  opportunityId: string;
  conflictsDetected: number;
  newStatus: string;
  conflicts: ConflictRecord[];
}

export interface DocumentDownloadResponse {
  url: string;
  expiresOn: string;
  fileName: string;
  contentType: string;
}

// KYC
export interface KycRecord {
  id: string;
  clientId: string;
  verificationType: string;
  status: string;
  idDocumentType?: string;
  idDocumentNumber?: string;
  idExpiryDate?: string;
  verificationDate?: string;
  verifiedBy?: string;
  riskRating?: string;
  notes?: string;
  documentFolderPath?: string;
  createdAt: string;
  updatedAt: string;
  client?: { id: string; name: string; kycStatus: string };
}

export interface CreateKycRequest {
  clientId: string;
  verificationType: string;
  idDocumentType?: string;
  idDocumentNumber?: string;
  idExpiryDate?: string;
  riskRating?: string;
  notes?: string;
}

export interface UpdateKycRequest {
  id: string;
  status?: string;
  idDocumentType?: string;
  idDocumentNumber?: string;
  idExpiryDate?: string;
  riskRating?: string;
  notes?: string;
}

// Documents
export interface Document {
  id: string;
  entityType: string;
  entityId: string;
  fileName: string;
  blobPath: string;
  fileSizeBytes: number;
  contentType: string;
  documentCategory: string;
  uploadedBy: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface UploadDocumentRequest {
  file: File;
  entityType: string;
  entityId: string;
  documentCategory?: string;
}

// Activities
export interface Activity {
  id: string;
  entityType: string;
  entityId: string;
  activityType: string;
  subject: string;
  body?: string;
  activityDate: string;
  completedBy?: string;
  isSystemGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateActivityRequest {
  entityType: string;
  entityId: string;
  activityType: string;
  subject: string;
  body?: string;
  activityDate?: string;
}

// Dashboard
export interface DashboardData {
  pipeline: {
    stages: Record<string, number>;
    totalActive: number;
    totalWon: number;
    totalLost: number;
    totalEstimatedValue: number;
  };
  conflicts: {
    resolutionStatuses: Record<string, number>;
    totalPending: number;
    opportunitiesWithConflicts: number;
  };
  kyc: {
    clientStatuses: Record<string, number>;
    totalClients: number;
    verifiedCount: number;
    complianceRate: number;
    expiredCount: number;
  };
  activeMatters: number;
  recentActivities: Activity[];
}

// Court Intel
export interface CourtIntelQueryRequest {
  queryType: 'party_intelligence' | 'comparable_case' | 'contextual_case_law' | 'opposing_counsel';
  partyName?: string;
  caseType?: string;
  jurisdiction?: string;
  practiceArea?: string;
  firmName?: string;
  lawyerName?: string;
  keywords?: string;
  matterId?: string;
  opportunityId?: string;
  clientId?: string;
}

export interface CourtIntelFinding {
  title: string;
  description: string;
  relevanceScore: number;
  sourceType: 'court_record' | 'crm_data' | 'inferred';
  caseReference?: string;
  partyNames?: string[];
  jurisdiction?: string;
  outcome?: string;
  dateRange?: string;
}

export interface CourtIntelResult {
  queryType: string;
  summary: string;
  confidence: 'high' | 'medium' | 'low';
  findings: CourtIntelFinding[];
  riskFactors: string[];
  recommendations: string[];
  metadata: {
    casesAnalyzed: number;
    partiesMatched: number;
    processingTimeMs: number;
  };
}

export interface CourtIntelHistoryEntry {
  id: string;
  queryType: string;
  queryInput: Record<string, unknown>;
  resultSummary: string;
  resultData: CourtIntelResult;
  executedAt: string;
  executedBy: string;
}

// ---------------------------------------------------------------------------
// Query Keys
// ---------------------------------------------------------------------------

export const queryKeys = {
  clients: ['clients'] as const,
  client: (id: string) => ['clients', id] as const,
  contacts: (clientId?: string) => ['contacts', { clientId }] as const,
  leads: (status?: string) => ['leads', { status }] as const,
  lead: (id: string) => ['leads', id] as const,
  opportunities: ['opportunities'] as const,
  opportunity: (id: string) => ['opportunities', id] as const,
  matters: ['matters'] as const,
  matter: (id: string) => ['matters', id] as const,
  tasks: (params?: Record<string, string>) => ['tasks', params] as const,
  task: (id: string) => ['tasks', id] as const,
  taskBoard: (params?: Record<string, string>) => ['tasks', 'kanban', params] as const,
  conflicts: (opportunityId?: string) => ['conflicts', { opportunityId }] as const,
  kyc: (clientId?: string) => ['kyc', { clientId }] as const,
  documents: (entityType?: string, entityId?: string) =>
    ['documents', { entityType, entityId }] as const,
  documentDownload: (id: string) => ['documents', id, 'download'] as const,
  activities: (entityType?: string, entityId?: string) =>
    ['activities', { entityType, entityId }] as const,
  dashboard: ['dashboard'] as const,
  pipeline: ['dashboard', 'pipeline'] as const,
  courtIntelHistory: (entityType?: string, entityId?: string) =>
    ['court-intel', 'history', { entityType, entityId }] as const,
} as const;

// ---------------------------------------------------------------------------
// Auth Hooks
// ---------------------------------------------------------------------------

export function useLogin() {
  return useMutation<LoginResponse, Error, LoginRequest>({
    mutationFn: (data) => api.post<LoginResponse>('/auth/login', data),
  });
}

export function useRegister() {
  return useMutation<RegisterResponse, Error, RegisterRequest>({
    mutationFn: (data) => api.post<RegisterResponse>('/auth/register', data),
  });
}

// ---------------------------------------------------------------------------
// Client Hooks
// ---------------------------------------------------------------------------

export function useClients() {
  return useQuery<Client[]>({
    queryKey: queryKeys.clients,
    queryFn: () => api.get<Client[]>('/clients'),
  });
}

export function useClient(id: string) {
  return useQuery<Client>({
    queryKey: queryKeys.client(id),
    queryFn: () => api.get<Client>(`/clients/${id}`),
    enabled: !!id,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation<Client, Error, CreateClientRequest>({
    mutationFn: (data) => api.post<Client>('/clients', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation<Client, Error, UpdateClientRequest>({
    mutationFn: ({ id, ...data }) => api.patch<Client>(`/clients/${id}`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients });
      queryClient.invalidateQueries({ queryKey: queryKeys.client(variables.id) });
    },
  });
}

// ---------------------------------------------------------------------------
// Contact Hooks
// ---------------------------------------------------------------------------

export function useContacts(clientId?: string) {
  const params = new URLSearchParams();
  if (clientId) params.set('clientId', clientId);
  const qs = params.toString();
  const path = qs ? `/contacts?${qs}` : '/contacts';

  return useQuery<Contact[]>({
    queryKey: queryKeys.contacts(clientId),
    queryFn: () => api.get<Contact[]>(path),
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  return useMutation<Contact, Error, CreateContactRequest>({
    mutationFn: (data) => api.post<Contact>('/contacts', data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.client(variables.clientId) });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  return useMutation<Contact, Error, UpdateContactRequest>({
    mutationFn: ({ id, ...data }) => api.patch<Contact>(`/contacts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients });
    },
  });
}

// ---------------------------------------------------------------------------
// Lead Hooks
// ---------------------------------------------------------------------------

export function useLeads(status?: string) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  const qs = params.toString();
  const path = qs ? `/leads?${qs}` : '/leads';

  return useQuery<Lead[]>({
    queryKey: queryKeys.leads(status),
    queryFn: () => api.get<Lead[]>(path),
  });
}

export function useLead(id: string) {
  return useQuery<Lead>({
    queryKey: queryKeys.lead(id),
    queryFn: () => api.get<Lead>(`/leads/${id}`),
    enabled: !!id,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation<Lead, Error, CreateLeadRequest>({
    mutationFn: (data) => api.post<Lead>('/leads', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  return useMutation<Lead, Error, UpdateLeadRequest>({
    mutationFn: ({ id, ...data }) => api.patch<Lead>(`/leads/${id}`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.lead(variables.id) });
    },
  });
}

export function useQualifyLead() {
  const queryClient = useQueryClient();
  return useMutation<{ lead: Lead; opportunity: Opportunity; clientId: string }, Error, QualifyLeadRequest>({
    mutationFn: ({ id, ...data }) =>
      api.post<{ lead: Lead; opportunity: Opportunity; clientId: string }>(`/leads/${id}/qualify`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients });
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities });
    },
  });
}

// ---------------------------------------------------------------------------
// Opportunity Hooks
// ---------------------------------------------------------------------------

export function useOpportunities() {
  return useQuery<Opportunity[]>({
    queryKey: queryKeys.opportunities,
    queryFn: () => api.get<Opportunity[]>('/opportunities'),
  });
}

export function useOpportunity(id: string) {
  return useQuery<Opportunity>({
    queryKey: queryKeys.opportunity(id),
    queryFn: () => api.get<Opportunity>(`/opportunities/${id}`),
    enabled: !!id,
  });
}

export function useCreateOpportunity() {
  const queryClient = useQueryClient();
  return useMutation<Opportunity, Error, CreateOpportunityRequest>({
    mutationFn: (data) => api.post<Opportunity>('/opportunities', data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities });
      queryClient.invalidateQueries({ queryKey: queryKeys.client(variables.clientId) });
    },
  });
}

export function useUpdateOpportunity() {
  const queryClient = useQueryClient();
  return useMutation<Opportunity, Error, UpdateOpportunityRequest>({
    mutationFn: ({ id, ...data }) =>
      api.patch<Opportunity>(`/opportunities/${id}`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities });
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunity(variables.id) });
    },
  });
}

export function useAdvanceStage() {
  const queryClient = useQueryClient();
  return useMutation<Opportunity, Error, AdvanceStageRequest>({
    mutationFn: ({ id, stage }) =>
      api.patch<Opportunity>(`/opportunities/${id}/stage`, { stage }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities });
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunity(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

// ---------------------------------------------------------------------------
// Matter Hooks
// ---------------------------------------------------------------------------

export function useMatters() {
  return useQuery<Matter[]>({
    queryKey: queryKeys.matters,
    queryFn: () => api.get<Matter[]>('/matters'),
  });
}

export function useMatter(id: string) {
  return useQuery<Matter>({
    queryKey: queryKeys.matter(id),
    queryFn: () => api.get<Matter>(`/matters/${id}`),
    enabled: !!id,
  });
}

export function useUpdateMatter() {
  const queryClient = useQueryClient();
  return useMutation<Matter, Error, UpdateMatterRequest>({
    mutationFn: ({ id, ...data }) => api.patch<Matter>(`/matters/${id}`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.matters });
      queryClient.invalidateQueries({ queryKey: queryKeys.matter(variables.id) });
    },
  });
}

export function useCloseMatter() {
  const queryClient = useQueryClient();
  return useMutation<Matter, Error, string>({
    mutationFn: (id) => api.patch<Matter>(`/matters/${id}/close`),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.matters });
      queryClient.invalidateQueries({ queryKey: queryKeys.matter(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

// ---------------------------------------------------------------------------
// Task Hooks
// ---------------------------------------------------------------------------

export function useTasks(params?: Record<string, string>) {
  const qs = params ? new URLSearchParams(params).toString() : '';
  const path = qs ? `/tasks?${qs}` : '/tasks';

  return useQuery<TaskRecord[]>({
    queryKey: queryKeys.tasks(params),
    queryFn: () => api.get<TaskRecord[]>(path),
  });
}

export function useTask(id: string) {
  return useQuery<TaskRecord>({
    queryKey: queryKeys.task(id),
    queryFn: () => api.get<TaskRecord>(`/tasks/${id}`),
    enabled: !!id,
  });
}

export function useTaskBoard(params?: Record<string, string>) {
  const qs = params ? new URLSearchParams(params).toString() : '';
  const path = qs ? `/tasks/kanban?${qs}` : '/tasks/kanban';

  return useQuery<TaskBoard>({
    queryKey: queryKeys.taskBoard(params),
    queryFn: () => api.get<TaskBoard>(path),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation<TaskRecord, Error, CreateTaskRequest>({
    mutationFn: (data) => api.post<TaskRecord>('/tasks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.activities() });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation<TaskRecord, Error, UpdateTaskRequest>({
    mutationFn: ({ id, ...data }) => api.patch<TaskRecord>(`/tasks/${id}`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.task(variables.id) });
    },
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation<TaskRecord, Error, { id: string; status: string }>({
    mutationFn: ({ id, status }) => api.patch<TaskRecord>(`/tasks/${id}/status`, { status }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.task(variables.id) });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => api.delete<void>(`/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Conflict Hooks
// ---------------------------------------------------------------------------

export function useConflicts(opportunityId?: string) {
  const params = new URLSearchParams();
  if (opportunityId) params.set('opportunityId', opportunityId);
  const qs = params.toString();
  const path = qs ? `/conflicts?${qs}` : '/conflicts';

  return useQuery<ConflictRecord[]>({
    queryKey: queryKeys.conflicts(opportunityId),
    queryFn: () => api.get<ConflictRecord[]>(path),
  });
}

export function useCreateConflict() {
  const queryClient = useQueryClient();
  return useMutation<ConflictRecord, Error, CreateConflictRequest>({
    mutationFn: (data) => api.post<ConflictRecord>('/conflicts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conflicts'] });
    },
  });
}

export function useResolveConflict() {
  const queryClient = useQueryClient();
  return useMutation<ConflictRecord, Error, ResolveConflictRequest>({
    mutationFn: ({ id, ...data }) =>
      api.patch<ConflictRecord>(`/conflicts/${id}/resolve`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conflicts'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities });
      if (variables.opportunityId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.opportunity(variables.opportunityId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.conflicts(variables.opportunityId),
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useRunConflictCheck() {
  const queryClient = useQueryClient();
  return useMutation<AutoConflictCheckResponse, Error, { opportunityId: string }>({
    mutationFn: (data) => api.post<AutoConflictCheckResponse>('/conflicts/auto-check', data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conflicts'] });
      queryClient.invalidateQueries({
        queryKey: queryKeys.opportunity(variables.opportunityId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

// ---------------------------------------------------------------------------
// KYC Hooks
// ---------------------------------------------------------------------------

export function useKycRecords(clientId?: string) {
  const params = new URLSearchParams();
  if (clientId) params.set('clientId', clientId);
  const qs = params.toString();
  const path = qs ? `/kyc?${qs}` : '/kyc';

  return useQuery<KycRecord[]>({
    queryKey: queryKeys.kyc(clientId),
    queryFn: () => api.get<KycRecord[]>(path),
  });
}

export function useCreateKyc() {
  const queryClient = useQueryClient();
  return useMutation<KycRecord, Error, CreateKycRequest>({
    mutationFn: (data) => api.post<KycRecord>('/kyc', data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kyc'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.client(variables.clientId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useUpdateKyc() {
  const queryClient = useQueryClient();
  return useMutation<KycRecord, Error, UpdateKycRequest>({
    mutationFn: ({ id, ...data }) => api.patch<KycRecord>(`/kyc/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kyc'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients });
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

// ---------------------------------------------------------------------------
// Document Hooks
// ---------------------------------------------------------------------------

export function useDocuments(entityType?: string, entityId?: string) {
  const params = new URLSearchParams();
  if (entityType) params.set('entityType', entityType);
  if (entityId) params.set('entityId', entityId);
  const qs = params.toString();
  const path = qs ? `/documents?${qs}` : '/documents';

  return useQuery<Document[]>({
    queryKey: queryKeys.documents(entityType, entityId),
    queryFn: () => api.get<Document[]>(path),
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation<Document, Error, UploadDocumentRequest>({
    mutationFn: ({ file, entityType, entityId, documentCategory }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', entityType);
      formData.append('entityId', entityId);
      if (documentCategory) formData.append('documentCategory', documentCategory);
      return api.upload<Document>('/documents/upload', formData);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents(variables.entityType, variables.entityId),
      });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => api.delete<void>(`/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useDownloadDocument() {
  return useMutation<DocumentDownloadResponse, Error, string>({
    mutationFn: (id) => api.get<DocumentDownloadResponse>(`/documents/${id}/download`),
  });
}

// ---------------------------------------------------------------------------
// Activity Hooks
// ---------------------------------------------------------------------------

export function useActivities(entityType?: string, entityId?: string) {
  const params = new URLSearchParams();
  if (entityType) params.set('entityType', entityType);
  if (entityId) params.set('entityId', entityId);
  const qs = params.toString();
  const path = qs ? `/activities?${qs}` : '/activities';

  return useQuery<Activity[]>({
    queryKey: queryKeys.activities(entityType, entityId),
    queryFn: () => api.get<Activity[]>(path),
  });
}

export function useCreateActivity() {
  const queryClient = useQueryClient();
  return useMutation<Activity, Error, CreateActivityRequest>({
    mutationFn: (data) => api.post<Activity>('/activities', data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({
        queryKey: queryKeys.activities(variables.entityType, variables.entityId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

// ---------------------------------------------------------------------------
// Dashboard Hooks
// ---------------------------------------------------------------------------

export function useDashboard() {
  return useQuery<DashboardData>({
    queryKey: queryKeys.dashboard,
    queryFn: () => api.get<DashboardData>('/dashboard'),
  });
}

// ---------------------------------------------------------------------------
// Court Intel Hooks
// ---------------------------------------------------------------------------

export function useCourtIntelQuery() {
  const queryClient = useQueryClient();
  return useMutation<CourtIntelResult, Error, CourtIntelQueryRequest>({
    mutationFn: (data) =>
      api.post<CourtIntelResult>('/court-intel/query', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['court-intel'] });
    },
  });
}

export function useCourtIntelHistory(entityType?: string, entityId?: string) {
  const params = new URLSearchParams();
  if (entityType) params.set('entityType', entityType);
  if (entityId) params.set('entityId', entityId);
  const qs = params.toString();
  const path = qs ? `/court-intel/history?${qs}` : '/court-intel/history';

  return useQuery<CourtIntelHistoryEntry[]>({
    queryKey: queryKeys.courtIntelHistory(entityType, entityId),
    queryFn: () => api.get<CourtIntelHistoryEntry[]>(path),
  });
}

// ---------------------------------------------------------------------------
// Notification Types & Hooks
// ---------------------------------------------------------------------------

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export function useNotifications(limit = 20) {
  return useQuery<Notification[]>({
    queryKey: ['notifications', limit],
    queryFn: () => api.get<Notification[]>(`/notifications?limit=${limit}`),
    refetchInterval: 30_000,
  });
}

export function useUnreadCount() {
  return useQuery<{ count: number }>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get<{ count: number }>('/notifications/unread-count'),
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation<Notification, Error, string>({
    mutationFn: (id) => api.patch<Notification>(`/notifications/${id}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation<{ updated: number }, Error, void>({
    mutationFn: () => api.patch<{ updated: number }>('/notifications/read-all', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Enforcement Types
// ---------------------------------------------------------------------------

export interface ExecutionFile {
  id: string;
  fileNumber: string;
  caseNumber?: string;
  court: string;
  status: string;
  filingDate: string;
  completionDate?: string;
  claimAmount: number;
  collectedAmount: number;
  currency: string;
  debtorName: string;
  debtorNameArabic?: string;
  creditorName: string;
  creditorNameArabic?: string;
  matterId?: string;
  clientId?: string;
  assignedTo: string;
  isStalled: boolean;
  lastActivityDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  followUpRule?: FollowUpRule;
  followUpLogs?: FollowUpLog[];
}

export interface CreateExecutionFileRequest {
  fileNumber: string;
  caseNumber?: string;
  court: string;
  filingDate: string;
  claimAmount: number;
  currency?: string;
  debtorName: string;
  debtorNameArabic?: string;
  creditorName: string;
  creditorNameArabic?: string;
  matterId?: string;
  clientId?: string;
  assignedTo: string;
  notes?: string;
}

export interface CriminalComplaint {
  id: string;
  complaintNumber: string;
  status: string;
  complaintType: string;
  court: string;
  complainantName: string;
  complainantNameArabic?: string;
  respondentName: string;
  respondentNameArabic?: string;
  filedDate: string;
  referralDate?: string;
  matterId?: string;
  clientId?: string;
  assignedTo: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateComplaintRequest {
  complaintNumber: string;
  complaintType: string;
  court: string;
  complainantName: string;
  complainantNameArabic?: string;
  respondentName: string;
  respondentNameArabic?: string;
  filedDate: string;
  referralDate?: string;
  matterId?: string;
  clientId?: string;
  assignedTo: string;
  notes?: string;
}

export interface CourtContact {
  id: string;
  court: string;
  department?: string;
  contactName?: string;
  email: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
}

export interface FollowUpRule {
  id: string;
  executionFileId: string;
  intervalDays: number;
  isActive: boolean;
  courtContactId: string;
  templateLanguage: string;
  nextFollowUpDate: string;
  courtContact?: CourtContact;
}

export interface FollowUpLog {
  id: string;
  executionFileId: string;
  status: string;
  sentAt?: string;
  recipientEmail: string;
  subject: string;
  body: string;
  errorMessage?: string;
  createdAt: string;
  executionFile?: { fileNumber: string; court: string };
}

export interface EnforcementDashboardData {
  myStats: { myFiles: number; myStalled: number; myComplaints: number };
  overallStats: {
    byStatus: Record<string, number>;
    byCourt: Record<string, number>;
    stalledCount: number;
    total: number;
  };
  complaintStats: {
    byStatus: Record<string, number>;
    byType: Record<string, number>;
  };
  courtGrid: Record<string, number>;
  latestFiles: ExecutionFile[];
  latestComplaints: CriminalComplaint[];
}

// ---------------------------------------------------------------------------
// Enforcement Query Keys
// ---------------------------------------------------------------------------

export const enforcementKeys = {
  executionFiles: (params?: Record<string, string>) => ['execution-files', params] as const,
  executionFile: (id: string) => ['execution-files', id] as const,
  executionFileStats: ['execution-files', 'stats'] as const,
  executionFileMyStats: ['execution-files', 'my-stats'] as const,
  complaints: (params?: Record<string, string>) => ['complaints', params] as const,
  complaint: (id: string) => ['complaints', id] as const,
  complaintStats: ['complaints', 'stats'] as const,
  enforcementDashboard: ['enforcement', 'dashboard'] as const,
  enforcementReports: (params?: Record<string, string>) => ['enforcement', 'reports', params] as const,
  followUpRule: (executionFileId: string) => ['follow-up-rules', executionFileId] as const,
  followUpLogs: (params?: Record<string, string>) => ['follow-up-logs', params] as const,
  courtContacts: ['court-contacts'] as const,
} as const;

// ---------------------------------------------------------------------------
// Execution File Hooks
// ---------------------------------------------------------------------------

export function useExecutionFiles(params?: Record<string, string>) {
  const qs = params ? new URLSearchParams(params).toString() : '';
  const path = qs ? `/enforcement/execution-files?${qs}` : '/enforcement/execution-files';
  return useQuery<ExecutionFile[]>({
    queryKey: enforcementKeys.executionFiles(params),
    queryFn: () => api.get<ExecutionFile[]>(path),
  });
}

export function useExecutionFile(id: string) {
  return useQuery<ExecutionFile>({
    queryKey: enforcementKeys.executionFile(id),
    queryFn: () => api.get<ExecutionFile>(`/enforcement/execution-files/${id}`),
    enabled: !!id,
  });
}

export function useExecutionFileStats() {
  return useQuery({
    queryKey: enforcementKeys.executionFileStats,
    queryFn: () => api.get('/enforcement/execution-files/stats'),
  });
}

export function useCreateExecutionFile() {
  const queryClient = useQueryClient();
  return useMutation<ExecutionFile, Error, CreateExecutionFileRequest>({
    mutationFn: (data) => api.post<ExecutionFile>('/enforcement/execution-files', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execution-files'] });
      queryClient.invalidateQueries({ queryKey: ['enforcement'] });
    },
  });
}

export function useUpdateExecutionFile() {
  const queryClient = useQueryClient();
  return useMutation<ExecutionFile, Error, { id: string } & Record<string, unknown>>({
    mutationFn: ({ id, ...data }) => api.patch<ExecutionFile>(`/enforcement/execution-files/${id}`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['execution-files'] });
      queryClient.invalidateQueries({ queryKey: enforcementKeys.executionFile(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['enforcement'] });
    },
  });
}

export function useDeleteExecutionFile() {
  const queryClient = useQueryClient();
  return useMutation<ExecutionFile, Error, string>({
    mutationFn: (id) => api.delete<ExecutionFile>(`/enforcement/execution-files/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execution-files'] });
      queryClient.invalidateQueries({ queryKey: ['enforcement'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Criminal Complaint Hooks
// ---------------------------------------------------------------------------

export function useComplaints(params?: Record<string, string>) {
  const qs = params ? new URLSearchParams(params).toString() : '';
  const path = qs ? `/complaints/criminal?${qs}` : '/complaints/criminal';
  return useQuery<CriminalComplaint[]>({
    queryKey: enforcementKeys.complaints(params),
    queryFn: () => api.get<CriminalComplaint[]>(path),
  });
}

export function useComplaint(id: string) {
  return useQuery<CriminalComplaint>({
    queryKey: enforcementKeys.complaint(id),
    queryFn: () => api.get<CriminalComplaint>(`/complaints/criminal/${id}`),
    enabled: !!id,
  });
}

export function useComplaintStats() {
  return useQuery({
    queryKey: enforcementKeys.complaintStats,
    queryFn: () => api.get('/complaints/criminal/stats'),
  });
}

export function useCreateComplaint() {
  const queryClient = useQueryClient();
  return useMutation<CriminalComplaint, Error, CreateComplaintRequest>({
    mutationFn: (data) => api.post<CriminalComplaint>('/complaints/criminal', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['enforcement'] });
    },
  });
}

export function useUpdateComplaint() {
  const queryClient = useQueryClient();
  return useMutation<CriminalComplaint, Error, { id: string } & Record<string, unknown>>({
    mutationFn: ({ id, ...data }) => api.patch<CriminalComplaint>(`/complaints/criminal/${id}`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: enforcementKeys.complaint(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['enforcement'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Enforcement Dashboard & Reports Hooks
// ---------------------------------------------------------------------------

export function useEnforcementDashboard() {
  return useQuery<EnforcementDashboardData>({
    queryKey: enforcementKeys.enforcementDashboard,
    queryFn: () => api.get<EnforcementDashboardData>('/enforcement/dashboard'),
  });
}

export function useEnforcementReports(params?: Record<string, string>) {
  const qs = params ? new URLSearchParams(params).toString() : '';
  const path = qs ? `/enforcement/reports?${qs}` : '/enforcement/reports';
  return useQuery({
    queryKey: enforcementKeys.enforcementReports(params),
    queryFn: () => api.get(path),
  });
}

// ---------------------------------------------------------------------------
// Follow-Up Hooks
// ---------------------------------------------------------------------------

export function useFollowUpRule(executionFileId: string) {
  return useQuery<FollowUpRule>({
    queryKey: enforcementKeys.followUpRule(executionFileId),
    queryFn: () => api.get<FollowUpRule>(`/follow-ups/rules/${executionFileId}`),
    enabled: !!executionFileId,
    retry: false,
  });
}

export function useCreateFollowUpRule() {
  const queryClient = useQueryClient();
  return useMutation<FollowUpRule, Error, { executionFileId: string; intervalDays?: number; courtContactId: string; templateLanguage?: string }>({
    mutationFn: (data) => api.post<FollowUpRule>('/follow-ups/rules', data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: enforcementKeys.followUpRule(variables.executionFileId) });
      queryClient.invalidateQueries({ queryKey: ['execution-files'] });
    },
  });
}

export function useUpdateFollowUpRule() {
  const queryClient = useQueryClient();
  return useMutation<FollowUpRule, Error, { id: string } & Record<string, unknown>>({
    mutationFn: ({ id, ...data }) => api.patch<FollowUpRule>(`/follow-ups/rules/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-up-rules'] });
      queryClient.invalidateQueries({ queryKey: ['execution-files'] });
    },
  });
}

export function useDeleteFollowUpRule() {
  const queryClient = useQueryClient();
  return useMutation<FollowUpRule, Error, string>({
    mutationFn: (id) => api.delete<FollowUpRule>(`/follow-ups/rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-up-rules'] });
      queryClient.invalidateQueries({ queryKey: ['execution-files'] });
    },
  });
}

export function useFollowUpLogs(params?: Record<string, string>) {
  const qs = params ? new URLSearchParams(params).toString() : '';
  const path = qs ? `/follow-ups/logs?${qs}` : '/follow-ups/logs';
  return useQuery<FollowUpLog[]>({
    queryKey: enforcementKeys.followUpLogs(params),
    queryFn: () => api.get<FollowUpLog[]>(path),
  });
}

// ---------------------------------------------------------------------------
// Court Contact Hooks
// ---------------------------------------------------------------------------

export function useCourtContacts() {
  return useQuery<CourtContact[]>({
    queryKey: enforcementKeys.courtContacts,
    queryFn: () => api.get<CourtContact[]>('/follow-ups/court-contacts'),
  });
}

export function useCreateCourtContact() {
  const queryClient = useQueryClient();
  return useMutation<CourtContact, Error, { court: string; department?: string; contactName?: string; email: string; phone?: string }>({
    mutationFn: (data) => api.post<CourtContact>('/follow-ups/court-contacts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: enforcementKeys.courtContacts });
    },
  });
}

export function useUpdateCourtContact() {
  const queryClient = useQueryClient();
  return useMutation<CourtContact, Error, { id: string } & Record<string, unknown>>({
    mutationFn: ({ id, ...data }) => api.patch<CourtContact>(`/follow-ups/court-contacts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: enforcementKeys.courtContacts });
    },
  });
}

export function useDeleteCourtContact() {
  const queryClient = useQueryClient();
  return useMutation<CourtContact, Error, string>({
    mutationFn: (id) => api.delete<CourtContact>(`/follow-ups/court-contacts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: enforcementKeys.courtContacts });
    },
  });
}

// ---------------------------------------------------------------------------
// Appeal Deadline Types
// ---------------------------------------------------------------------------

export interface AppealDeadline {
  id: string;
  fileNumber: string;
  caseNumber?: string;
  clientName: string;
  clientNameArabic?: string;
  court: string;
  judgmentDate: string;
  appealType: string;
  appealPeriodDays: number;
  deadlineDate: string;
  status: string;
  assignedTo: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppealDeadlineRequest {
  fileNumber: string;
  caseNumber?: string;
  clientName: string;
  clientNameArabic?: string;
  court: string;
  judgmentDate: string;
  appealType: string;
  appealPeriodDays: number;
  assignedTo: string;
  notes?: string;
}

export interface UpdateAppealDeadlineRequest extends Partial<CreateAppealDeadlineRequest> {
  id: string;
}

export interface AppealDeadlineStats {
  total: number;
  critical: number;
  warning: number;
  filed: number;
  upcoming: number;
  missed: number;
}

// ---------------------------------------------------------------------------
// Appeal Deadline Query Keys
// ---------------------------------------------------------------------------

export const appealDeadlineKeys = {
  deadlines: (params?: Record<string, string>) => ['appeal-deadlines', params] as const,
  deadline: (id: string) => ['appeal-deadlines', id] as const,
  stats: ['appeal-deadlines', 'stats'] as const,
  urgent: ['appeal-deadlines', 'urgent'] as const,
} as const;

// ---------------------------------------------------------------------------
// Appeal Deadline Hooks
// ---------------------------------------------------------------------------

export function useAppealDeadlines(params?: Record<string, string>) {
  const qs = params ? new URLSearchParams(params).toString() : '';
  const path = qs ? `/appeal-deadlines?${qs}` : '/appeal-deadlines';
  return useQuery<AppealDeadline[]>({
    queryKey: appealDeadlineKeys.deadlines(params),
    queryFn: () => api.get<AppealDeadline[]>(path),
  });
}

export function useAppealDeadline(id: string) {
  return useQuery<AppealDeadline>({
    queryKey: appealDeadlineKeys.deadline(id),
    queryFn: () => api.get<AppealDeadline>(`/appeal-deadlines/${id}`),
    enabled: !!id,
  });
}

export function useAppealDeadlineStats() {
  return useQuery<AppealDeadlineStats>({
    queryKey: appealDeadlineKeys.stats,
    queryFn: () => api.get<AppealDeadlineStats>('/appeal-deadlines/stats'),
  });
}

export function useUrgentDeadlines() {
  return useQuery<AppealDeadline[]>({
    queryKey: appealDeadlineKeys.urgent,
    queryFn: () => api.get<AppealDeadline[]>('/appeal-deadlines/urgent'),
  });
}

export function useCreateAppealDeadline() {
  const queryClient = useQueryClient();
  return useMutation<AppealDeadline, Error, CreateAppealDeadlineRequest>({
    mutationFn: (data) => api.post<AppealDeadline>('/appeal-deadlines', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appeal-deadlines'] });
    },
  });
}

export function useUpdateAppealDeadline() {
  const queryClient = useQueryClient();
  return useMutation<AppealDeadline, Error, UpdateAppealDeadlineRequest>({
    mutationFn: ({ id, ...data }) => api.patch<AppealDeadline>(`/appeal-deadlines/${id}`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appeal-deadlines'] });
      queryClient.invalidateQueries({ queryKey: appealDeadlineKeys.deadline(variables.id) });
    },
  });
}

export function useUpdateAppealDeadlineStatus() {
  const queryClient = useQueryClient();
  return useMutation<AppealDeadline, Error, { id: string; status: string }>({
    mutationFn: ({ id, status }) => api.patch<AppealDeadline>(`/appeal-deadlines/${id}/status`, { status }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appeal-deadlines'] });
      queryClient.invalidateQueries({ queryKey: appealDeadlineKeys.deadline(variables.id) });
    },
  });
}

export function useDeleteAppealDeadline() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => api.delete<void>(`/appeal-deadlines/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appeal-deadlines'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Archive Types
// ---------------------------------------------------------------------------

export interface ArchiveDocument {
  id: string;
  title: string;
  category: string;
  court?: string;
  caseNumber?: string;
  caseStage?: string;
  description?: string;
  tags?: string;
  fileName: string;
  blobPath: string;
  fileType?: string;
  fileSizeBytes?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateArchiveDocumentRequest {
  title: string;
  category: string;
  court?: string;
  caseNumber?: string;
  caseStage?: string;
  description?: string;
  tags?: string;
  fileName: string;
  blobPath: string;
}

export interface UpdateArchiveDocumentRequest extends Partial<CreateArchiveDocumentRequest> {
  id: string;
}

export interface ArchiveStats {
  total: number;
  byCategory: Record<string, number>;
}

export interface Poa {
  id: string;
  poaNumber: string;
  grantorName: string;
  grantorNameArabic?: string;
  poaType: string;
  court: string;
  issueDate: string;
  expiryDate?: string;
  status: string;
  notarizationNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePoaRequest {
  poaNumber: string;
  grantorName: string;
  grantorNameArabic?: string;
  poaType: string;
  court: string;
  issueDate: string;
  expiryDate?: string;
  notarizationNumber?: string;
  notes?: string;
}

export interface UpdatePoaRequest extends Partial<CreatePoaRequest> {
  id: string;
}

export interface PoaStats {
  total: number;
  active: number;
  expiringSoon: number;
}

// ---------------------------------------------------------------------------
// Archive Query Keys
// ---------------------------------------------------------------------------

export const archiveKeys = {
  documents: (params?: Record<string, string>) => ['archive-documents', params] as const,
  stats: ['archive-documents', 'stats'] as const,
  search: (query: string) => ['archive-documents', 'search', query] as const,
  poas: (params?: Record<string, string>) => ['poas', params] as const,
  poaStats: ['poas', 'stats'] as const,
} as const;

// ---------------------------------------------------------------------------
// Archive Document Hooks
// ---------------------------------------------------------------------------

export function useArchiveDocuments(params?: Record<string, string>) {
  const qs = params ? new URLSearchParams(params).toString() : '';
  const path = qs ? `/archive/documents?${qs}` : '/archive/documents';
  return useQuery<ArchiveDocument[]>({
    queryKey: archiveKeys.documents(params),
    queryFn: () => api.get<ArchiveDocument[]>(path),
  });
}

export function useArchiveStats() {
  return useQuery<ArchiveStats>({
    queryKey: archiveKeys.stats,
    queryFn: () => api.get<ArchiveStats>('/archive/stats'),
  });
}

export function useArchiveSearch(query: string) {
  return useQuery<ArchiveDocument[]>({
    queryKey: archiveKeys.search(query),
    queryFn: () => api.get<ArchiveDocument[]>(`/archive/search?q=${encodeURIComponent(query)}`),
    enabled: !!query,
  });
}

export function useCreateArchiveDocument() {
  const queryClient = useQueryClient();
  return useMutation<ArchiveDocument, Error, CreateArchiveDocumentRequest>({
    mutationFn: (data) => api.post<ArchiveDocument>('/archive', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archive-documents'] });
    },
  });
}

export function useUpdateArchiveDocument() {
  const queryClient = useQueryClient();
  return useMutation<ArchiveDocument, Error, UpdateArchiveDocumentRequest>({
    mutationFn: ({ id, ...data }) => api.patch<ArchiveDocument>(`/archive/documents/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archive-documents'] });
    },
  });
}

export function useDeleteArchiveDocument() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => api.delete<void>(`/archive/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archive-documents'] });
    },
  });
}

// ---------------------------------------------------------------------------
// POA Hooks
// ---------------------------------------------------------------------------

export function usePoas(params?: Record<string, string>) {
  const qs = params ? new URLSearchParams(params).toString() : '';
  const path = qs ? `/archive/poa?${qs}` : '/archive/poa';
  return useQuery<Poa[]>({
    queryKey: archiveKeys.poas(params),
    queryFn: () => api.get<Poa[]>(path),
  });
}

export function usePoaStats() {
  return useQuery<PoaStats>({
    queryKey: archiveKeys.poaStats,
    queryFn: () => api.get<PoaStats>('/archive/poa/stats'),
  });
}

export function useCreatePoa() {
  const queryClient = useQueryClient();
  return useMutation<Poa, Error, CreatePoaRequest>({
    mutationFn: (data) => api.post<Poa>('/archive/poa', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poas'] });
    },
  });
}

export function useUpdatePoa() {
  const queryClient = useQueryClient();
  return useMutation<Poa, Error, UpdatePoaRequest>({
    mutationFn: ({ id, ...data }) => api.patch<Poa>(`/archive/poa/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poas'] });
    },
  });
}

export function useUpdatePoaStatus() {
  const queryClient = useQueryClient();
  return useMutation<Poa, Error, { id: string; status: string }>({
    mutationFn: ({ id, status }) => api.patch<Poa>(`/archive/poa/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poas'] });
    },
  });
}

export function useDeletePoa() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => api.delete<void>(`/archive/poa/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poas'] });
    },
  });
}
