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
import { canUpdateDiagram } from '../../../workspaces/domain/workspace-permissions';
import { Diagram } from '../../domain/diagram';
import { DiagramThemeConfig } from '../../domain/diagram-theme';
import { DiagramVersion } from '../../domain/diagram-version';
import { DiagramType } from '../../domain/diagram-type';
import {
  DIAGRAM_VERSION_REPOSITORY,
  DiagramVersionRepository
} from '../ports/diagram-version.repository';
import { DIAGRAM_REPOSITORY, DiagramRepository } from '../ports/diagram.repository';

export interface UpdateDiagramCommand {
  user: AuthenticatedUser;
  diagramId: string;
  title?: string;
  description?: string | null;
  sourceCode?: string;
  diagramType?: DiagramType;
  themeConfig?: DiagramThemeConfig | null;
}

@Injectable()
export class UpdateDiagramUseCase {
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

  async execute(command: UpdateDiagramCommand): Promise<Diagram> {
    await this.currentUserSyncService.ensureUser(command.user);

    if (!hasPatchFields(command)) {
      throw new BadRequestException('At least one diagram field must be provided.');
    }

    const diagram = await this.diagramRepository.findById(command.diagramId);
    if (diagram === null) {
      throw new NotFoundException('Diagram was not found.');
    }

    const project = await this.projectRepository.findById(diagram.projectId);
    if (project === null || project.workspaceId !== diagram.workspaceId) {
      throw new BadRequestException('Diagram project ownership is inconsistent.');
    }

    const membership = await this.workspaceMemberRepository.findByWorkspaceIdAndUserId(
      diagram.workspaceId,
      command.user.id
    );

    if (membership === null || !canUpdateDiagram(membership.role)) {
      throw new ForbiddenException('You do not have permission to update this diagram.');
    }

    const updatedDiagram = await this.diagramRepository.save(
      diagram.update({
        title: command.title,
        description: command.description,
        sourceCode: command.sourceCode,
        diagramType: command.diagramType,
        themeConfig: command.themeConfig
      })
    );

    await this.createSnapshotIfChanged(updatedDiagram, command.user.id);

    return updatedDiagram;
  }

  private async createSnapshotIfChanged(diagram: Diagram, userId: string): Promise<void> {
    const latestVersion = await this.diagramVersionRepository.findLatestByDiagramId(diagram.id);

    if (
      latestVersion?.matchesSnapshot({
        title: diagram.title,
        description: diagram.description,
        sourceCode: diagram.sourceCode,
        diagramType: diagram.diagramType,
        themeConfig: diagram.themeConfig
      })
    ) {
      return;
    }

    await this.diagramVersionRepository.save(
      DiagramVersion.create({
        diagramId: diagram.id,
        workspaceId: diagram.workspaceId,
        projectId: diagram.projectId,
        title: diagram.title,
        description: diagram.description,
        sourceCode: diagram.sourceCode,
        diagramType: diagram.diagramType,
        themeConfig: diagram.themeConfig,
        createdBy: userId
      })
    );
  }
}

function hasPatchFields(command: UpdateDiagramCommand): boolean {
  return (
    command.title !== undefined ||
    command.description !== undefined ||
    command.sourceCode !== undefined ||
    command.diagramType !== undefined ||
    command.themeConfig !== undefined
  );
}
