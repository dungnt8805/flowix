import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../../../../common/auth/authenticated-user';
import { CurrentUserSyncService } from '../../../auth/application/current-user-sync.service';
import { PROJECT_REPOSITORY, ProjectRepository } from '../../../workspaces/application/ports/project.repository';
import {
  WORKSPACE_MEMBER_REPOSITORY,
  WorkspaceMemberRepository
} from '../../../workspaces/application/ports/workspace-member.repository';
import { canViewDiagram } from '../../../workspaces/domain/workspace-permissions';
import {
  DIAGRAM_COMMENT_REPOSITORY,
  DiagramCommentRepository
} from '../ports/diagram-comment.repository';
import { DIAGRAM_REPOSITORY, DiagramRepository } from '../ports/diagram.repository';
import { DiagramComment } from '../../domain/diagram-comment';

@Injectable()
export class ListDiagramCommentsUseCase {
  constructor(
    private readonly currentUserSyncService: CurrentUserSyncService,
    @Inject(DIAGRAM_REPOSITORY) private readonly diagramRepository: DiagramRepository,
    @Inject(PROJECT_REPOSITORY) private readonly projectRepository: ProjectRepository,
    @Inject(WORKSPACE_MEMBER_REPOSITORY)
    private readonly workspaceMemberRepository: WorkspaceMemberRepository,
    @Inject(DIAGRAM_COMMENT_REPOSITORY)
    private readonly diagramCommentRepository: DiagramCommentRepository
  ) {}

  async execute(user: AuthenticatedUser, diagramId: string): Promise<DiagramComment[]> {
    await this.currentUserSyncService.ensureUser(user);
    const diagram = await this.diagramRepository.findById(diagramId);
    if (diagram === null) {
      throw new NotFoundException('Diagram was not found.');
    }

    const project = await this.projectRepository.findById(diagram.projectId);
    if (project === null || project.workspaceId !== diagram.workspaceId) {
      throw new BadRequestException('Diagram project ownership is inconsistent.');
    }

    const membership = await this.workspaceMemberRepository.findByWorkspaceIdAndUserId(
      diagram.workspaceId,
      user.id
    );

    if (membership === null || !canViewDiagram(membership.role)) {
      throw new ForbiddenException('You do not have permission to view comments for this diagram.');
    }

    return this.diagramCommentRepository.listByDiagramId(diagram.id);
  }
}
