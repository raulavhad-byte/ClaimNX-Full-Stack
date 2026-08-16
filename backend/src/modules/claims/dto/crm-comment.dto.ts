import { IsArray, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CrmCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  comment: string;

  @IsOptional()
  @IsArray()
  attachments?: Array<{ id?: string; name?: string; mimeType?: string }>;
}
