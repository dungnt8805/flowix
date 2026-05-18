import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DiagramVersionRepository } from '../../application/ports/diagram-version.repository';
import { DiagramVersion } from '../../domain/diagram-version';
import { DiagramVersionEntity } from './diagram-version.entity';
import { DiagramVersionMapper } from './diagram-version.mapper';

@Injectable()
export class TypeOrmDiagramVersionRepository implements DiagramVersionRepository {
  constructor(
    @InjectRepository(DiagramVersionEntity)
    private readonly repository: Repository<DiagramVersionEntity>
  ) {}

  async save(version: DiagramVersion): Promise<DiagramVersion> {
    const saved = await this.repository.save(DiagramVersionMapper.toEntity(version));
    return DiagramVersionMapper.toDomain(saved);
  }

  async findById(versionId: string): Promise<DiagramVersion | null> {
    const version = await this.repository.findOneBy({ id: versionId });
    return version === null ? null : DiagramVersionMapper.toDomain(version);
  }

  async findLatestByDiagramId(diagramId: string): Promise<DiagramVersion | null> {
    const version = await this.repository.findOne({
      where: { diagramId },
      order: { createdAt: 'DESC' }
    });

    return version === null ? null : DiagramVersionMapper.toDomain(version);
  }

  async listByDiagramId(diagramId: string): Promise<DiagramVersion[]> {
    const versions = await this.repository.find({
      where: { diagramId },
      order: { createdAt: 'DESC' }
    });

    return versions.map((version) => DiagramVersionMapper.toDomain(version));
  }

  async deleteOlderThan(workspaceId: string, cutoff: Date): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .where('workspace_id = :workspaceId', { workspaceId })
      .andWhere('created_at < :cutoff', { cutoff })
      .execute();

    return result.affected ?? 0;
  }
}
