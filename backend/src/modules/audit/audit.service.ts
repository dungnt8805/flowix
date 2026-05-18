import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { AuditEventEntity } from './infrastructure/persistence/audit-event.entity';

export interface AuditEventSummary {
  id: string;
  workspaceId: string;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditEventEntity)
    private readonly repository: Repository<AuditEventEntity>
  ) {}

  async record(input: {
    workspaceId: string;
    actor?: AuthenticatedUser;
    action: string;
    targetType: string;
    targetId?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.repository.save(
      this.repository.create({
        workspaceId: input.workspaceId,
        actorId: input.actor?.id ?? null,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        metadata: input.metadata ?? {}
      })
    );
  }

  async listForWorkspace(workspaceId: string): Promise<AuditEventSummary[]> {
    const events = await this.repository.find({
      where: { workspaceId },
      order: { createdAt: 'DESC' },
      take: 100
    });

    return events.map((event) => ({
      id: event.id,
      workspaceId: event.workspaceId,
      actorId: event.actorId,
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId,
      metadata: event.metadata,
      createdAt: event.createdAt.toISOString()
    }));
  }

  async purgeBefore(workspaceId: string, cutoff: Date): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .where('workspace_id = :workspaceId', { workspaceId })
      .andWhere('created_at < :cutoff', { cutoff })
      .execute();

    return result.affected ?? 0;
  }
}
