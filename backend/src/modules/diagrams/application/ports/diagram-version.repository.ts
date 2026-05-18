import { DiagramVersion } from '../../domain/diagram-version';

export const DIAGRAM_VERSION_REPOSITORY = Symbol('DIAGRAM_VERSION_REPOSITORY');

export interface DiagramVersionRepository {
  save(version: DiagramVersion): Promise<DiagramVersion>;
  findById(versionId: string): Promise<DiagramVersion | null>;
  findLatestByDiagramId(diagramId: string): Promise<DiagramVersion | null>;
  listByDiagramId(diagramId: string): Promise<DiagramVersion[]>;
  deleteOlderThan?(workspaceId: string, cutoff: Date): Promise<number>;
}
