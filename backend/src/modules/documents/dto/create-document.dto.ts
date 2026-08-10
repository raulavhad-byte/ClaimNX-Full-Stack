import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateDocumentDto {
  @IsUUID()
  claim_id: string;

  @IsString()
  file_name: string;

  @IsString()
  file_path: string;

  @IsOptional()
  @IsString()
  mime_type?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  file_size?: number;

  @IsOptional()
  @IsUUID()
  uploaded_by?: string;
}