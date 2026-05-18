import { WorkspaceMemberRole } from './workspace-member-role';

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceMemberRole;
  createdAt: Date;
  updatedAt: Date;
}
