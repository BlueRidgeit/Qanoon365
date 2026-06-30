import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AzureOpenAI } from 'openai';
import {
  IAiDraftingProvider,
  DraftRequest,
  DraftResult,
  DraftTemplateType,
} from '../ai-drafting.provider.js';

const SYSTEM_PROMPT = `You are a senior legal document drafter at a prestigious UAE law firm (Al Basti & Associates).
You draft professional legal documents in the appropriate jurisdiction's conventions (DIFC common law, ADGM, or UAE Federal civil law).

IMPORTANT RULES:
- Draft in a formal, professional tone appropriate for UAE legal practice
- Include proper headers, date, and reference numbers where applicable
- Use the entity data provided — never fabricate client names, matter numbers, or dates
- Mark any sections that need manual review with [REVIEW REQUIRED]
- Include appropriate Arabic honorifics and salutations when relevant
- Output clean markdown that can be directly converted to a document
- If the language is Arabic, draft the entire document in Arabic with proper RTL formatting`;

const TEMPLATE_PROMPTS: Record<DraftTemplateType, string> = {
  engagement_letter: `Draft a professional engagement letter for the specified legal matter.

Structure:
1. Firm letterhead reference (Al Basti & Associates)
2. Date and reference number
3. Client name and address
4. Re: [Matter description]
5. Scope of engagement
6. Fee arrangement (use the engagement type and estimated fees data)
7. Terms and conditions
8. Confidentiality clause
9. Conflict of interest disclosure
10. Signature blocks

Use the practice area and jurisdiction to tailor legal language appropriately.`,

  legal_memo: `Draft an internal legal memorandum based on the matter details and any available court intelligence.

Structure:
1. MEMORANDUM header
2. To / From / Date / Re fields
3. Executive Summary
4. Facts of the Matter
5. Legal Issues
6. Analysis (cite relevant UAE/DIFC/ADGM law as appropriate to the jurisdiction)
7. Conclusions and Recommendations

Use formal memo format with numbered paragraphs.`,

  client_update: `Draft a client update letter summarizing recent developments on the matter.

Structure:
1. Firm letterhead reference
2. Date and reference
3. Client greeting (use preferred language if available)
4. Summary of recent activities and developments
5. Current status and next steps
6. Timeline expectations
7. Professional closing

Keep the tone professional yet accessible. Summarize activities clearly.`,

  nda: `Draft a Non-Disclosure Agreement suitable for the jurisdiction specified.

Structure:
1. Agreement title and date
2. Parties (use client and firm details)
3. Recitals / Background
4. Definition of Confidential Information
5. Obligations of Receiving Party
6. Exclusions from Confidential Information
7. Term and Termination
8. Remedies
9. Governing Law (match the matter's jurisdiction)
10. Dispute Resolution (DIFC Courts, ADGM Courts, or UAE Federal Courts as appropriate)
11. General Provisions
12. Signature Blocks

Use standard NDA language appropriate for the jurisdiction.`,

  demand_letter: `Draft a formal demand letter on behalf of the client.

Structure:
1. Firm letterhead reference (Al Basti & Associates, Advocates & Legal Consultants)
2. Date and reference number
3. Opposing party details
4. WITHOUT PREJUDICE heading (where appropriate)
5. Background facts
6. Legal basis for the claim
7. Specific demands with deadline
8. Consequences of non-compliance
9. Invitation to settle / negotiate
10. Professional closing

Use assertive but professional language. Reference applicable UAE law.`,
};

@Injectable()
export class AzureOpenAIDraftingProvider implements IAiDraftingProvider {
  private client: AzureOpenAI;
  private deploymentName: string;

