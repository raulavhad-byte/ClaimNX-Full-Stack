import { IsInt, IsUUID, Min } from 'class-validator';
export class SetHospitalPrimaryChildRequestDto {
  @IsUUID() childId: string;
  @IsInt() @Min(1) version: number;
}
