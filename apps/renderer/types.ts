export enum Role {
  User = 'user',
  Model = 'model',
}

export type Citation = {
  sourceKind: 'local' | 'remote' | 'web';
  snippet: string;
  score?: number;
  sourcePath?: string;
  remoteProvider?: 'openai-vector-store';
  documentId?: string;
  documentName?: string;
  chunkId?: string;
  chunkIndex?: number;
  url?: string;
  title?: string;
};

export interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  timestamp: number;
  timeLabel?: string;
  isError?: boolean;
  reasoning?: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    argumentsText: string;
    source?: 'custom' | 'native';
    provider?: ProviderId;
  }>;
  toolResults?: Array<{
    id: string;
    name: string;
    outputText: string;
    isError?: boolean;
    source?: 'custom' | 'native';
    provider?: ProviderId;
  }>;
  citations?: Citation[];
}

export interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  isLoading: boolean;
}

export type ProviderId =
  | 'gemini'
  | 'openai'
  | 'openai-compatible'
  | 'xai'
  | 'deepseek'
  | 'glm'
  | 'minimax'
  | 'moonshot';

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  provider: ProviderId;
  model: string;
  createdAt: number;
  updatedAt: number;
}

export type TavilySearchDepth = 'basic' | 'advanced' | 'fast' | 'ultra-fast';
export type TavilyTopic = 'general' | 'news' | 'finance';

export interface TavilyConfig {
  apiKey?: string;
  projectId?: string;
  searchDepth?: TavilySearchDepth;
  maxResults?: number;
  topic?: TavilyTopic;
  includeAnswer?: boolean;
}

export interface ProviderError {
  provider: ProviderId;
  message: string;
  cause?: unknown;
}
