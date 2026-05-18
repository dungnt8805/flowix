import { Inject, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../../../../common/auth/authenticated-user';
import { CurrentUserSyncService } from '../../../auth/application/current-user-sync.service';
import { WORKSPACE_REPOSITORY, WorkspaceRepository, WorkspaceWithRole } from '../ports/workspace.repository';

@Injectable()
export class ListWorkspacesUseCase {
  constructor(
    private readonly currentUserSyncService: CurrentUserSyncService,
    @Inject(WORKSPACE_REPOSITORY)
    private readonly workspaceRepository: WorkspaceRepository
  ) {}

  async execute(user: AuthenticatedUser): Promise<WorkspaceWithRole[]> {
    await this.currentUserSyncService.ensureUser(user);
    return this.workspaceRepository.listByUserIdWithRole(user.id);
  }
}
