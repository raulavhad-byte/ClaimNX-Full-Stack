export class CreateAuditLogDto {
  hospital_id?: string | null;

  user_id?: string | null;

  module!: string;

  action!: string;

  entity?: string | null;

  entity_id?: string | null;

  old_values?: Record<string, any> | null;

  new_values?: Record<string, any> | null;

  ip_address?: string | null;

  user_agent?: string | null;
}