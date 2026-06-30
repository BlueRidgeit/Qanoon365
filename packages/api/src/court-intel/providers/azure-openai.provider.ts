import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AzureOpenAI } from 'openai';
import {
  ICourtIntelProvider,
  CourtIntelQuery,
  CourtIntelResult,
  CourtIntelFinding,
} from '../court-intel.provider.js';

const SYSTEM_PROMPT = `You are a legal intelligence analyst specializing in UAE law (DIFC, ADGM, UAE Federal Courts).
You analyze court case data and CRM records to provide structured intelligence for law firms.

IMPORTANT RULES:
- Always respond with valid JSON matching the requested schema
- Base findings ONLY on the provided data context — never fabricate case numbers or outcomes
- If data is insufficient, say so honestly and lower the confidence rating
- Flag potential conflicts of interest when detected
- Consider Arabic name transliteration variants when matching parties
- Note jurisdictional differences (DIFC common law vs UAE civil law vs ADGM)`;

const QUERY_PROMPTS: Record<string, string> = {
  party_intelligence: `Analyze the provided court cases and CRM data to build an intelligence profile for the specified party.
Focus on:
1. Litigation history: how often do they appear in court? As plaintiff or defendant?
2. Case outcomes: win/loss ratio, settlement patterns
3. Industry and jurisdiction patterns
4. Related entities (subsidiaries, affiliates, key individuals)
5. Risk assessment: is this party litigious? Are they a reliable counterparty?
6. Any connections to existing clients or matters in the CRM data`,

  comparable_case: `Find and analyze cases comparable to the described matter.
Focus on:
1. Similar case type, jurisdiction, and practice area
2. Case duration and outcome patterns
3. Estimated timeline based on comparable cases
4. Key factors that influenced outcomes
5. Potential challenges based on precedent
6. Fee/value estimation based on comparable case values`,

  contextual_case_law: `Identify relevant precedents and case law for the described legal context.
Focus on:
1. Directly relevant precedents in the same jurisdiction
2. Persuasive authority from related jurisdictions (DIFC ↔ ADGM ↔ UAE Federal)
3. Key legal principles established
4. Recent trends in judicial reasoning
5. Distinguishing factors to be aware of
6. Recommended legal strategy based on precedent`,

  opposing_counsel: `Analyze the track record of the specified opposing counsel/firm.
Focus on:
1. Cases handled in the relevant jurisdiction and practice area
2. Win/loss ratio and case outcomes
3. Typical litigation strategies and patterns
4. Average case duration when this firm is involved
5. Settlement vs trial preferences
6. Any connections to your firm's clients or matters`,
};

@Injectable()
export class AzureOpenAIProvider implements ICourtIntelProvider {
  private client: AzureOpenAI;
  private deploymentName: string;
  private analysisMode: string;

  constructor(private config: ConfigService) {
    this.analysisMode = this.config.get<string>('COURT_INTEL_MODE', 'live');
    if (this.analysisMode === 'mock_contextual') {
      this.deploymentName = 'mock_contextual';
      return;
    }

    const endpoint = this.config.getOrThrow<string>('AZURE_OPENAI_ENDPOINT');
    const apiKey = this.config.getOrThrow<string>('AZURE_OPENAI_API_KEY');
    const apiVersion = this.config.get<string>('AZURE_OPENAI_API_VERSION', '2024-12-01-preview');
    this.deploymentName = this.config.get<string>('AZURE_OPENAI_DEPLOYMENT', 'gpt-4o');

    this.client = new AzureOpenAI({
      endpoint,
      apiKey,
      apiVersion,
    });
  }

