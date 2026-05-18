import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DiagramShareLinkRepository } from '../../application/ports/diagram-share-link.repository';
import { DiagramShareLink } from '../../domain/diagram-share-link';
import { DiagramShareLinkEntity } from './diagram-share-link.entity';
import { DiagramShareLinkMapper } from './diagram-share-link.mapper';

@Injectable()
export class TypeOrmDiagramShareLinkRepository implements DiagramShareLinkRepository {
  constructor(
    @InjectRepository(DiagramShareLinkEntity)
    private readonly repository: Repository<DiagramShareLinkEntity>
  ) {}

  async save(link: DiagramShareLink): Promise<DiagramShareLink> {
    return DiagramShareLinkMapper.toDomain(await this.repository.save(DiagramShareLinkMapper.toEntity(link)));
  }

  async findById(linkId: string): Promise<DiagramShareLink | null> {
    const link = await this.repository.findOneBy({ id: linkId });
    return link === null ? null : DiagramShareLinkMapper.toDomain(link);
  }

  async findByTokenHash(tokenHash: string): Promise<DiagramShareLink | null> {
    const link = await this.repository.findOneBy({ tokenHash });
    return link === null ? null : DiagramShareLinkMapper.toDomain(link);
  }

  async listByDiagramId(diagramId: string): Promise<DiagramShareLink[]> {
    const links = await this.repository.find({
      where: { diagramId },
      order: { createdAt: 'DESC' }
    });
    return links.map((link) => DiagramShareLinkMapper.toDomain(link));
  }
}
