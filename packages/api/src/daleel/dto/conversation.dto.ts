export interface MessageSource {
  documentId: string;
  fileName: string;
  page: number | null;
  snippet: string;
  score: number;
}

export interface MessageResponse {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  sources: MessageSource[] | null;
  createdAt: Date;
}

export interface ConversationResponse {
  id: string;
  userId: string;
  matterId: string | null;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationWithMessages extends ConversationResponse {
  messages: MessageResponse[];
}

export interface ChatResponse {
  conversationId: string;
  message: MessageResponse;
}
