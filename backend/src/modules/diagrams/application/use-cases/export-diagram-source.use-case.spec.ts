import { ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser } from '../../../../common/auth/authenticated-user';
import { CurrentUserSyncService } from '../../../auth/application/current-user-sync.service';
import { ProjectRepository } from '../../../workspaces/application/ports/project.repository';
import { WorkspaceMemberRepository } from '../../../workspaces/application/ports/workspace-member.repository';
import { Project } from '../../../workspaces/domain/project';
import { WorkspaceMemberRole } from '../../../workspaces/domain/workspace-member-role';
import { Diagram } from '../../domain/diagram';
import { DiagramType } from '../../domain/diagram-type';
import { DiagramRepository } from '../ports/diagram.repository';
import { ExportDiagramSourceUseCase } from './export-diagram-source.use-case';
import { RequestDiagramSvgExportUseCase } from './request-diagram-svg-export.use-case';

describe('ExportDiagramSourceUseCase', () => {
  const user: AuthenticatedUser = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'viewer@example.com',
    displayName: 'Diagram Viewer'
  };
  const diagram = Diagram.create({
    id: '44444444-4444-4444-8444-444444444444',
    workspaceId: '22222222-2222-4222-8222-222222222222',
    projectId: '33333333-3333-4333-8333-333333333333',
    title: 'System Context!',
    sourceCode: 'flowchart LR\nA-->B',
    diagramType: DiagramType.FLOWCHART,
    createdBy: user.id
  });

  function buildUseCase(role: WorkspaceMemberRole | null = WorkspaceMemberRole.VIEWER): ExportDiagramSourceUseCase {
    const diagramRepository: jest.Mocked<DiagramRepository> = {
      save: jest.fn(),
      findById: jest.fn().mockResolvedValue(diagram),
      listByProjectId: jest.fn()
    };
    const projectRepository: jest.Mocked<ProjectRepository> = {
      save: jest.fn(),
      findById: jest.fn().mockResolvedValue(
        Project.create({
          id: diagram.projectId,
          workspaceId: diagram.workspaceId,
          name: 'Architecture',
          createdBy: user.id
        })
      ),
      listByWorkspaceId: jest.fn()
    };
    const workspaceMemberRepository: jest.Mocked<WorkspaceMemberRepository> = {
      addMember: jest.fn(),
      findByWorkspaceIdAndUserId: jest.fn().mockResolvedValue(
        role === null
          ? null
          : {
              id: 'member-1',
              workspaceId: diagram.workspaceId,
              userId: user.id,
              role,
              createdAt: new Date(),
              updatedAt: new Date()
            }
      )
    };

    return new ExportDiagramSourceUseCase(
      { ensureUser: jest.fn().mockResolvedValue(undefined) } as unknown as CurrentUserSyncService,
      diagramRepository,
      projectRepository,
      workspaceMemberRepository
    );
  }

  it('exports Mermaid source for a viewer with a safe filename', async () => {
    const result = await buildUseCase().execute({ user, diagramId: diagram.id });

    expect(result).toEqual({
      diagramId: diagram.id,
      workspaceId: diagram.workspaceId,
      filename: 'system-context.mmd',
      sourceCode: 'flowchart LR\nA-->B'
    });
  });

  it('rejects non-members', async () => {
    await expect(buildUseCase(null).execute({ user, diagramId: diagram.id })).rejects.toThrow(
      ForbiddenException
    );
  });

  it('defines the SVG export contract after authorizing access', async () => {
    const result = await new RequestDiagramSvgExportUseCase(buildUseCase()).execute({
      user,
      diagramId: diagram.id
    });

    expect(result).toEqual({
      status: 'not_available',
      format: 'svg',
      message: 'SVG export requires the renderer job pipeline and is not available in this sprint.'
    });
  });
});
