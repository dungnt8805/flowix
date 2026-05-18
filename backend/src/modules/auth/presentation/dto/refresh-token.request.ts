import { IsString, MinLength } from 'class-validator';

export class RefreshTokenRequest {
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}