  constructor(private config: ConfigService) {
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

  async generateDraft(
    request: DraftRequest,
    context: Record<string, any>,
  ): Promise<DraftResult> {
    const startTime = Date.now();

    const templatePrompt = TEMPLATE_PROMPTS[request.templateType];
    const contextMessage = this.buildContextMessage(context);

    const languageInstruction = request.language === 'ar'
      ? '\n\nIMPORTANT: Draft the entire document in Arabic (العربية). Use formal Arabic legal language.'
      : '';

    const userMessage = `${templatePrompt}${languageInstruction}

## Entity Data
${contextMessage}

${request.additionalContext ? `## Additional Instructions\n${request.additionalContext}` : ''}

## Output Format
Respond with ONLY valid JSON:
{
  "content": "The full document in markdown format",
  "suggestedFileName": "descriptive-filename.md"
}`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.deploymentName,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.4,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      });

      const raw = response.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(raw);
      const processingTimeMs = Date.now() - startTime;

      return {
        content: parsed.content ?? '# Draft Generation Failed\n\nPlease try again.',
        suggestedFileName: parsed.suggestedFileName ?? `${request.templateType}-draft.md`,
        templateType: request.templateType,
        metadata: {
          entityType: request.entityType,
          entityId: request.entityId,
          tokensUsed: response.usage?.total_tokens ?? 0,
          processingTimeMs,
        },
      };
    } catch (error: any) {
      const processingTimeMs = Date.now() - startTime;
      return {
        content: `# Draft Generation Error\n\nThe AI drafting service encountered an error: ${error.message ?? 'Unknown error'}.\n\nPlease try again or contact support.`,
        suggestedFileName: `${request.templateType}-error.md`,
        templateType: request.templateType,
        metadata: {
          entityType: request.entityType,
          entityId: request.entityId,
          tokensUsed: 0,
          processingTimeMs,
        },
      };
    }
  }

  private buildContextMessage(context: Record<string, any>): string {
    const parts: string[] = [];

    if (context.matter) {
      const m = context.matter;
      parts.push(`### Matter`);
      parts.push(`- Number: ${m.matterNumber}`);
      parts.push(`- Name: ${m.name}`);
      parts.push(`- Status: ${m.status}`);
      parts.push(`- Practice Area: ${m.practiceArea ?? 'N/A'}`);
      parts.push(`- Lead Partner: ${m.leadPartner ?? 'N/A'}`);
      parts.push(`- Open Date: ${m.openDate ?? 'N/A'}`);
    }

    if (context.opportunity) {
      const o = context.opportunity;
      parts.push(`### Engagement`);
      parts.push(`- Name: ${o.name}`);
      parts.push(`- Stage: ${o.stage}`);
      parts.push(`- Practice Area: ${o.practiceArea ?? 'N/A'}`);
      parts.push(`- Engagement Type: ${o.engagementType ?? 'N/A'}`);
      parts.push(`- Estimated Fees: ${o.estimatedValue ? `AED ${o.estimatedValue.toLocaleString()}` : 'N/A'}`);
      parts.push(`- Jurisdiction: ${o.jurisdiction ?? 'N/A'}`);
    }

    if (context.client) {
      const c = context.client;
      parts.push(`### Client`);
      parts.push(`- Name: ${c.name}`);
      parts.push(`- Type: ${c.clientType ?? 'N/A'}`);
      parts.push(`- Industry: ${c.industry ?? 'N/A'}`);
      parts.push(`- Preferred Language: ${c.preferredLanguage ?? 'English'}`);
      parts.push(`- KYC Status: ${c.kycStatus ?? 'N/A'}`);
    }

    if (context.activities?.length) {
      parts.push(`\n### Recent Activities (${context.activities.length})`);
      for (const a of context.activities.slice(0, 10)) {
        parts.push(`- [${a.activityDate}] ${a.activityType}: ${a.subject}${a.body ? ` — ${a.body.substring(0, 200)}` : ''}`);
      }
    }

    if (context.courtIntel) {
      parts.push(`\n### Court Intelligence Summary`);
      parts.push(context.courtIntel.resultSummary ?? 'No summary available');
    }

    return parts.join('\n') || 'No entity data available.';
  }
}
