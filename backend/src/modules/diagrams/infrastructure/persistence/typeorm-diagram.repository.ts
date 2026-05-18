import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DiagramRepository } from '../../application/ports/diagram.repository';
import { Diagram } from '../../domain/diagram';
import { DiagramEntity } from './diagram.entity';
import { DiagramMapper } from './diagram.mapper';

@Injectable()
export class TypeOrmDiagramRepository implements DiagramRepository {
  constructor(
    @InjectRepository(DiagramEntity)
    private readonly repository: Repository<DiagramEntity>
  ) {}

  async save(diagram: Diagram): Promise<Diagram> {
    const saved = await this.repository.save(DiagramMapper.toEntity(diagram));
    return DiagramMapper.toDomain(saved);
  }

  async findById(diagramId: string): Promise<Diagram | null> {
    const diagram = await this.repository.findOneBy({ id: diagramId });
    return diagram === null ? null : DiagramMapper.toDomain(diagram);
  }

  async listByProjectId(projectId: string): Promise<Diagram[]> {
    const diagrams = await this.repository.find({
      where: { projectId },
      order: { updatedAt: 'DESC' }
    });

    return diagrams.map((diagram) => DiagramMapper.toDomain(diagram));
  }
}
