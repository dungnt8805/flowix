import { IsEmail, IsEnum } from 'class-validator';
import { WorkspaceMemberRole } from '../../domain/workspace-member-role';

export class AddWorkspaceMemberRequest {
  @IsEmail()
  email!: string;

  @IsEnum(WorkspaceMemberRole)
  role!: WorkspaceMemberRole;
}

export class UpdateWorkspaceMemberRoleRequest {
  @IsEnum(WorkspaceMemberRole)
  role!: WorkspaceMemberRole;
}
