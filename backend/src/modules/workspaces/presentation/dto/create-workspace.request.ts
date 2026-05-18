import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateWorkspaceRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;
}
