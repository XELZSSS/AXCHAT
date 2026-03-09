import { ChatOrchestrator } from './chat/chatOrchestrator';

export type ChatService = ChatOrchestrator;

export const chatService = new ChatOrchestrator();
