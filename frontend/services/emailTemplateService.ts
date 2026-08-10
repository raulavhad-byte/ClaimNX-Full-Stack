let templates: any[] = [];
export const emailTemplateService = {
  getTemplates: () => templates,
  saveTemplates: (next: any[]) => { templates = next; },
};
