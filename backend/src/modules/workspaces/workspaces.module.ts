import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { CreateProjectUseCase } from './application/use-cases/create-project.use-case';
import { CreateWorkspaceUseCase } from './application/use-cases/create-workspace.use-case';
import { ListProjectsUseCase } from './application/use-cases/list-projects.use-case';
import { ListWorkspacesUseCase } from './application/use-cases/list-workspaces.use-case';
import { WorkspacePolicyService } from './application/workspace-policy.service';
import { WorkspaceMembersService } from './application/workspace-members.service';
import { PROJECT_REPOSITORY } from './application/ports/project.repository';
import { WORKSPACE_MEMBER_REPOSITORY } from './application/ports/workspace-member.repository';
import { WORKSPACE_REPOSITORY } from './application/ports/workspace.repository';
import { ROLE_REPOSITORY } from './application/ports/role.repository';
import { ProjectEntity } from './infrastructure/persistence/project.entity';
import { WorkspaceEntity } from './infrastructure/persistence/workspace.entity';
import { WorkspaceMemberEntity } from './infrastructure/persistence/workspace-member.entity';
import { WorkspacePolicyEntity } from './infrastructure/persistence/workspace-policy.entity';
import { RoleEntity } from './infrastructure/persistence/role.entity';
import { TypeOrmProjectRepository } from './infrastructure/persistence/typeorm-project.repository';
import { TypeOrmWorkspaceMemberRepository } from './infrastructure/persistence/typeorm-workspace-member.repository';
import { TypeOrmWorkspaceRepository } from './infrastructure/persistence/typeorm-workspace.repository';
import { TypeOrmRoleRepository } from './infrastructure/persistence/typeorm-role.repository';
import { WorkspacesController } from './presentation/workspaces.controller';

@Module({
  imports: [
    AuthModule,
    AuditModule,
    TypeOrmModule.forFeature([WorkspaceEntity, WorkspaceMemberEntity, ProjectEntity, WorkspacePolicyEntity, RoleEntity])
  ],
  controllers: [WorkspacesController],
  providers: [
    CreateWorkspaceUseCase,
    ListWorkspacesUseCase,
    CreateProjectUseCase,
    ListProjectsUseCase,
    WorkspacePolicyService,
    WorkspaceMembersService,
    {
      provide: WORKSPACE_REPOSITORY,
      useClass: TypeOrmWorkspaceRepository
    },
    {
      provide: WORKSPACE_MEMBER_REPOSITORY,
      useClass: TypeOrmWorkspaceMemberRepository
    },
    {
      provide: PROJECT_REPOSITORY,
      useClass: TypeOrmProjectRepository
    },
    {
      provide: ROLE_REPOSITORY,
      useClass: TypeOrmRoleRepository
    }
  ],
  exports: [TypeOrmModule, PROJECT_REPOSITORY, WORKSPACE_MEMBER_REPOSITORY, WorkspacePolicyService, WorkspaceMembersService]
})
export class WorkspacesModule {}
