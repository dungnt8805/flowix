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
import { Permission } from '../../../workspaces/domain/permission';
import { Diagram } from '../../domain/diagram';
import { DiagramVersion } from '../../domain/diagram-version';
import {
  DIAGRAM_VERSION_REPOSITORY,
  DiagramVersionRepository
} from '../ports/diagram-version.repository';
import { DIAGRAM_REPOSITORY, DiagramRepository } from '../ports/diagram.repository';

export interface RestoreDiagramVersionCommand {
  user: AuthenticatedUser;
  diagramId: string;
  versionId: string;
}

@Injectable()
export class RestoreDiagramVersionUseCase {
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

  async execute(command: RestoreDiagramVersionCommand): Promise<Diagram> {
    await this.currentUserSyncService.ensureUser(command.user);

    const diagram = await this.diagramRepository.findById(command.diagramId);
    if (diagram === null) {
      throw new NotFoundException('Diagram was not found.');
    }

    const version = await this.diagramVersionRepository.findById(command.versionId);
    if (version === null || version.diagramId !== diagram.id) {
      throw new NotFoundException('Diagram version was not found.');
    }

    if (version.workspaceId !== diagram.workspaceId || version.projectId !== diagram.projectId) {
      throw new BadRequestException('Diagram version ownership is inconsistent.');
    }

    const project = await this.projectRepository.findById(diagram.projectId);
    if (project === null || project.workspaceId !== diagram.workspaceId) {
      throw new BadRequestException('Diagram project ownership is inconsistent.');
    }

    const membership = await this.workspaceMemberRepository.findByWorkspaceIdAndUserId(
      diagram.workspaceId,
      command.user.id
    );

    if (membership === null || !membership.role.hasPermission(Permission.DIAGRAM_UPDATE)) {
      throw new ForbiddenException('You do not have permission to restore this diagram.');
    }

    const restoredDiagram = await this.diagramRepository.save(
      diagram.update({
        title: version.title,
        description: version.description,
        sourceCode: version.sourceCode,
        diagramType: version.diagramType,
        themeConfig: version.themeConfig
      })
    );

    await this.diagramVersionRepository.save(
      DiagramVersion.create({
        diagramId: restoredDiagram.id,
        workspaceId: restoredDiagram.workspaceId,
        projectId: restoredDiagram.projectId,
        title: restoredDiagram.title,
        description: restoredDiagram.description,
        sourceCode: restoredDiagram.sourceCode,
        diagramType: restoredDiagram.diagramType,
        themeConfig: restoredDiagram.themeConfig,
        createdBy: command.user.id
      })
    );

    return restoredDiagram;
  }
}
