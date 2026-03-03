import { ChatOrchestrator } from './chat/chatOrchestrator';

export class ChatService extends ChatOrchestrator {}

// Singleton-ish instance for simple usage, though App can instantiate its own
export const chatService = new ChatService();
