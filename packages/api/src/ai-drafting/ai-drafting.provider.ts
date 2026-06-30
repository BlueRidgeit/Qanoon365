/**
 * AI Document Drafting Provider Interface
 *
 * Follows the same swappable-provider pattern as Court Intelligence.
 * Swap by changing the registered provider class in ai-drafting.module.ts.
 */

export type DraftTemplateType =
  | 'engagement_letter'
  | 'legal_memo'
  | 'client_update'
  | 'nda'
  | 'demand_letter';

export interface DraftRequest {
  templateType: DraftTemplateType;
  entityType: 'matter' | 'opportunity';
  entityId: string;
  /** Additional free-text context from the user */
  additionalContext?: string;
  /** Language preference */
  language?: 'en' | 'ar';
}

export interface DraftResult {
  content: string; // Markdown content
  suggestedFileName: string;
  templateType: DraftTemplateType;
  metadata: {
    entityType: string;
    entityId: string;
    tokensUsed: number;
    processingTimeMs: number;
  };
}

export interface DraftTemplate {
  type: DraftTemplateType;
  name: string;
  description: string;
  supportedEntities: Array<'matter' | 'opportunity'>;
}

export const AI_DRAFTING_PROVIDER = 'AI_DRAFTING_PROVIDER';

export interface IAiDraftingProvider {
  /**
   * Generate a document draft using AI
   * @param request - draft request with entity context
   * @param context - structured data from the database
   * @returns markdown content and metadata
   */
  generateDraft(
    request: DraftRequest,
    context: Record<string, any>,
  ): Promise<DraftResult>;
}
