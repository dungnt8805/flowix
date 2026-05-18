import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordRequest {
  @IsString()
  @MinLength(1)
  token!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;
}
