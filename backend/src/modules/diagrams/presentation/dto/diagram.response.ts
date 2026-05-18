import { Diagram } from '../../domain/diagram';
import { DiagramThemeConfig } from '../../domain/diagram-theme';
import { DiagramType } from '../../domain/diagram-type';

export interface DiagramResponse {
  id: string;
  workspaceId: string;
  projectId: string;
  title: string;
  description: string | null;
  sourceCode: string;
  diagramType: DiagramType;
  themeConfig: DiagramThemeConfig;
}

export function toDiagramResponse(diagram: Diagram): DiagramResponse {
  return {
    id: diagram.id,
    workspaceId: diagram.workspaceId,
    projectId: diagram.projectId,
    title: diagram.title,
    description: diagram.description,
    sourceCode: diagram.sourceCode,
    diagramType: diagram.diagramType,
    themeConfig: diagram.themeConfig
  };
}
