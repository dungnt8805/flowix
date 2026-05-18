import { Role } from './role';

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  roleId: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}
