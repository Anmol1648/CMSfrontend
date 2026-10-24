import { api } from './client';

/** The AI assistant (cmsbackend/src/modules/assistant). */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  links: { label: string; href: string }[];
  steps: { tool: string; args: unknown; ok: boolean; error?: string }[];
  feedback: 'up' | 'down' | null;
  createdAt: string;
}
export interface ChatSummary {
  id: string;
  title: string;
  updatedAt: string;
}

export const assistantApi = {
  suggestions: () => api.get<{ ready: boolean; why: string | null; suggestions: string[] }>('/assistant/suggestions'),
  chats: () => api.get<ChatSummary[]>('/assistant/chats'),
  chat: (id: string) => api.get<{ id: string; title: string; messages: ChatMessage[] }>(`/assistant/chats/${id}`),
  remove: (id: string) => api.delete(`/assistant/chats/${id}`),
  // Answers can take a few minutes: each look-up is a request to the school's AI.
  ask: (question: string, chatId: string | null) => api.post<{ chatId: string; title: string; message: ChatMessage }>('/assistant/ask', { question, chatId }, { timeout: 600_000 }),
  feedback: (messageId: string, feedback: 'up' | 'down' | null) => api.post(`/assistant/messages/${messageId}/feedback`, { feedback }),
};
