import { randomUUID } from 'node:crypto';
import { DiagramThemeConfig, normalizeDiagramThemeConfig } from './diagram-theme';
import { DiagramType } from './diagram-type';

interface CreateDiagramProps {
  id?: string;
  workspaceId: string;
  projectId: string;
  title: string;
  description?: string;
  sourceCode: string;
  diagramType?: DiagramType;
  themeConfig?: DiagramThemeConfig | null;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface UpdateDiagramProps {
  title?: string;
  description?: string | null;
  sourceCode?: string;
  diagramType?: DiagramType;
  themeConfig?: DiagramThemeConfig | null;
}

export class Diagram {
  private constructor(
    readonly id: string,
    readonly workspaceId: string,
    readonly projectId: string,
    readonly title: string,
    readonly description: string | null,
    readonly sourceCode: string,
    readonly diagramType: DiagramType,
    readonly themeConfig: DiagramThemeConfig,
    readonly createdBy: string,
    readonly createdAt: Date,
    readonly updatedAt: Date
  ) {}

  static create(props: CreateDiagramProps): Diagram {
    const title = props.title.trim();
    const sourceCode = props.sourceCode.trim();

    if (title.length === 0) {
      throw new Error('Diagram title is required.');
    }

    if (sourceCode.length === 0) {
      throw new Error('Diagram source code is required.');
    }

    const now = new Date();

    return new Diagram(
      props.id ?? randomUUID(),
      props.workspaceId,
      props.projectId,
      title,
      props.description?.trim() || null,
      sourceCode,
      props.diagramType ?? DiagramType.UNKNOWN,
      normalizeDiagramThemeConfig(props.themeConfig),
      props.createdBy,
      props.createdAt ?? now,
      props.updatedAt ?? now
    );
  }

  update(props: UpdateDiagramProps): Diagram {
    return Diagram.create({
      id: this.id,
      workspaceId: this.workspaceId,
      projectId: this.projectId,
      title: props.title ?? this.title,
      description: props.description === undefined ? this.description ?? undefined : props.description ?? undefined,
      sourceCode: props.sourceCode ?? this.sourceCode,
      diagramType: props.diagramType ?? this.diagramType,
      themeConfig: props.themeConfig === undefined ? this.themeConfig : props.themeConfig,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: new Date()
    });
  }
}
