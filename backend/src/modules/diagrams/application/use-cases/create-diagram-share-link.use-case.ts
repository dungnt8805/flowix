import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../../../../common/auth/authenticated-user';
import { CurrentUserSyncService } from '../../../auth/application/current-user-sync.service';
import { PROJECT_REPOSITORY, ProjectRepository } from '../../../workspaces/application/ports/project.repository';
import { WorkspacePolicyService } from '../../../workspaces/application/workspace-policy.service';
import {
  WORKSPACE_MEMBER_REPOSITORY,
  WorkspaceMemberRepository
} from '../../../workspaces/application/ports/workspace-member.repository';
import { Permission } from '../../../workspaces/domain/permission';
import { DiagramShareLink } from '../../domain/diagram-share-link';
import {
  DIAGRAM_SHARE_LINK_REPOSITORY,
  DiagramShareLinkRepository
} from '../ports/diagram-share-link.repository';
import { DIAGRAM_REPOSITORY, DiagramRepository } from '../ports/diagram.repository';
import { createShareToken, hashShareToken } from '../share-token';

export interface CreatedDiagramShareLink {
  id: string;
  diagramId: string;
  workspaceId: string;
  token: string;
  createdAt: Date;
  revokedAt: Date | null;
}

@Injectable()
export class CreateDiagramShareLinkUseCase {
  constructor(
    private readonly currentUserSyncService: CurrentUserSyncService,
    @Inject(DIAGRAM_REPOSITORY) private readonly diagramRepository: DiagramRepository,
    @Inject(PROJECT_REPOSITORY) private readonly projectRepository: ProjectRepository,
    @Inject(WORKSPACE_MEMBER_REPOSITORY)
    private readonly workspaceMemberRepository: WorkspaceMemberRepository,
    @Inject(DIAGRAM_SHARE_LINK_REPOSITORY)
    private readonly shareLinkRepository: DiagramShareLinkRepository,
    private readonly workspacePolicyService: WorkspacePolicyService
  ) {}

  async execute(user: AuthenticatedUser, diagramId: string): Promise<CreatedDiagramShareLink> {
    await this.currentUserSyncService.ensureUser(user);
    const diagram = await this.diagramRepository.findById(diagramId);
    if (diagram === null) {
      throw new NotFoundException('Diagram was not found.');
    }

    const project = await this.projectRepository.findById(diagram.projectId);
    if (project === null || project.workspaceId !== diagram.workspaceId) {
      throw new BadRequestException('Diagram project ownership is inconsistent.');
    }

    const membership = await this.workspaceMemberRepository.findByWorkspaceIdAndUserId(diagram.workspaceId, user.id);
    if (membership === null || !membership.role.hasPermission(Permission.DIAGRAM_UPDATE)) {
      throw new ForbiddenException('You do not have permission to share this diagram.');
    }
    await this.workspacePolicyService.requireShareLinksAllowed(diagram.workspaceId);

    const token = createShareToken();
    const link = await this.shareLinkRepository.save(
      DiagramShareLink.create({
        diagramId: diagram.id,
        workspaceId: diagram.workspaceId,
        tokenHash: hashShareToken(token),
        createdBy: user.id
      })
    );

    return {
      id: link.id,
      diagramId: link.diagramId,
      workspaceId: link.workspaceId,
      token,
      createdAt: link.createdAt,
      revokedAt: link.revokedAt
    };
  }
}
