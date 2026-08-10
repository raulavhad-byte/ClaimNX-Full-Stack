import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';
export class CreateHospitalDepartmentDto {
  @IsString() @IsNotEmpty() departmentCode: string;
  @IsString() @IsNotEmpty() departmentName: string;
  @IsOptional() @IsUUID() departmentTypeReferenceValueId?: string;
  @IsUUID() operationalStatusReferenceValueId: string;
  @IsOptional() @IsString() description?: string;
}
export class UpdateHospitalDepartmentDto {
  @IsInt() @Min(1) version: number;
  @IsOptional() @IsString() @IsNotEmpty() departmentCode?: string;
  @IsOptional() @IsString() @IsNotEmpty() departmentName?: string;
  @IsOptional() @IsUUID() departmentTypeReferenceValueId?: string;
  @IsOptional() @IsUUID() operationalStatusReferenceValueId?: string;
  @IsOptional() @IsString() description?: string;
}
export class DeleteHospitalDepartmentDto { @IsInt() @Min(1) version: number; }
