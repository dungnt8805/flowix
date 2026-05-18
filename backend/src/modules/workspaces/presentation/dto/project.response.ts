import { Project } from '../../domain/project';
import { ProjectStatus } from '../../domain/project-status';

export interface ProjectResponse {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
}

export function toProjectResponse(project: Project): ProjectResponse {
  return {
    id: project.id,
    workspaceId: project.workspaceId,
    name: project.name,
    description: project.description,
    status: project.status
  };
}
