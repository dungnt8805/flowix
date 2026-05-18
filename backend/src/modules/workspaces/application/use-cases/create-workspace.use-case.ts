import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuthenticatedUser } from '../../../../common/auth/authenticated-user';
import { CurrentUserSyncService } from '../../../auth/application/current-user-sync.service';
import { Workspace } from '../../domain/workspace';
import { WorkspaceMemberRole } from '../../domain/workspace-member-role';
import { buildWorkspaceSlug } from '../../domain/workspace-slug';
import { WORKSPACE_MEMBER_REPOSITORY, WorkspaceMemberRepository } from '../ports/workspace-member.repository';
import { WORKSPACE_REPOSITORY, WorkspaceRepository } from '../ports/workspace.repository';

interface CreateWorkspaceInput {
  user: AuthenticatedUser;
  name: string;
}

@Injectable()
export class CreateWorkspaceUseCase {
  constructor(
    private readonly currentUserSyncService: CurrentUserSyncService,
    @Inject(WORKSPACE_REPOSITORY)
    private readonly workspaceRepository: WorkspaceRepository,
    @Inject(WORKSPACE_MEMBER_REPOSITORY)
    private readonly workspaceMemberRepository: WorkspaceMemberRepository
  ) {}

  async execute(input: CreateWorkspaceInput): Promise<Workspace> {
    await this.currentUserSyncService.ensureUser(input.user);

    const workspace = Workspace.create({
      name: input.name,
      slug: buildWorkspaceSlug(input.name, randomUUID()),
      createdBy: input.user.id
    });

    const savedWorkspace = await this.workspaceRepository.save(workspace);
    await this.workspaceMemberRepository.addMember({
      workspaceId: savedWorkspace.id,
      userId: input.user.id,
      role: WorkspaceMemberRole.OWNER
    });

    return savedWorkspace;
  }
}
