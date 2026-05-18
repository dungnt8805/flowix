import { IsEmail, IsString } from 'class-validator';

export class AddWorkspaceMemberRequest {
  @IsEmail()
  email!: string;

  @IsString()
  role!: string;
}

export class UpdateWorkspaceMemberRoleRequest {
  @IsString()
  role!: string;
}
