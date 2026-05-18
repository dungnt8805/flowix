import { Workspace } from '../../domain/workspace';
import { WorkspaceMemberRole } from '../../domain/workspace-member-role';

export const WORKSPACE_REPOSITORY = Symbol('WORKSPACE_REPOSITORY');

export interface WorkspaceWithRole {
  workspace: Workspace;
  currentUserRole: WorkspaceMemberRole;
}

export interface WorkspaceRepository {
  save(workspace: Workspace): Promise<Workspace>;
  listByUserId(userId: string): Promise<Workspace[]>;
  listByUserIdWithRole(userId: string): Promise<WorkspaceWithRole[]>;
}
