export interface ChatMessage { role: 'user' | 'assistant' | 'system'; content: string; [key: string]: any; }
export const chatbotService = {
  sendMessage: async (message: any): Promise<any> => ({ message: `I received your message: ${message?.message || message?.content || ''}`, suggestedActions: [] }),
  submitFeedback: async (_feedback: unknown): Promise<void> => undefined,
};
