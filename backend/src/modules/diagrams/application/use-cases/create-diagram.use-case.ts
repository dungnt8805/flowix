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
import { DIAGRAM_REPOSITORY, DiagramRepository } from '../ports/diagram.repository';
import { Diagram } from '../../domain/diagram';
import { DiagramThemeConfig } from '../../domain/diagram-theme';
import { DiagramType } from '../../domain/diagram-type';

export interface CreateDiagramCommand {
  user: AuthenticatedUser;
  workspaceId: string;
  projectId: string;
  title: string;
  description?: string;
  sourceCode: string;
  diagramType?: DiagramType;
  themeConfig?: DiagramThemeConfig | null;
}

@Injectable()
export class CreateDiagramUseCase {
  constructor(
    private readonly currentUserSyncService: CurrentUserSyncService,
    @Inject(DIAGRAM_REPOSITORY)
    private readonly diagramRepository: DiagramRepository,
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: ProjectRepository,
    @Inject(WORKSPACE_MEMBER_REPOSITORY)
    private readonly workspaceMemberRepository: WorkspaceMemberRepository
  ) {}

  async execute(command: CreateDiagramCommand): Promise<Diagram> {
    await this.currentUserSyncService.ensureUser(command.user);

    if (command.title.trim().length === 0) {
      throw new BadRequestException('Diagram title is required.');
    }

    if (command.sourceCode.trim().length === 0) {
      throw new BadRequestException('Diagram source code is required.');
    }

    const project = await this.projectRepository.findById(command.projectId);
    if (project === null) {
      throw new NotFoundException('Project was not found.');
    }

    if (project.workspaceId !== command.workspaceId) {
      throw new BadRequestException('Diagram workspace must match the project workspace.');
    }

    const membership = await this.workspaceMemberRepository.findByWorkspaceIdAndUserId(
      project.workspaceId,
      command.user.id
    );

    if (membership === null || !membership.role.hasPermission(Permission.DIAGRAM_CREATE)) {
      throw new ForbiddenException('You do not have permission to create a diagram in this project.');
    }

    const diagram = Diagram.create({
      workspaceId: project.workspaceId,
      projectId: project.id,
      title: command.title,
      description: command.description,
      sourceCode: command.sourceCode,
      diagramType: command.diagramType,
      themeConfig: command.themeConfig,
      createdBy: command.user.id
    });

    return this.diagramRepository.save(diagram);
  }
}
