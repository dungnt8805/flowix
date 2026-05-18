import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../../../../common/auth/authenticated-user';
import { CurrentUserSyncService } from '../../../auth/application/current-user-sync.service';
import { Permission } from '../../domain/permission';
import { Project } from '../../domain/project';
import { PROJECT_REPOSITORY, ProjectRepository } from '../ports/project.repository';
import { WORKSPACE_MEMBER_REPOSITORY, WorkspaceMemberRepository } from '../ports/workspace-member.repository';

interface CreateProjectInput {
  user: AuthenticatedUser;
  workspaceId: string;
  name: string;
  description?: string;
}

@Injectable()
export class CreateProjectUseCase {
  constructor(
    private readonly currentUserSyncService: CurrentUserSyncService,
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: ProjectRepository,
    @Inject(WORKSPACE_MEMBER_REPOSITORY)
    private readonly workspaceMemberRepository: WorkspaceMemberRepository
  ) {}

  async execute(input: CreateProjectInput): Promise<Project> {
    await this.currentUserSyncService.ensureUser(input.user);

    const membership = await this.workspaceMemberRepository.findByWorkspaceIdAndUserId(
      input.workspaceId,
      input.user.id
    );

    if (membership === null || !membership.role.hasPermission(Permission.PROJECT_CREATE)) {
      throw new ForbiddenException('You do not have permission to create a project in this workspace.');
    }

    const project = Project.create({
      workspaceId: input.workspaceId,
      name: input.name,
      description: input.description,
      createdBy: input.user.id
    });

    return this.projectRepository.save(project);
  }
}
