import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { CreateDiagramUseCase } from './application/use-cases/create-diagram.use-case';
import { CreateDiagramCommentUseCase } from './application/use-cases/create-diagram-comment.use-case';
import { CreateDiagramShareLinkUseCase } from './application/use-cases/create-diagram-share-link.use-case';
import { ExportDiagramSourceUseCase } from './application/use-cases/export-diagram-source.use-case';
import { GetSharedDiagramUseCase } from './application/use-cases/get-shared-diagram.use-case';
import { ListDiagramCommentsUseCase } from './application/use-cases/list-diagram-comments.use-case';
import { ListDiagramVersionsUseCase } from './application/use-cases/list-diagram-versions.use-case';
import { ListProjectDiagramsUseCase } from './application/use-cases/list-project-diagrams.use-case';
import { RequestDiagramSvgExportUseCase } from './application/use-cases/request-diagram-svg-export.use-case';
import { RevokeDiagramShareLinkUseCase } from './application/use-cases/revoke-diagram-share-link.use-case';
import { RestoreDiagramVersionUseCase } from './application/use-cases/restore-diagram-version.use-case';
import { UpdateDiagramUseCase } from './application/use-cases/update-diagram.use-case';
import { UpdateDiagramCommentStatusUseCase } from './application/use-cases/update-diagram-comment-status.use-case';
import { DIAGRAM_VERSION_REPOSITORY } from './application/ports/diagram-version.repository';
import { DIAGRAM_COMMENT_REPOSITORY } from './application/ports/diagram-comment.repository';
import { DIAGRAM_SHARE_LINK_REPOSITORY } from './application/ports/diagram-share-link.repository';
import { DIAGRAM_REPOSITORY } from './application/ports/diagram.repository';
import { DiagramCommentEntity } from './infrastructure/persistence/diagram-comment.entity';
import { DiagramShareLinkEntity } from './infrastructure/persistence/diagram-share-link.entity';
import { DiagramVersionEntity } from './infrastructure/persistence/diagram-version.entity';
import { DiagramEntity } from './infrastructure/persistence/diagram.entity';
import { TypeOrmDiagramCommentRepository } from './infrastructure/persistence/typeorm-diagram-comment.repository';
import { TypeOrmDiagramShareLinkRepository } from './infrastructure/persistence/typeorm-diagram-share-link.repository';
import { TypeOrmDiagramVersionRepository } from './infrastructure/persistence/typeorm-diagram-version.repository';
import { TypeOrmDiagramRepository } from './infrastructure/persistence/typeorm-diagram.repository';
import { DiagramsController } from './presentation/diagrams.controller';
import { ProjectDiagramsController } from './presentation/project-diagrams.controller';

@Module({
  imports: [
    AuthModule,
    AuditModule,
    WorkspacesModule,
    TypeOrmModule.forFeature([DiagramEntity, DiagramVersionEntity, DiagramShareLinkEntity, DiagramCommentEntity])
  ],
  controllers: [DiagramsController, ProjectDiagramsController],
  providers: [
    CreateDiagramUseCase,
    CreateDiagramCommentUseCase,
    CreateDiagramShareLinkUseCase,
    ExportDiagramSourceUseCase,
    GetSharedDiagramUseCase,
    ListDiagramCommentsUseCase,
    ListDiagramVersionsUseCase,
    ListProjectDiagramsUseCase,
    RequestDiagramSvgExportUseCase,
    RevokeDiagramShareLinkUseCase,
    RestoreDiagramVersionUseCase,
    UpdateDiagramCommentStatusUseCase,
    UpdateDiagramUseCase,
    {
      provide: DIAGRAM_REPOSITORY,
      useClass: TypeOrmDiagramRepository
    },
    {
      provide: DIAGRAM_VERSION_REPOSITORY,
      useClass: TypeOrmDiagramVersionRepository
    },
    {
      provide: DIAGRAM_SHARE_LINK_REPOSITORY,
      useClass: TypeOrmDiagramShareLinkRepository
    },
    {
      provide: DIAGRAM_COMMENT_REPOSITORY,
      useClass: TypeOrmDiagramCommentRepository
    }
  ],
  exports: [CreateDiagramUseCase]
})
export class DiagramsModule {}
