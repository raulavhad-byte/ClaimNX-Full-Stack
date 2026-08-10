import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class WorkflowDefinitionStateRequestDto {
  @IsString() @IsNotEmpty() code: string;
  @IsString() @IsNotEmpty() name: string;
  @IsInt() @Min(1) displayOrder: number;
  @IsOptional() @IsInt() @Min(1) slaTargetMinutes?: number;
  @IsBoolean() isInitial: boolean;
  @IsBoolean() isTerminal: boolean;
}

export class WorkflowDefinitionTransitionRequestDto {
  @IsString() @IsNotEmpty() fromStateCode: string;
  @IsString() @IsNotEmpty() toStateCode: string;
  @IsOptional() @IsBoolean() requiresComment?: boolean;
  @IsOptional() @IsBoolean() approvalRequired?: boolean;
}

export class CreateWorkflowDefinitionRequestDto {
  @IsString() @IsNotEmpty() code: string;
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() allowsReopen?: boolean;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowDefinitionStateRequestDto)
  states: WorkflowDefinitionStateRequestDto[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowDefinitionTransitionRequestDto)
  transitions?: WorkflowDefinitionTransitionRequestDto[];
}

export class VersionRequestDto {
  @IsInt() @Min(1) version: number;
}

export class StartWorkflowInstanceRequestDto {
  @IsString() @IsNotEmpty() instanceReference: string;
  @IsUUID() workflowDefinitionId: string;
  @IsUUID() hospitalId: string;
  @IsString() @IsNotEmpty() sourceType: string;
  @IsUUID() sourceId: string;
  @IsOptional() @IsString() priority?: string;
}

export class TransitionWorkflowInstanceRequestDto extends VersionRequestDto {
  @IsUUID() targetStateId: string;
  @IsOptional() @IsString() description?: string;
}

export class CancelWorkflowInstanceRequestDto extends VersionRequestDto {
  @IsString() @IsNotEmpty() closureReason: string;
}

export class CreateWorkflowQueueRequestDto {
  @IsString() @IsNotEmpty() code: string;
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() type: string;
  @IsOptional() @IsUUID() scopeHospitalId?: string;
}

export class UpdateWorkflowQueueRequestDto extends CreateWorkflowQueueRequestDto {
  @IsInt() @Min(1) version: number;
}

export class CreateWorkItemRequestDto {
  @IsUUID() workflowInstanceId: string;
  @IsOptional() @IsUUID() workflowStateId?: string;
  @IsString() @IsNotEmpty() type: string;
  @IsString() @IsNotEmpty() title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUUID() queueId?: string;
  @IsOptional() @IsUUID() assignedOrganizationMemberId?: string;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsInt() @Min(1) slaTargetMinutes?: number;
}

export class AssignWorkItemRequestDto extends VersionRequestDto {
  @IsOptional() @IsUUID() queueId?: string;
  @IsOptional() @IsUUID() assignedOrganizationMemberId?: string;
}

export class TransitionWorkItemRequestDto extends VersionRequestDto {
  @IsIn(['IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
  targetStatus: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  @IsOptional() @IsString() description?: string;
}

export class UpdateWorkItemSlaRequestDto {
  @IsUUID() workflowSlaId: string;
  @IsInt() @Min(1) workItemVersion: number;
  @IsInt() @Min(1) slaVersion: number;
  @IsInt() @Min(1) targetMinutes: number;
  @IsBoolean() pause: boolean;
  @IsOptional() @IsString() pauseReason?: string;
}
