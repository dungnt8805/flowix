import { Repository } from 'typeorm';
import { DiagramVersion } from '../../domain/diagram-version';
import { DiagramType } from '../../domain/diagram-type';
import { DiagramVersionEntity } from './diagram-version.entity';
import { TypeOrmDiagramVersionRepository } from './typeorm-diagram-version.repository';

describe('TypeOrmDiagramVersionRepository', () => {
  const version = DiagramVersion.create({
    id: '55555555-5555-4555-8555-555555555555',
    diagramId: '44444444-4444-4444-8444-444444444444',
    workspaceId: '22222222-2222-4222-8222-222222222222',
    projectId: '33333333-3333-4333-8333-333333333333',
    title: 'Saved context',
    sourceCode: 'flowchart LR\nA-->B',
    diagramType: DiagramType.FLOWCHART,
    createdBy: '11111111-1111-4111-8111-111111111111',
    createdAt: new Date('2026-01-03T00:00:00.000Z')
  });

  it('should persist and return the saved version', async () => {
    const save = jest.fn((entity: DiagramVersionEntity) => Promise.resolve(entity));
    const repository = new TypeOrmDiagramVersionRepository({
      save
    } as unknown as Repository<DiagramVersionEntity>);

    const saved = await repository.save(version);

    expect(save).toHaveBeenCalledWith(expect.objectContaining({ id: version.id }));
    expect(saved).toEqual(version);
  });

  it('should find the latest version by diagram id', async () => {
    const findOne = jest.fn().mockResolvedValue(toEntity(version));
    const repository = new TypeOrmDiagramVersionRepository({
      findOne
    } as unknown as Repository<DiagramVersionEntity>);

    const found = await repository.findLatestByDiagramId(version.diagramId);

    expect(findOne).toHaveBeenCalledWith({
      where: { diagramId: version.diagramId },
      order: { createdAt: 'DESC' }
    });
    expect(found).toEqual(version);
  });

  it('should find a version by id', async () => {
    const findOneBy = jest.fn().mockResolvedValue(toEntity(version));
    const repository = new TypeOrmDiagramVersionRepository({
      findOneBy
    } as unknown as Repository<DiagramVersionEntity>);

    const found = await repository.findById(version.id);

    expect(findOneBy).toHaveBeenCalledWith({ id: version.id });
    expect(found).toEqual(version);
  });

  it('should list versions by diagram id newest first', async () => {
    const find = jest.fn().mockResolvedValue([toEntity(version)]);
    const repository = new TypeOrmDiagramVersionRepository({
      find
    } as unknown as Repository<DiagramVersionEntity>);

    const versions = await repository.listByDiagramId(version.diagramId);

    expect(find).toHaveBeenCalledWith({
      where: { diagramId: version.diagramId },
      order: { createdAt: 'DESC' }
    });
    expect(versions).toEqual([version]);
  });
});

function toEntity(version: DiagramVersion): DiagramVersionEntity {
  const entity = new DiagramVersionEntity();
  entity.id = version.id;
  entity.diagramId = version.diagramId;
  entity.workspaceId = version.workspaceId;
  entity.projectId = version.projectId;
  entity.title = version.title;
  entity.description = version.description;
  entity.sourceCode = version.sourceCode;
  entity.diagramType = version.diagramType;
  entity.themeConfig = version.themeConfig;
  entity.createdBy = version.createdBy;
  entity.createdAt = version.createdAt;
  return entity;
}
