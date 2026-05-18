import { Repository } from 'typeorm';
import { Diagram } from '../../domain/diagram';
import { DiagramType } from '../../domain/diagram-type';
import { DiagramEntity } from './diagram.entity';
import { TypeOrmDiagramRepository } from './typeorm-diagram.repository';

describe('TypeOrmDiagramRepository', () => {
  it('should persist and return the saved diagram', async () => {
    const diagram = Diagram.create({
      id: 'diagram-1',
      workspaceId: '22222222-2222-4222-8222-222222222222',
      projectId: '33333333-3333-4333-8333-333333333333',
      title: 'System flow',
      sourceCode: 'flowchart LR\nA-->B',
      diagramType: DiagramType.FLOWCHART,
      createdBy: '11111111-1111-4111-8111-111111111111'
    });
    const save = jest.fn((entity: DiagramEntity) => Promise.resolve(entity));
    const repository = new TypeOrmDiagramRepository({ save } as unknown as Repository<DiagramEntity>);

    const saved = await repository.save(diagram);

    expect(save).toHaveBeenCalledWith(expect.objectContaining({ id: 'diagram-1' }));
    expect(saved).toEqual(diagram);
  });

  it('should find a diagram by id', async () => {
    const entity = new DiagramEntity();
    entity.id = 'diagram-1';
    entity.workspaceId = '22222222-2222-4222-8222-222222222222';
    entity.projectId = '33333333-3333-4333-8333-333333333333';
    entity.title = 'System flow';
    entity.description = null;
    entity.sourceCode = 'flowchart LR\nA-->B';
    entity.diagramType = DiagramType.FLOWCHART;
    entity.createdBy = '11111111-1111-4111-8111-111111111111';
    entity.createdAt = new Date('2026-01-01T00:00:00.000Z');
    entity.updatedAt = new Date('2026-01-01T00:00:00.000Z');
    const findOneBy = jest.fn().mockResolvedValue(entity);
    const repository = new TypeOrmDiagramRepository({
      findOneBy
    } as unknown as Repository<DiagramEntity>);

    const diagram = await repository.findById('diagram-1');

    expect(findOneBy).toHaveBeenCalledWith({ id: 'diagram-1' });
    expect(diagram?.id).toBe('diagram-1');
  });
});
