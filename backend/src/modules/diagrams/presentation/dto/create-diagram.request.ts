import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { DiagramThemeConfig } from '../../domain/diagram-theme';
import { DiagramType } from '../../domain/diagram-type';

class DiagramThemeConfigRequest implements DiagramThemeConfig {
  @IsIn(['default', 'forest', 'dark', 'neutral'])
  theme!: DiagramThemeConfig['theme'];
}

export class CreateDiagramRequest {
  @IsUUID()
  workspaceId!: string;

  @IsUUID()
  projectId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  sourceCode!: string;

  @IsEnum(DiagramType)
  @IsOptional()
  diagramType?: DiagramType;

  @IsObject()
  @ValidateNested()
  @Type(() => DiagramThemeConfigRequest)
  @IsOptional()
  themeConfig?: DiagramThemeConfigRequest;
}
