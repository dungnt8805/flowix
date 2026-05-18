import { DiagramVersion } from '../../domain/diagram-version';
import { DiagramThemeConfig } from '../../domain/diagram-theme';
import { DiagramType } from '../../domain/diagram-type';

export interface DiagramVersionResponse {
  id: string;
  diagramId: string;
  workspaceId: string;
  projectId: string;
  title: string;
  description: string | null;
  sourceCode: string;
  diagramType: DiagramType;
  themeConfig: DiagramThemeConfig;
  createdBy: string;
  createdAt: string;
}

export function toDiagramVersionResponse(version: DiagramVersion): DiagramVersionResponse {
  return {
    id: version.id,
    diagramId: version.diagramId,
    workspaceId: version.workspaceId,
    projectId: version.projectId,
    title: version.title,
    description: version.description,
    sourceCode: version.sourceCode,
    diagramType: version.diagramType,
    themeConfig: version.themeConfig,
    createdBy: version.createdBy,
    createdAt: version.createdAt.toISOString()
  };
}
