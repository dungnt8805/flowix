import { AuditService } from './audit.service';
import { AuditEventEntity } from './infrastructure/persistence/audit-event.entity';

describe('AuditService', () => {
  it('records and lists workspace audit events', async () => {
    const savedEvent = {
      id: 'audit-1',
      workspaceId: '22222222-2222-4222-8222-222222222222',
      actorId: '11111111-1111-4111-8111-111111111111',
      action: 'diagram.create',
      targetType: 'diagram',
      targetId: 'diagram-1',
      metadata: { format: 'mmd' },
      createdAt: new Date('2026-01-01T00:00:00.000Z')
    } as AuditEventEntity;
    const repository = {
      create: jest.fn((event: Partial<AuditEventEntity>) => event),
      save: jest.fn().mockResolvedValue(savedEvent),
      find: jest.fn().mockResolvedValue([savedEvent])
    };
    const service = new AuditService(repository as never);

    await service.record({
      workspaceId: savedEvent.workspaceId,
      actor: {
        id: savedEvent.actorId!,
        email: 'user@example.com',
        displayName: 'User'
      },
      action: savedEvent.action,
      targetType: savedEvent.targetType,
      targetId: savedEvent.targetId,
      metadata: savedEvent.metadata
    });
    const events = await service.listForWorkspace(savedEvent.workspaceId);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: savedEvent.workspaceId,
        actorId: savedEvent.actorId,
        action: 'diagram.create'
      })
    );
    expect(events).toEqual([
      {
        id: 'audit-1',
        workspaceId: savedEvent.workspaceId,
        actorId: savedEvent.actorId,
        action: 'diagram.create',
        targetType: 'diagram',
        targetId: 'diagram-1',
        metadata: { format: 'mmd' },
        createdAt: '2026-01-01T00:00:00.000Z'
      }
    ]);
  });

  it('purges events older than a retention cutoff', async () => {
    const execute = jest.fn().mockResolvedValue({ affected: 4 });
    const andWhere = jest.fn().mockReturnValue({ execute });
    const where = jest.fn().mockReturnValue({ andWhere });
    const deleteQuery = jest.fn().mockReturnValue({ where });
    const repository = {
      createQueryBuilder: jest.fn().mockReturnValue({ delete: deleteQuery })
    };
    const service = new AuditService(repository as never);

    await expect(
      service.purgeBefore(
        '22222222-2222-4222-8222-222222222222',
        new Date('2026-01-01T00:00:00.000Z')
      )
    ).resolves.toBe(4);
    expect(where).toHaveBeenCalledWith('workspace_id = :workspaceId', {
      workspaceId: '22222222-2222-4222-8222-222222222222'
    });
  });
});