  async analyze(query: CourtIntelQuery): Promise<CourtIntelResult> {
    const startTime = Date.now();
    if (this.analysisMode === 'mock_contextual') {
      return this.buildMockResult(query, startTime);
    }

    const contextMessage = this.buildContextMessage(query);
    const queryPrompt = QUERY_PROMPTS[query.queryType] ?? QUERY_PROMPTS['party_intelligence'];

    const userMessage = `${queryPrompt}

## Query Input
${JSON.stringify(query.queryInput, null, 2)}

## Data Context
${contextMessage}

## Required Response Format
Respond with ONLY valid JSON (no markdown, no code fences):
{
  "summary": "2-3 sentence executive summary",
  "confidence": "high|medium|low",
  "findings": [
    {
      "title": "Finding title",
      "description": "Detailed description",
      "relevanceScore": 0.0-1.0,
      "sourceType": "court_record|crm_data|inferred",
      "caseReference": "case number if applicable",
      "partyNames": ["names involved"],
      "jurisdiction": "DIFC|ADGM|UAE Federal|etc",
      "outcome": "outcome if known",
      "dateRange": "date range if applicable"
    }
  ],
  "riskFactors": ["list of risk factors"],
  "recommendations": ["list of actionable recommendations"]
}`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.deploymentName,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.3, // Lower temperature for factual analysis
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(content);

      const processingTimeMs = Date.now() - startTime;

      return {
        queryType: query.queryType,
        summary: parsed.summary ?? 'Analysis complete.',
        confidence: parsed.confidence ?? 'low',
        findings: (parsed.findings ?? []).map((f: any) => ({
          title: f.title ?? '',
          description: f.description ?? '',
          relevanceScore: typeof f.relevanceScore === 'number' ? f.relevanceScore : 0.5,
          sourceType: f.sourceType ?? 'inferred',
          caseReference: f.caseReference,
          partyNames: f.partyNames ?? [],
          jurisdiction: f.jurisdiction,
          outcome: f.outcome,
          dateRange: f.dateRange,
        })) as CourtIntelFinding[],
        riskFactors: parsed.riskFactors ?? [],
        recommendations: parsed.recommendations ?? [],
        metadata: {
          casesAnalyzed: query.dbContext.courtCases.length,
          partiesMatched: query.dbContext.parties.length,
          processingTimeMs,
        },
      };
    } catch (error: any) {
      const processingTimeMs = Date.now() - startTime;
      return {
        queryType: query.queryType,
        summary: `Analysis failed: ${error.message ?? 'Unknown error'}. Please try again.`,
        confidence: 'low',
        findings: [],
        riskFactors: ['LLM analysis could not be completed'],
        recommendations: ['Retry the query or perform manual analysis'],
        metadata: {
          casesAnalyzed: query.dbContext.courtCases.length,
          partiesMatched: query.dbContext.parties.length,
          processingTimeMs,
        },
      };
    }
  }

  private buildMockResult(
    query: CourtIntelQuery,
    startTime: number,
  ): CourtIntelResult {
    const primarySubject =
      query.queryInput.partyName ??
      query.queryInput.firmName ??
      query.queryInput.lawyerName ??
      query.queryInput.practiceArea ??
      query.queryInput.caseType ??
      query.dbContext.relatedClients?.[0]?.name ??
      query.dbContext.relatedMatters?.[0]?.name ??
      query.dbContext.relatedOpportunities?.[0]?.name ??
      'the linked record';

    const processingTimeMs = Date.now() - startTime;

    return {
      queryType: query.queryType,
      summary: `Contextual court intelligence prepared for ${primarySubject}. This mock response confirms the workflow carried the linked CRM context into AI research.`,
      confidence: 'medium',
      findings: [
        {
          title: 'Linked record context applied',
          description: `The AI workflow received ${query.queryType} context for ${primarySubject} together with ${query.dbContext.courtCases.length} court cases and ${query.dbContext.parties.length} matched parties.`,
          relevanceScore: 0.94,
          sourceType: 'crm_data',
        },
        {
          title: 'Suggested research direction',
          description: 'Use the linked matter, engagement, or client context to narrow the issue before broader court-law exploration.',
          relevanceScore: 0.83,
          sourceType: 'inferred',
        },
      ],
      riskFactors: [
        'Confirm the recommended authority against live court records before external reliance.',
      ],
      recommendations: [
        'Start from the current record context instead of a blank free-text query.',
        'Refine jurisdiction or case type only when the default context is insufficient.',
      ],
      metadata: {
        casesAnalyzed: query.dbContext.courtCases.length,
        partiesMatched: query.dbContext.parties.length,
        processingTimeMs,
      },
    };
  }

  private buildContextMessage(query: CourtIntelQuery): string {
    const parts: string[] = [];

    if (query.dbContext.courtCases.length > 0) {
      parts.push(`### Court Cases (${query.dbContext.courtCases.length} found)`);
      for (const c of query.dbContext.courtCases.slice(0, 20)) {
        parts.push(`- Case ${c.caseNumber} | ${c.court ?? 'Unknown Court'} | ${c.jurisdiction ?? ''} | Type: ${c.caseType ?? ''} | Filed: ${c.filingDate ?? 'N/A'} | Outcome: ${c.outcome ?? 'Pending'} | Duration: ${c.durationDays ?? 'N/A'} days`);
        if (c.parties?.length) {
          for (const p of c.parties) {
            parts.push(`  Party: ${p.courtParty?.name ?? 'Unknown'} (${p.role}) | Rep: ${p.representingFirm ?? 'N/A'} / ${p.representingLawyer ?? 'N/A'} | Outcome: ${p.outcomeForParty ?? 'N/A'}`);
          }
        }
      }
    } else {
      parts.push('### Court Cases: None found in database');
    }

    if (query.dbContext.parties.length > 0) {
      parts.push(`\n### Matched Parties (${query.dbContext.parties.length} found)`);
      for (const p of query.dbContext.parties.slice(0, 20)) {
        parts.push(`- ${p.name} (${p.partyType}) | Arabic: ${p.nameArabic ?? 'N/A'} | Normalized: ${p.nameNormalized ?? 'N/A'}`);
      }
    }

    if (query.dbContext.relatedMatters?.length) {
      parts.push(`\n### Related CRM Matters (${query.dbContext.relatedMatters.length})`);
      for (const m of query.dbContext.relatedMatters.slice(0, 10)) {
        parts.push(`- ${m.matterNumber}: ${m.name} | Status: ${m.status} | Practice: ${m.practiceArea ?? 'N/A'}`);
      }
    }

    if (query.dbContext.relatedOpportunities?.length) {
      parts.push(`\n### Related CRM Opportunities (${query.dbContext.relatedOpportunities.length})`);
      for (const o of query.dbContext.relatedOpportunities.slice(0, 10)) {
        parts.push(`- ${o.name} | Stage: ${o.stage} | Conflict: ${o.conflictCheckStatus} | Value: ${o.estimatedValue ?? 'N/A'}`);
      }
    }

    if (query.dbContext.relatedClients?.length) {
      parts.push(`\n### Related CRM Clients (${query.dbContext.relatedClients.length})`);
      for (const client of query.dbContext.relatedClients.slice(0, 10)) {
        parts.push(`- ${client.name} | Type: ${client.clientType ?? 'N/A'} | Industry: ${client.industry ?? 'N/A'} | KYC: ${client.kycStatus ?? 'N/A'} | Risk: ${client.riskRating ?? 'N/A'}`);
      }
    }

    return parts.join('\n');
  }
}
