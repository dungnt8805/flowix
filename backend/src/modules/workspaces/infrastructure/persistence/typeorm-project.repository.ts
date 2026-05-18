import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectRepository } from '../../application/ports/project.repository';
import { Project } from '../../domain/project';
import { ProjectEntity } from './project.entity';
import { ProjectMapper } from './project.mapper';

@Injectable()
export class TypeOrmProjectRepository implements ProjectRepository {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly repository: Repository<ProjectEntity>
  ) {}

  async save(project: Project): Promise<Project> {
    const saved = await this.repository.save(ProjectMapper.toEntity(project));
    return ProjectMapper.toDomain(saved);
  }

  async findById(projectId: string): Promise<Project | null> {
    const project = await this.repository.findOneBy({ id: projectId });
    return project === null ? null : ProjectMapper.toDomain(project);
  }

  async listByWorkspaceId(workspaceId: string): Promise<Project[]> {
    const projects = await this.repository.find({
      where: { workspaceId },
      order: { createdAt: 'DESC' }
    });

    return projects.map((project) => ProjectMapper.toDomain(project));
  }
}
