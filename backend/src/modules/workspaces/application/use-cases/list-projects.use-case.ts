import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../../../../common/auth/authenticated-user';
import { CurrentUserSyncService } from '../../../auth/application/current-user-sync.service';
import { Project } from '../../domain/project';
import { PROJECT_REPOSITORY, ProjectRepository } from '../ports/project.repository';
import { WORKSPACE_MEMBER_REPOSITORY, WorkspaceMemberRepository } from '../ports/workspace-member.repository';

@Injectable()
export class ListProjectsUseCase {
  constructor(
    private readonly currentUserSyncService: CurrentUserSyncService,
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: ProjectRepository,
    @Inject(WORKSPACE_MEMBER_REPOSITORY)
    private readonly workspaceMemberRepository: WorkspaceMemberRepository
  ) {}

  async execute(user: AuthenticatedUser, workspaceId: string): Promise<Project[]> {
    await this.currentUserSyncService.ensureUser(user);

    const membership = await this.workspaceMemberRepository.findByWorkspaceIdAndUserId(
      workspaceId,
      user.id
    );

    if (membership === null) {
      throw new ForbiddenException('You do not have access to this workspace.');
    }

    return this.projectRepository.listByWorkspaceId(workspaceId);
  }
}
