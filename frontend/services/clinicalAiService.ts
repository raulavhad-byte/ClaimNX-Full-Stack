export const clinicalAiService = {
  draftQueryReply: async (_claim: unknown, query: string) => ({ draft: `Thank you for your query. We will review: ${query}` }),
  suggestICD10: async (_diagnosis: string) => ({ code: '', description: '' }),
};
