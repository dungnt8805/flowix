import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../../../../common/auth/authenticated-user';
import { CurrentUserSyncService } from '../../../auth/application/current-user-sync.service';
import { PROJECT_REPOSITORY, ProjectRepository } from '../../../workspaces/application/ports/project.repository';
import {
  WORKSPACE_MEMBER_REPOSITORY,
  WorkspaceMemberRepository
} from '../../../workspaces/application/ports/workspace-member.repository';
import { Permission } from '../../../workspaces/domain/permission';
import { DiagramComment } from '../../domain/diagram-comment';
import {
  DIAGRAM_COMMENT_REPOSITORY,
  DiagramCommentRepository
} from '../ports/diagram-comment.repository';
import { DIAGRAM_REPOSITORY, DiagramRepository } from '../ports/diagram.repository';

export interface UpdateDiagramCommentStatusCommand {
  user: AuthenticatedUser;
  diagramId: string;
  commentId: string;
  status: 'open' | 'resolved';
}

@Injectable()
export class UpdateDiagramCommentStatusUseCase {
  constructor(
    private readonly currentUserSyncService: CurrentUserSyncService,
    @Inject(DIAGRAM_REPOSITORY) private readonly diagramRepository: DiagramRepository,
    @Inject(PROJECT_REPOSITORY) private readonly projectRepository: ProjectRepository,
    @Inject(WORKSPACE_MEMBER_REPOSITORY)
    private readonly workspaceMemberRepository: WorkspaceMemberRepository,
    @Inject(DIAGRAM_COMMENT_REPOSITORY)
    private readonly diagramCommentRepository: DiagramCommentRepository
  ) {}

  async execute(command: UpdateDiagramCommentStatusCommand): Promise<DiagramComment> {
    await this.currentUserSyncService.ensureUser(command.user);

    const diagram = await this.diagramRepository.findById(command.diagramId);
    const comment = await this.diagramCommentRepository.findById(command.commentId);
    if (diagram === null || comment === null || comment.diagramId !== command.diagramId) {
      throw new NotFoundException('Comment was not found.');
    }

    const project = await this.projectRepository.findById(diagram.projectId);
    if (
      project === null ||
      project.workspaceId !== diagram.workspaceId ||
      comment.workspaceId !== diagram.workspaceId
    ) {
      throw new BadRequestException('Comment ownership is inconsistent.');
    }

    const membership = await this.workspaceMemberRepository.findByWorkspaceIdAndUserId(
      diagram.workspaceId,
      command.user.id
    );

    if (membership === null || !membership.role.hasPermission(Permission.DIAGRAM_COMMENT)) {
      throw new ForbiddenException('You do not have permission to update this comment.');
    }

    return this.diagramCommentRepository.save(
      command.status === 'resolved' ? comment.resolve() : comment.reopen()
    );
  }
}
