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
import { Diagram } from '../../domain/diagram';
import { DIAGRAM_REPOSITORY, DiagramRepository } from '../ports/diagram.repository';

export interface ExportDiagramSourceQuery {
  user: AuthenticatedUser;
  diagramId: string;
}

export interface ExportedDiagramSource {
  diagramId: string;
  workspaceId: string;
  filename: string;
  sourceCode: string;
}

@Injectable()
export class ExportDiagramSourceUseCase {
  constructor(
    private readonly currentUserSyncService: CurrentUserSyncService,
    @Inject(DIAGRAM_REPOSITORY)
    private readonly diagramRepository: DiagramRepository,
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: ProjectRepository,
    @Inject(WORKSPACE_MEMBER_REPOSITORY)
    private readonly workspaceMemberRepository: WorkspaceMemberRepository
  ) {}

  async execute(query: ExportDiagramSourceQuery): Promise<ExportedDiagramSource> {
    const diagram = await this.loadAuthorizedDiagram(query.user, query.diagramId);

    return {
      diagramId: diagram.id,
      workspaceId: diagram.workspaceId,
      filename: `${toSafeFilename(diagram.title)}.mmd`,
      sourceCode: diagram.sourceCode
    };
  }

  private async loadAuthorizedDiagram(user: AuthenticatedUser, diagramId: string): Promise<Diagram> {
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
      throw new ForbiddenException('You do not have permission to export this diagram.');
    }

    return diagram;
  }
}

function toSafeFilename(title: string): string {
  const filename = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return filename.length === 0 ? 'diagram' : filename;
}
