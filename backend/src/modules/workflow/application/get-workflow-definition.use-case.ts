import { Injectable, NotFoundException } from '@nestjs/common';

import { WorkflowDefinition } from '../domain/workflow-definition.aggregate';
import { WorkflowDefinitionRepository } from '../infrastructure/workflow-definition.repository';

@Injectable()
export class GetWorkflowDefinitionUseCase {
  constructor(private readonly repository: WorkflowDefinitionRepository) {}

  async execute(workflowDefinitionId: string): Promise<WorkflowDefinition> {
    const definition =
      await this.repository.findActiveById(workflowDefinitionId);
    if (!definition)
      throw new NotFoundException('Workflow Definition not found.');
    return definition;
  }
}
