import { WorkspaceMember } from '../../domain/workspace-member';
import { WorkspaceMemberRole } from '../../domain/workspace-member-role';

export const WORKSPACE_MEMBER_REPOSITORY = Symbol('WORKSPACE_MEMBER_REPOSITORY');

export interface CreateWorkspaceMemberRecord {
  workspaceId: string;
  userId: string;
  role: WorkspaceMemberRole;
}

export interface WorkspaceMemberRepository {
  addMember(input: CreateWorkspaceMemberRecord): Promise<WorkspaceMember>;
  listByWorkspaceId?(workspaceId: string): Promise<WorkspaceMember[]>;
  findByWorkspaceIdAndUserId(workspaceId: string, userId: string): Promise<WorkspaceMember | null>;
  updateRole?(workspaceId: string, userId: string, role: WorkspaceMemberRole): Promise<WorkspaceMember>;
  removeByWorkspaceIdAndUserId?(workspaceId: string, userId: string): Promise<void>;
  countByWorkspaceIdAndRole?(workspaceId: string, role: WorkspaceMemberRole): Promise<number>;
}
