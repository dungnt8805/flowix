import { GoneException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Diagram } from '../../domain/diagram';
import {
  DIAGRAM_SHARE_LINK_REPOSITORY,
  DiagramShareLinkRepository
} from '../ports/diagram-share-link.repository';
import { DIAGRAM_REPOSITORY, DiagramRepository } from '../ports/diagram.repository';
import { hashShareToken } from '../share-token';

@Injectable()
export class GetSharedDiagramUseCase {
  constructor(
    @Inject(DIAGRAM_REPOSITORY) private readonly diagramRepository: DiagramRepository,
    @Inject(DIAGRAM_SHARE_LINK_REPOSITORY)
    private readonly shareLinkRepository: DiagramShareLinkRepository
  ) {}

  async execute(token: string): Promise<Diagram> {
    const link = await this.shareLinkRepository.findByTokenHash(hashShareToken(token));
    if (link === null) {
      throw new NotFoundException('Share link was not found.');
    }

    if (link.revokedAt !== null) {
      throw new GoneException('Share link has been revoked.');
    }

    const diagram = await this.diagramRepository.findById(link.diagramId);
    if (diagram === null) {
      throw new NotFoundException('Shared diagram was not found.');
    }

    return diagram;
  }
}
