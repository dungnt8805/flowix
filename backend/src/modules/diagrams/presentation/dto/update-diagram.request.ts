import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { DiagramThemeConfig } from '../../domain/diagram-theme';
import { DiagramType } from '../../domain/diagram-type';

class DiagramThemeConfigRequest implements DiagramThemeConfig {
  @IsIn(['default', 'forest', 'dark', 'neutral'])
  theme!: DiagramThemeConfig['theme'];
}

export class UpdateDiagramRequest {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsString()
  @IsOptional()
  sourceCode?: string;

  @IsEnum(DiagramType)
  @IsOptional()
  diagramType?: DiagramType;

  @IsObject()
  @ValidateNested()
  @Type(() => DiagramThemeConfigRequest)
  @IsOptional()
  themeConfig?: DiagramThemeConfigRequest;
}
