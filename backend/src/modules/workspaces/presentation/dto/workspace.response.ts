import { WorkspaceWithRole } from '../../application/ports/workspace.repository';
import { Workspace } from '../../domain/workspace';
import { WorkspaceMemberRole } from '../../domain/workspace-member-role';

export interface WorkspaceResponse {
  id: string;
  name: string;
  slug: string;
  currentUserRole: WorkspaceMemberRole;
}

export function toWorkspaceResponse(workspace: Workspace, currentUserRole: WorkspaceMemberRole): WorkspaceResponse {
  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    currentUserRole
  };
}

export function toWorkspaceWithRoleResponse(input: WorkspaceWithRole): WorkspaceResponse {
  return toWorkspaceResponse(input.workspace, input.currentUserRole);
}
