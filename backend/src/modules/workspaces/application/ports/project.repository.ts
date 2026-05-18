import { Project } from '../../domain/project';

export const PROJECT_REPOSITORY = Symbol('PROJECT_REPOSITORY');

export interface ProjectRepository {
  save(project: Project): Promise<Project>;
  findById(projectId: string): Promise<Project | null>;
  listByWorkspaceId(workspaceId: string): Promise<Project[]>;
}
