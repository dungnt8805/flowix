import { randomUUID } from 'node:crypto';
import { DiagramThemeConfig, normalizeDiagramThemeConfig } from './diagram-theme';
import { DiagramType } from './diagram-type';

interface CreateDiagramVersionProps {
  id?: string;
  diagramId: string;
  workspaceId: string;
  projectId: string;
  title: string;
  description?: string | null;
  sourceCode: string;
  diagramType: DiagramType;
  themeConfig?: DiagramThemeConfig | null;
  createdBy: string;
  createdAt?: Date;
}

export class DiagramVersion {
  private constructor(
    readonly id: string,
    readonly diagramId: string,
    readonly workspaceId: string,
    readonly projectId: string,
    readonly title: string,
    readonly description: string | null,
    readonly sourceCode: string,
    readonly diagramType: DiagramType,
    readonly themeConfig: DiagramThemeConfig,
    readonly createdBy: string,
    readonly createdAt: Date
  ) {}

  static create(props: CreateDiagramVersionProps): DiagramVersion {
    const title = props.title.trim();
    const sourceCode = props.sourceCode.trim();

    if (title.length === 0) {
      throw new Error('Diagram version title is required.');
    }

    if (sourceCode.length === 0) {
      throw new Error('Diagram version source code is required.');
    }

    return new DiagramVersion(
      props.id ?? randomUUID(),
      props.diagramId,
      props.workspaceId,
      props.projectId,
      title,
      props.description?.trim() || null,
      sourceCode,
      props.diagramType,
      normalizeDiagramThemeConfig(props.themeConfig),
      props.createdBy,
      props.createdAt ?? new Date()
    );
  }

  matchesSnapshot(props: {
    title: string;
    description: string | null;
    sourceCode: string;
    diagramType: DiagramType;
    themeConfig?: DiagramThemeConfig | null;
  }): boolean {
    return (
      this.title === props.title &&
      this.description === props.description &&
      this.sourceCode === props.sourceCode &&
      this.diagramType === props.diagramType &&
      this.themeConfig.theme === normalizeDiagramThemeConfig(props.themeConfig).theme
    );
  }
}
