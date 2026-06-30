export type CourtIntelQueryType =
  | 'party_intelligence'
  | 'comparable_case'
  | 'contextual_case_law'
  | 'opposing_counsel';

export type CourtIntelSourceEntityType = 'client' | 'opportunity' | 'matter';

export interface CourtIntelContextLinkParams {
  sourceEntityType: CourtIntelSourceEntityType;
  sourceEntityId: string;
  sourceTitle?: string;
  clientName?: string;
  practiceArea?: string;
  jurisdiction?: string;
  caseType?: string;
  defaultQueryType?: CourtIntelQueryType;
}

export interface CourtIntelPageContext {
  sourceEntityType?: CourtIntelSourceEntityType;
  sourceEntityId?: string;
  sourceTitle?: string;
  clientName?: string;
  practiceArea?: string;
  jurisdiction?: string;
  caseType?: string;
  defaultQueryType: CourtIntelQueryType;
  clientId?: string;
  opportunityId?: string;
  matterId?: string;
}

const VALID_QUERY_TYPES = new Set<CourtIntelQueryType>([
  'party_intelligence',
  'comparable_case',
  'contextual_case_law',
  'opposing_counsel',
]);

const VALID_SOURCE_TYPES = new Set<CourtIntelSourceEntityType>([
  'client',
  'opportunity',
  'matter',
]);

export function buildCourtIntelContextHref(
  params: CourtIntelContextLinkParams,
): string {
  const searchParams = new URLSearchParams();
  searchParams.set('sourceEntityType', params.sourceEntityType);
  searchParams.set('sourceEntityId', params.sourceEntityId);
  searchParams.set(
    'queryType',
    params.defaultQueryType ?? 'party_intelligence',
  );

  if (params.sourceTitle) searchParams.set('sourceTitle', params.sourceTitle);
  if (params.clientName) searchParams.set('clientName', params.clientName);
  if (params.practiceArea) searchParams.set('practiceArea', params.practiceArea);
  if (params.jurisdiction) searchParams.set('jurisdiction', params.jurisdiction);
  if (params.caseType) searchParams.set('caseType', params.caseType);

  return `/court-intel?${searchParams.toString()}`;
}

export function parseCourtIntelPageContext(searchParams: {
  get(name: string): string | null;
}): CourtIntelPageContext {
  const sourceEntityType = searchParams.get('sourceEntityType');
  const sourceEntityId = searchParams.get('sourceEntityId');
  const rawQueryType = searchParams.get('queryType');
  const defaultQueryType = VALID_QUERY_TYPES.has(
    rawQueryType as CourtIntelQueryType,
  )
    ? (rawQueryType as CourtIntelQueryType)
    : 'party_intelligence';

  const normalizedSourceEntityType = VALID_SOURCE_TYPES.has(
    sourceEntityType as CourtIntelSourceEntityType,
  )
    ? (sourceEntityType as CourtIntelSourceEntityType)
    : undefined;
  const normalizedSourceEntityId = sourceEntityId || undefined;

  return {
    sourceEntityType: normalizedSourceEntityType,
    sourceEntityId: normalizedSourceEntityId,
    sourceTitle: searchParams.get('sourceTitle') || undefined,
    clientName: searchParams.get('clientName') || undefined,
    practiceArea: searchParams.get('practiceArea') || undefined,
    jurisdiction: searchParams.get('jurisdiction') || undefined,
    caseType: searchParams.get('caseType') || undefined,
    defaultQueryType,
    clientId:
      normalizedSourceEntityType === 'client'
        ? normalizedSourceEntityId
        : undefined,
    opportunityId:
      normalizedSourceEntityType === 'opportunity'
        ? normalizedSourceEntityId
        : undefined,
    matterId:
      normalizedSourceEntityType === 'matter'
        ? normalizedSourceEntityId
        : undefined,
  };
}
