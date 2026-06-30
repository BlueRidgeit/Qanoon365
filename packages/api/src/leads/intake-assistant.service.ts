import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AzureOpenAI } from 'openai';

export interface IntakeResult {
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
  confidence: number;
  extractionNotes: string;
}

const SYSTEM_PROMPT = `You are a legal intake assistant at a UAE law firm (Al Basti).
Your task is to extract structured data from raw enquiry text — emails, phone notes, or walk-in summaries.

EXTRACTION RULES:
- Extract all identifiable fields from the text
- For caseType use ONE of: litigation, corporate, banking_finance, real_estate, employment, family, criminal, ip, arbitration, regulatory, general
- For jurisdiction use ONE of: uae_onshore, difc, adgm, gcc_other
- For urgency use ONE of: standard, urgent, critical
- For clientType use ONE of: individual, company
- If a field cannot be determined, set it to null
- The "subject" should be a concise one-line summary of the enquiry
- The "caseSummary" should be a clean, professional rewrite of the key facts
- Convert any currency amounts to AED where possible
- Handle Arabic names and transliterations carefully
- Note any ambiguities or missing information in extractionNotes
- Rate your overall extraction confidence from 0.0 to 1.0

Respond with ONLY valid JSON:
{
  "subject": "Concise one-line enquiry subject",
  "caseType": "litigation|corporate|...",
  "jurisdiction": "uae_onshore|difc|adgm|gcc_other",
  "urgency": "standard|urgent|critical",
  "caseSummary": "Professional rewrite of key facts",
  "clientName": "Name of prospective client or null",
  "clientType": "individual|company|null",
  "opposingPartyNames": "Comma-separated names or null",
  "estimatedValue": 0,
  "referralSource": "How the enquiry came in or null",
  "confidence": 0.0,
  "extractionNotes": "Any ambiguities or notes for the intake team"
}`;

@Injectable()
export class IntakeAssistantService {
  private readonly logger = new Logger(IntakeAssistantService.name);
  private client: AzureOpenAI;
  private deploymentName: string;

  constructor(private config: ConfigService) {
    const endpoint = this.config.getOrThrow<string>('AZURE_OPENAI_ENDPOINT');
    const apiKey = this.config.getOrThrow<string>('AZURE_OPENAI_API_KEY');
    const apiVersion = this.config.get<string>(
      'AZURE_OPENAI_API_VERSION',
      '2024-12-01-preview',
    );
    this.deploymentName = this.config.get<string>(
      'AZURE_OPENAI_DEPLOYMENT',
      'gpt-4o',
    );

    this.client = new AzureOpenAI({ endpoint, apiKey, apiVersion });
  }

  /**
   * Parse raw enquiry text (email, phone notes, etc.) into structured lead data.
   */
  async parseEnquiry(rawText: string): Promise<IntakeResult> {
    this.logger.log(
      `Parsing enquiry text (${rawText.length} chars) via AI intake assistant`,
    );

    const userMessage = `Parse the following raw enquiry and extract structured intake data.\n\n---\n${rawText}\n---`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.deploymentName,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const raw = response.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(raw);

      return {
        subject: parsed.subject ?? 'Untitled Enquiry',
        caseType: parsed.caseType ?? 'general',
        jurisdiction: parsed.jurisdiction ?? 'uae_onshore',
        urgency: parsed.urgency ?? 'standard',
        caseSummary: parsed.caseSummary ?? rawText.slice(0, 500),
        clientName: parsed.clientName || undefined,
        clientType: parsed.clientType || undefined,
        opposingPartyNames: parsed.opposingPartyNames || undefined,
        estimatedValue:
          typeof parsed.estimatedValue === 'number'
            ? parsed.estimatedValue
            : undefined,
        referralSource: parsed.referralSource || undefined,
        confidence:
          typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
        extractionNotes:
          parsed.extractionNotes ?? 'No additional notes from AI extraction.',
      };
    } catch (error: any) {
      this.logger.error(`AI intake parsing failed: ${error.message}`);

      // Return a best-effort fallback so the enquiry is not lost
      return {
        subject: 'Enquiry (AI parsing failed)',
        caseType: 'general',
        jurisdiction: 'uae_onshore',
        urgency: 'standard',
        caseSummary: rawText.slice(0, 1000),
        confidence: 0,
        extractionNotes: `AI extraction failed: ${error.message}. Raw text preserved in caseSummary.`,
      };
    }
  }
}
