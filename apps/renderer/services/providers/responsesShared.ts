export type ResponseInputMessage = {
  type: 'message';
  role: 'user' | 'assistant';
  content: Array<{ type: 'input_text'; text: string }>;
};

export type ResponseFunctionTool = {
  type: 'function';
  name: string;
  description: string;
  strict: true;
  parameters: {
    type: 'object';
    properties: {
      query: { type: 'string'; description: string };
      search_depth: {
        type: 'string';
        enum: ['basic', 'advanced', 'fast', 'ultra-fast'];
        description: string;
      };
      max_results: {
        type: 'integer';
        minimum: 1;
        maximum: 20;
        description: string;
      };
      topic: {
        type: 'string';
        enum: ['general', 'news', 'finance'];
        description: string;
      };
      include_answer: { type: 'boolean'; description: string };
    };
    required: ['query'];
    additionalProperties: false;
  };
};

export type ResponseFunctionCallItem = {
  type: 'function_call';
  call_id: string;
  name: string;
  arguments: string;
};

export type ResponseUsagePayload = {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  input_tokens_details?: {
    cached_tokens?: number;
  };
};

export type ResponseStreamEvent = {
  type?: string;
  delta?: string;
  text?: string;
  item?: {
    type?: string;
    call_id?: string;
    name?: string;
    arguments?: string;
  };
  response?: {
    id?: string;
    usage?: ResponseUsagePayload;
  };
};

export const createResponseTools = (): ResponseFunctionTool[] => [
  {
    type: 'function',
    name: 'tavily_search',
    description:
      'Search the web for up-to-date information and return a concise summary with sources.',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        search_depth: {
          type: 'string',
          enum: ['basic', 'advanced', 'fast', 'ultra-fast'],
          description: 'Search depth',
        },
        max_results: {
          type: 'integer',
          minimum: 1,
          maximum: 20,
          description: 'Number of results to return',
        },
        topic: {
          type: 'string',
          enum: ['general', 'news', 'finance'],
          description: 'Search topic',
        },
        include_answer: { type: 'boolean', description: 'Include answer summary' },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
];

export const toResponseInputMessages = (
  messages: Array<{ role: 'user' | 'model'; text: string; isError?: boolean }>
): ResponseInputMessage[] => {
  return messages
    .filter((msg) => !msg.isError)
    .map((msg) => ({
      type: 'message' as const,
      role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
      content: [
        {
          type: 'input_text' as const,
          text: msg.text,
        },
      ],
    }));
};
