import { DiagramShareLink } from '../../domain/diagram-share-link';

export const DIAGRAM_SHARE_LINK_REPOSITORY = Symbol('DIAGRAM_SHARE_LINK_REPOSITORY');

export interface DiagramShareLinkRepository {
  save(link: DiagramShareLink): Promise<DiagramShareLink>;
  findById(linkId: string): Promise<DiagramShareLink | null>;
  findByTokenHash(tokenHash: string): Promise<DiagramShareLink | null>;
  listByDiagramId(diagramId: string): Promise<DiagramShareLink[]>;
}
