import { Injectable, NotFoundException } from '@nestjs/common';

export interface EmailReviewTask {
  id: string;
  hospitalId: string;
  emailMessageId: string;
  claimId?: string;
  reviewReason: string;
  status: 'PENDING' | 'ASSIGNED' | 'RESOLVED' | 'DISMISSED';
  assignedTo?: string;
  candidateClaims?: any[];
  extractedPayload?: any;
  conflictDetails?: any;
  resolutionNotes?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

@Injectable()
export class EmailHumanReviewService {
  private readonly tasks: Map<string, EmailReviewTask> = new Map();

  async createReviewTask(task: Omit<EmailReviewTask, 'id' | 'createdAt' | 'status'>): Promise<EmailReviewTask> {
    const id = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record: EmailReviewTask = {
      id,
      createdAt: new Date(),
      status: 'PENDING',
      ...task
    };
    this.tasks.set(id, record);
    return record;
  }

  async getPendingTasks(hospitalId: string): Promise<EmailReviewTask[]> {
    return Array.from(this.tasks.values()).filter(
      (t) => t.hospitalId === hospitalId && t.status === 'PENDING'
    );
  }

  async resolveTask(
    taskId: string,
    resolution: {
      targetClaimId?: string;
      confirmedStatus?: string;
      approvedAmount?: number;
      resolutionNotes?: string;
      assignedTo?: string;
    }
  ): Promise<EmailReviewTask> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new NotFoundException(`Review task not found: ${taskId}`);
    }

    const updated: EmailReviewTask = {
      ...task,
      claimId: resolution.targetClaimId || task.claimId,
      status: 'RESOLVED',
      resolutionNotes: resolution.resolutionNotes || 'Manually confirmed by claims officer',
      assignedTo: resolution.assignedTo || task.assignedTo,
      resolvedAt: new Date()
    };

    this.tasks.set(taskId, updated);
    return updated;
  }
}