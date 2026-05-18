import { randomUUID } from 'node:crypto';
import { ProjectStatus } from './project-status';

interface CreateProjectProps {
  id?: string;
  workspaceId: string;
  name: string;
  description?: string;
  status?: ProjectStatus;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Project {
  private constructor(
    readonly id: string,
    readonly workspaceId: string,
    readonly name: string,
    readonly description: string | null,
    readonly status: ProjectStatus,
    readonly createdBy: string,
    readonly createdAt: Date,
    readonly updatedAt: Date
  ) {}

  static create(props: CreateProjectProps): Project {
    const name = props.name.trim();

    if (name.length === 0) {
      throw new Error('Project name is required.');
    }

    const now = new Date();

    return new Project(
      props.id ?? randomUUID(),
      props.workspaceId,
      name,
      props.description?.trim() || null,
      props.status ?? ProjectStatus.ACTIVE,
      props.createdBy,
      props.createdAt ?? now,
      props.updatedAt ?? now
    );
  }
}
