import { Diagram } from '../../domain/diagram';
import { DiagramType } from '../../domain/diagram-type';
import { DiagramEntity } from './diagram.entity';
import { DiagramMapper } from './diagram.mapper';

describe('DiagramMapper', () => {
  it('should map between domain and TypeORM entity', () => {
    const diagram = Diagram.create({
      id: 'diagram-1',
      workspaceId: '22222222-2222-4222-8222-222222222222',
      projectId: '33333333-3333-4333-8333-333333333333',
      title: 'Release flow',
      sourceCode: 'sequenceDiagram\nA->>B: deploy',
      diagramType: DiagramType.SEQUENCE,
      createdBy: '11111111-1111-4111-8111-111111111111',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z')
    });

    const entity = DiagramMapper.toEntity(diagram);
    const mapped = DiagramMapper.toDomain(entity);

    expect(entity).toBeInstanceOf(DiagramEntity);
    expect(mapped).toEqual(diagram);
  });

  it('should normalize nullable persistence fields while mapping to domain', () => {
    const entity = new DiagramEntity();
    entity.id = 'diagram-2';
    entity.workspaceId = '22222222-2222-4222-8222-222222222222';
    entity.projectId = '33333333-3333-4333-8333-333333333333';
    entity.title = 'Untitled';
    entity.description = null;
    entity.sourceCode = 'flowchart LR\nA-->B';
    entity.diagramType = DiagramType.FLOWCHART;
    entity.themeConfig = { theme: 'forest' };
    entity.createdBy = null;
    entity.createdAt = new Date('2026-01-01T00:00:00.000Z');
    entity.updatedAt = new Date('2026-01-01T00:00:00.000Z');

    const mapped = DiagramMapper.toDomain(entity);

    expect(mapped.description).toBeNull();
    expect(mapped.themeConfig).toEqual({ theme: 'forest' });
    expect(mapped.createdBy).toBe('system');
  });
});
