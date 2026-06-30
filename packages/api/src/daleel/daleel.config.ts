import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DaleelConfig {
  readonly searchEndpoint: string;
  readonly searchKey: string;
  readonly searchIndex: string;
  readonly openaiEndpoint: string;
  readonly openaiApiKey: string;
  readonly openaiDeployment: string;
  readonly openaiApiVersion: string;
  readonly embeddingDeployment: string;
  readonly topK: number;
  readonly maxHistoryMessages: number;

  constructor(config: ConfigService) {
    this.searchEndpoint = config.get<string>('AZURE_SEARCH_ENDPOINT', '');
    this.searchKey = config.get<string>('AZURE_SEARCH_KEY', '');
    this.searchIndex = config.get<string>('AZURE_SEARCH_INDEX', 'qanoon365-docs');
    this.openaiEndpoint = config.get<string>('AZURE_OPENAI_ENDPOINT', '');
    this.openaiApiKey = config.get<string>('AZURE_OPENAI_API_KEY', '');
    this.openaiDeployment = config.get<string>('AZURE_OPENAI_DEPLOYMENT', 'gpt-4o');
    this.openaiApiVersion = config.get<string>('AZURE_OPENAI_API_VERSION', '2024-12-01-preview');
    this.embeddingDeployment = config.get<string>('AZURE_OPENAI_EMBEDDING_DEPLOYMENT', 'text-embedding-3-large');
    this.topK = config.get<number>('DALEEL_TOP_K', 5);
    this.maxHistoryMessages = config.get<number>('DALEEL_MAX_HISTORY', 20);
  }
}
