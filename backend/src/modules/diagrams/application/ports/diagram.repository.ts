import { Diagram } from '../../domain/diagram';

export const DIAGRAM_REPOSITORY = Symbol('DIAGRAM_REPOSITORY');

export interface DiagramRepository {
  save(diagram: Diagram): Promise<Diagram>;
  findById(diagramId: string): Promise<Diagram | null>;
  listByProjectId(projectId: string): Promise<Diagram[]>;
}
