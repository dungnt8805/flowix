import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../../../../common/auth/authenticated-user';
import { CurrentUserSyncService } from '../../../auth/application/current-user-sync.service';
import {
  PROJECT_REPOSITORY,
  ProjectRepository
} from '../../../workspaces/application/ports/project.repository';
import {
  WORKSPACE_MEMBER_REPOSITORY,
  WorkspaceMemberRepository
} from '../../../workspaces/application/ports/workspace-member.repository';
import { canViewDiagram } from '../../../workspaces/domain/workspace-permissions';
import { DiagramVersion } from '../../domain/diagram-version';
import {
  DIAGRAM_VERSION_REPOSITORY,
  DiagramVersionRepository
} from '../ports/diagram-version.repository';
import { DIAGRAM_REPOSITORY, DiagramRepository } from '../ports/diagram.repository';

export interface ListDiagramVersionsQuery {
  user: AuthenticatedUser;
  diagramId: string;
}

@Injectable()
export class ListDiagramVersionsUseCase {
  constructor(
    private readonly currentUserSyncService: CurrentUserSyncService,
    @Inject(DIAGRAM_REPOSITORY)
    private readonly diagramRepository: DiagramRepository,
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: ProjectRepository,
    @Inject(WORKSPACE_MEMBER_REPOSITORY)
    private readonly workspaceMemberRepository: WorkspaceMemberRepository,
    @Inject(DIAGRAM_VERSION_REPOSITORY)
    private readonly diagramVersionRepository: DiagramVersionRepository
  ) {}

  async execute(query: ListDiagramVersionsQuery): Promise<DiagramVersion[]> {
    await this.currentUserSyncService.ensureUser(query.user);

    const diagram = await this.diagramRepository.findById(query.diagramId);
    if (diagram === null) {
      throw new NotFoundException('Diagram was not found.');
    }

    const project = await this.projectRepository.findById(diagram.projectId);
    if (project === null || project.workspaceId !== diagram.workspaceId) {
      throw new BadRequestException('Diagram project ownership is inconsistent.');
    }

    const membership = await this.workspaceMemberRepository.findByWorkspaceIdAndUserId(
      diagram.workspaceId,
      query.user.id
    );

    if (membership === null || !canViewDiagram(membership.role)) {
      throw new ForbiddenException('You do not have permission to view this diagram.');
    }

    return this.diagramVersionRepository.listByDiagramId(diagram.id);
  }
}
