import { Repository } from 'typeorm';
import { DiagramComment } from '../../domain/diagram-comment';
import { DiagramCommentEntity } from './diagram-comment.entity';
import { TypeOrmDiagramCommentRepository } from './typeorm-diagram-comment.repository';

describe('TypeOrmDiagramCommentRepository', () => {
  const comment = DiagramComment.create({
    id: '55555555-5555-4555-8555-555555555555',
    diagramId: '44444444-4444-4444-8444-444444444444',
    workspaceId: '22222222-2222-4222-8222-222222222222',
    authorId: '11111111-1111-4111-8111-111111111111',
    body: 'Please clarify this edge.',
    anchor: { line: 2 },
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z')
  });

  it('saves, finds, and lists comments oldest first', async () => {
    const entity = toEntity(comment);
    const save = jest.fn().mockResolvedValue(entity);
    const findOneBy = jest.fn().mockResolvedValue(entity);
    const find = jest.fn().mockResolvedValue([entity]);
    const repository = new TypeOrmDiagramCommentRepository({
      save,
      findOneBy,
      find
    } as unknown as Repository<DiagramCommentEntity>);

    await expect(repository.save(comment)).resolves.toEqual(comment);
    await expect(repository.findById(comment.id)).resolves.toEqual(comment);
    await expect(repository.listByDiagramId(comment.diagramId)).resolves.toEqual([comment]);
    expect(findOneBy).toHaveBeenCalledWith({ id: comment.id });
    expect(find).toHaveBeenCalledWith({
      where: { diagramId: comment.diagramId },
      order: { createdAt: 'ASC' }
    });
  });
});

function toEntity(comment: DiagramComment): DiagramCommentEntity {
  const entity = new DiagramCommentEntity();
  entity.id = comment.id;
  entity.diagramId = comment.diagramId;
  entity.workspaceId = comment.workspaceId;
  entity.authorId = comment.authorId;
  entity.body = comment.body;
  entity.anchor = comment.anchor;
  entity.status = comment.status;
  entity.createdAt = comment.createdAt;
  entity.updatedAt = comment.updatedAt;
  return entity;
}
