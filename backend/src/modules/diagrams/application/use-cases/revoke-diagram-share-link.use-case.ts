import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../../../../common/auth/authenticated-user';
import { CurrentUserSyncService } from '../../../auth/application/current-user-sync.service';
import {
  WORKSPACE_MEMBER_REPOSITORY,
  WorkspaceMemberRepository
} from '../../../workspaces/application/ports/workspace-member.repository';
import { Permission } from '../../../workspaces/domain/permission';
import {
  DIAGRAM_SHARE_LINK_REPOSITORY,
  DiagramShareLinkRepository
} from '../ports/diagram-share-link.repository';
import { DIAGRAM_REPOSITORY, DiagramRepository } from '../ports/diagram.repository';

@Injectable()
export class RevokeDiagramShareLinkUseCase {
  constructor(
    private readonly currentUserSyncService: CurrentUserSyncService,
    @Inject(DIAGRAM_REPOSITORY) private readonly diagramRepository: DiagramRepository,
    @Inject(WORKSPACE_MEMBER_REPOSITORY)
    private readonly workspaceMemberRepository: WorkspaceMemberRepository,
    @Inject(DIAGRAM_SHARE_LINK_REPOSITORY)
    private readonly shareLinkRepository: DiagramShareLinkRepository
  ) {}

  async execute(user: AuthenticatedUser, diagramId: string, linkId: string): Promise<void> {
    await this.currentUserSyncService.ensureUser(user);
    const diagram = await this.diagramRepository.findById(diagramId);
    const link = await this.shareLinkRepository.findById(linkId);
    if (diagram === null || link === null || link.diagramId !== diagramId) {
      throw new NotFoundException('Share link was not found.');
    }

    if (link.workspaceId !== diagram.workspaceId) {
      throw new BadRequestException('Share link ownership is inconsistent.');
    }

    const membership = await this.workspaceMemberRepository.findByWorkspaceIdAndUserId(diagram.workspaceId, user.id);
    if (membership === null || !membership.role.hasPermission(Permission.DIAGRAM_UPDATE)) {
      throw new ForbiddenException('You do not have permission to revoke this share link.');
    }

    await this.shareLinkRepository.save(link.revoke());
  }
}
