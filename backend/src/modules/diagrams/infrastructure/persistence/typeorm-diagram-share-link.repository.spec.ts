import { Repository } from 'typeorm';
import { DiagramShareLink } from '../../domain/diagram-share-link';
import { DiagramShareLinkEntity } from './diagram-share-link.entity';
import { TypeOrmDiagramShareLinkRepository } from './typeorm-diagram-share-link.repository';

describe('TypeOrmDiagramShareLinkRepository', () => {
  const link = DiagramShareLink.create({
    id: '55555555-5555-4555-8555-555555555555',
    diagramId: '44444444-4444-4444-8444-444444444444',
    workspaceId: '22222222-2222-4222-8222-222222222222',
    tokenHash: 'hash',
    createdBy: '11111111-1111-4111-8111-111111111111',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z')
  });

  it('saves and finds share links', async () => {
    const entity = toEntity(link);
    const repository = new TypeOrmDiagramShareLinkRepository({
      save: jest.fn().mockResolvedValue(entity),
      findOneBy: jest.fn().mockResolvedValue(entity),
      find: jest.fn().mockResolvedValue([entity])
    } as unknown as Repository<DiagramShareLinkEntity>);

    await expect(repository.save(link)).resolves.toEqual(link);
    await expect(repository.findById(link.id)).resolves.toEqual(link);
    await expect(repository.findByTokenHash(link.tokenHash)).resolves.toEqual(link);
    await expect(repository.listByDiagramId(link.diagramId)).resolves.toEqual([link]);
  });
});

function toEntity(link: DiagramShareLink): DiagramShareLinkEntity {
  const entity = new DiagramShareLinkEntity();
  entity.id = link.id;
  entity.diagramId = link.diagramId;
  entity.workspaceId = link.workspaceId;
  entity.tokenHash = link.tokenHash;
  entity.createdBy = link.createdBy;
  entity.revokedAt = link.revokedAt;
  entity.createdAt = link.createdAt;
  entity.updatedAt = link.updatedAt;
  return entity;
}
