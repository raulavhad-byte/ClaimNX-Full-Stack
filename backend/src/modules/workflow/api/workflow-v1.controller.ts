import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { GetWorkItemUseCase } from '../application/get-work-item.use-case';
import { GetWorkflowDefinitionUseCase } from '../application/get-workflow-definition.use-case';
import { GetWorkflowInstanceUseCase } from '../application/get-workflow-instance.use-case';
import { GetWorkflowQueueUseCase } from '../application/get-workflow-queue.use-case';
import { WorkflowPlatformCommandUseCases } from '../application/workflow-platform-command.use-cases';
import { WorkflowWorkItemCommandUseCases } from '../application/workflow-work-item-command.use-cases';

import {
  AssignWorkItemRequestDto,
  CancelWorkflowInstanceRequestDto,
  CreateWorkflowDefinitionRequestDto,
  CreateWorkflowQueueRequestDto,
  CreateWorkItemRequestDto,
  StartWorkflowInstanceRequestDto,
  TransitionWorkflowInstanceRequestDto,
  TransitionWorkItemRequestDto,
  UpdateWorkflowQueueRequestDto,
  UpdateWorkItemSlaRequestDto,
  VersionRequestDto,
} from './dto/workflow-command-request.dto';

@Controller('v1')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WorkflowV1Controller {
  constructor(
    private readonly platformCommands: WorkflowPlatformCommandUseCases,
    private readonly workItemCommands: WorkflowWorkItemCommandUseCases,
    private readonly getDefinition: GetWorkflowDefinitionUseCase,
    private readonly getInstance: GetWorkflowInstanceUseCase,
    private readonly getQueue: GetWorkflowQueueUseCase,
    private readonly getWorkItem: GetWorkItemUseCase,
  ) {}

  @Post('workflow-definitions')
  @Permissions('workflow.definitions.manage')
  async createDefinition(
    @CurrentUser('id') actorUserId: string,
    @Body() body: CreateWorkflowDefinitionRequestDto,
  ) {
    return {
      workflowDefinitionId: await this.platformCommands.createDefinition({
        actorUserId,
        ...body,
      }),
    };
  }

  @Get('workflow-definitions/:workflowDefinitionId')
  @Permissions('workflow.definitions.view')
  async getDefinitionById(
    @Param('workflowDefinitionId', ParseUUIDPipe) workflowDefinitionId: string,
  ) {
    const definition = await this.getDefinition.execute(workflowDefinitionId);
    return {
      ...definition.snapshot,
      states: definition.workflowStates,
      transitions: definition.workflowTransitions,
    };
  }

  @Patch('workflow-definitions/:workflowDefinitionId/activate')
  @Permissions('workflow.definitions.manage')
  async activateDefinition(
    @Param('workflowDefinitionId', ParseUUIDPipe) workflowDefinitionId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() body: VersionRequestDto,
  ) {
    return {
      workflowDefinitionId: await this.platformCommands.activateDefinition({
        actorUserId,
        workflowDefinitionId,
        ...body,
      }),
      status: 'ACTIVE',
    };
  }

  @Delete('workflow-definitions/:workflowDefinitionId')
  @Permissions('workflow.definitions.manage')
  async retireDefinition(
    @Param('workflowDefinitionId', ParseUUIDPipe) workflowDefinitionId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() body: VersionRequestDto,
  ) {
    return {
      workflowDefinitionId: await this.platformCommands.retireDefinition({
        actorUserId,
        workflowDefinitionId,
        ...body,
      }),
      retired: true,
    };
  }

  @Post('organizations/:organizationId/workflow-instances')
  @Permissions('workflow.instances.manage')
  async startInstance(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() body: StartWorkflowInstanceRequestDto,
  ) {
    return {
      workflowInstanceId: await this.platformCommands.startInstance({
        actorUserId,
        organizationId,
        ...body,
      }),
    };
  }

  @Get('organizations/:organizationId/workflow-instances/:workflowInstanceId')
  @Permissions('workflow.instances.view')
  async getInstanceById(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('workflowInstanceId', ParseUUIDPipe) workflowInstanceId: string,
    @CurrentUser('id') actorUserId: string,
  ) {
    return (
      await this.getInstance.execute({
        actorUserId,
        organizationId,
        workflowInstanceId,
      })
    ).snapshot;
  }

  @Patch(
    'organizations/:organizationId/workflow-instances/:workflowInstanceId/transition',
  )
  @Permissions('workflow.instances.manage')
  async transitionInstance(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('workflowInstanceId', ParseUUIDPipe) workflowInstanceId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() body: TransitionWorkflowInstanceRequestDto,
  ) {
    return {
      workflowInstanceId: await this.platformCommands.transitionInstance({
        actorUserId,
        organizationId,
        workflowInstanceId,
        ...body,
      }),
    };
  }

  @Patch(
    'organizations/:organizationId/workflow-instances/:workflowInstanceId/cancel',
  )
  @Permissions('workflow.instances.manage')
  async cancelInstance(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('workflowInstanceId', ParseUUIDPipe) workflowInstanceId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() body: CancelWorkflowInstanceRequestDto,
  ) {
    return {
      workflowInstanceId: await this.platformCommands.cancelInstance({
        actorUserId,
        organizationId,
        workflowInstanceId,
        ...body,
      }),
      status: 'CANCELLED',
    };
  }

  @Post('organizations/:organizationId/workflow-queues')
  @Permissions('workflow.queues.manage')
  async createQueue(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() body: CreateWorkflowQueueRequestDto,
  ) {
    return {
      workflowQueueId: await this.platformCommands.createQueue({
        actorUserId,
        organizationId,
        ...body,
      }),
    };
  }

  @Get('organizations/:organizationId/workflow-queues/:workflowQueueId')
  @Permissions('workflow.queues.view')
  async getQueueById(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('workflowQueueId', ParseUUIDPipe) workflowQueueId: string,
    @CurrentUser('id') actorUserId: string,
  ) {
    return (
      await this.getQueue.execute({
        actorUserId,
        organizationId,
        workflowQueueId,
      })
    ).snapshot;
  }

  @Patch('organizations/:organizationId/workflow-queues/:workflowQueueId')
  @Permissions('workflow.queues.manage')
  async updateQueue(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('workflowQueueId', ParseUUIDPipe) workflowQueueId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() body: UpdateWorkflowQueueRequestDto,
  ) {
    return {
      workflowQueueId: await this.platformCommands.updateQueue({
        actorUserId,
        organizationId,
        workflowQueueId,
        ...body,
      }),
      updated: true,
    };
  }

  @Patch(
    'organizations/:organizationId/workflow-queues/:workflowQueueId/activate',
  )
  @Permissions('workflow.queues.manage')
  async activateQueue(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('workflowQueueId', ParseUUIDPipe) workflowQueueId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() body: VersionRequestDto,
  ) {
    return {
      workflowQueueId: await this.platformCommands.activateQueue({
        actorUserId,
        organizationId,
        workflowQueueId,
        ...body,
      }),
      isActive: true,
    };
  }

  @Patch(
    'organizations/:organizationId/workflow-queues/:workflowQueueId/deactivate',
  )
  @Permissions('workflow.queues.manage')
  async deactivateQueue(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('workflowQueueId', ParseUUIDPipe) workflowQueueId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() body: VersionRequestDto,
  ) {
    return {
      workflowQueueId: await this.platformCommands.deactivateQueue({
        actorUserId,
        organizationId,
        workflowQueueId,
        ...body,
      }),
      isActive: false,
    };
  }

  @Delete('organizations/:organizationId/workflow-queues/:workflowQueueId')
  @Permissions('workflow.queues.manage')
  async retireQueue(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('workflowQueueId', ParseUUIDPipe) workflowQueueId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() body: VersionRequestDto,
  ) {
    return {
      workflowQueueId: await this.platformCommands.retireQueue({
        actorUserId,
        organizationId,
        workflowQueueId,
        ...body,
      }),
      retired: true,
    };
  }

  @Post('organizations/:organizationId/work-items')
  @Permissions('workflow.work-items.manage')
  async createWorkItem(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() body: CreateWorkItemRequestDto,
  ) {
    return this.workItemCommands.create({
      actorUserId,
      organizationId,
      ...body,
    });
  }

  @Get('organizations/:organizationId/work-items/:workflowTaskId')
  @Permissions('workflow.work-items.view')
  async getWorkItemById(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('workflowTaskId', ParseUUIDPipe) workflowTaskId: string,
    @CurrentUser('id') actorUserId: string,
  ) {
    return (
      await this.getWorkItem.execute({
        actorUserId,
        organizationId,
        workflowTaskId,
      })
    ).snapshot;
  }

  @Patch('organizations/:organizationId/work-items/:workflowTaskId/assignment')
  @Permissions('workflow.work-items.manage')
  async assignWorkItem(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('workflowTaskId', ParseUUIDPipe) workflowTaskId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() body: AssignWorkItemRequestDto,
  ) {
    return {
      workflowTaskId: await this.workItemCommands.assign({
        actorUserId,
        organizationId,
        workflowTaskId,
        ...body,
      }),
      updated: true,
    };
  }

  @Patch('organizations/:organizationId/work-items/:workflowTaskId/transition')
  @Permissions('workflow.work-items.manage')
  async transitionWorkItem(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('workflowTaskId', ParseUUIDPipe) workflowTaskId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() body: TransitionWorkItemRequestDto,
  ) {
    return {
      workflowTaskId: await this.workItemCommands.transition({
        actorUserId,
        organizationId,
        workflowTaskId,
        ...body,
      }),
    };
  }

  @Patch('organizations/:organizationId/work-items/:workflowTaskId/sla')
  @Permissions('workflow.work-items.manage')
  async updateWorkItemSla(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('workflowTaskId', ParseUUIDPipe) workflowTaskId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() body: UpdateWorkItemSlaRequestDto,
  ) {
    return {
      workflowSlaId: await this.workItemCommands.updateSla({
        actorUserId,
        organizationId,
        workflowTaskId,
        ...body,
      }),
    };
  }

  @Delete('organizations/:organizationId/work-items/:workflowTaskId')
  @Permissions('workflow.work-items.manage')
  async retireWorkItem(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('workflowTaskId', ParseUUIDPipe) workflowTaskId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() body: VersionRequestDto,
  ) {
    return {
      workflowTaskId: await this.workItemCommands.retire({
        actorUserId,
        organizationId,
        workflowTaskId,
        ...body,
      }),
      retired: true,
    };
  }
}
