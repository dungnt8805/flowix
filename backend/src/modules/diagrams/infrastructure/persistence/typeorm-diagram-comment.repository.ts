import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DiagramCommentRepository } from '../../application/ports/diagram-comment.repository';
import { DiagramComment } from '../../domain/diagram-comment';
import { DiagramCommentEntity } from './diagram-comment.entity';
import { DiagramCommentMapper } from './diagram-comment.mapper';

@Injectable()
export class TypeOrmDiagramCommentRepository implements DiagramCommentRepository {
  constructor(
    @InjectRepository(DiagramCommentEntity)
    private readonly repository: Repository<DiagramCommentEntity>
  ) {}

  async save(comment: DiagramComment): Promise<DiagramComment> {
    const saved = await this.repository.save(DiagramCommentMapper.toEntity(comment));
    return DiagramCommentMapper.toDomain(saved);
  }

  async findById(commentId: string): Promise<DiagramComment | null> {
    const comment = await this.repository.findOneBy({ id: commentId });
    return comment === null ? null : DiagramCommentMapper.toDomain(comment);
  }

  async listByDiagramId(diagramId: string): Promise<DiagramComment[]> {
    const comments = await this.repository.find({
      where: { diagramId },
      order: { createdAt: 'ASC' }
    });

    return comments.map((comment) => DiagramCommentMapper.toDomain(comment));
  }
}
