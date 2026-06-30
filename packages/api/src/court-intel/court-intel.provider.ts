/**
 * Court Intelligence Provider Interface
 *
 * This abstraction allows swapping the underlying LLM:
 *  - AzureOpenAIProvider (dev) — GPT-4o with DB context
 *  - UaeCourtLlmProvider (prod) — your own model grounded in UAE court data
 *
 * To swap: change COURT_INTEL_PROVIDER env var and register the new class.
 */

export interface CourtIntelQuery {
  queryType: 'party_intelligence' | 'comparable_case' | 'contextual_case_law' | 'opposing_counsel';
  /** Structured context retrieved from DB before LLM call */
  dbContext: {
    courtCases: any[];
    parties: any[];
    relatedMatters?: any[];
    relatedOpportunities?: any[];
    relatedClients?: any[];
  };
  /** The user's original query input */
  queryInput: {
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
  };
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

export interface CourtIntelFinding {
  title: string;
  description: string;
  relevanceScore: number; // 0-1
  sourceType: 'court_record' | 'crm_data' | 'inferred';
  caseReference?: string;
  partyNames?: string[];
  jurisdiction?: string;
  outcome?: string;
  dateRange?: string;
}

export const COURT_INTEL_PROVIDER = 'COURT_INTEL_PROVIDER';

export interface ICourtIntelProvider {
  /**
   * Execute a court intelligence query against the LLM
   * @param query - structured query with DB context already loaded
   * @returns structured intelligence result
   */
  analyze(query: CourtIntelQuery): Promise<CourtIntelResult>;
}
