import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
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
import { Diagram } from '../../domain/diagram';
import { DIAGRAM_REPOSITORY, DiagramRepository } from '../ports/diagram.repository';

@Injectable()
export class ListProjectDiagramsUseCase {
  constructor(
    private readonly currentUserSyncService: CurrentUserSyncService,
    @Inject(DIAGRAM_REPOSITORY)
    private readonly diagramRepository: DiagramRepository,
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: ProjectRepository,
    @Inject(WORKSPACE_MEMBER_REPOSITORY)
    private readonly workspaceMemberRepository: WorkspaceMemberRepository
  ) {}

  async execute(user: AuthenticatedUser, projectId: string): Promise<Diagram[]> {
    await this.currentUserSyncService.ensureUser(user);

    const project = await this.projectRepository.findById(projectId);
    if (project === null) {
      throw new NotFoundException('Project was not found.');
    }

    const membership = await this.workspaceMemberRepository.findByWorkspaceIdAndUserId(
      project.workspaceId,
      user.id
    );

    if (membership === null) {
      throw new ForbiddenException('You do not have access to this project.');
    }

    return this.diagramRepository.listByProjectId(project.id);
  }
}
