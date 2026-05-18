import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../../../../common/auth/authenticated-user';
import { CurrentUserSyncService } from '../../../auth/application/current-user-sync.service';
import { ProjectRepository } from '../../../workspaces/application/ports/project.repository';
import { WorkspaceMemberRepository } from '../../../workspaces/application/ports/workspace-member.repository';
import { Project } from '../../../workspaces/domain/project';
import { WorkspaceMemberRole } from '../../../workspaces/domain/workspace-member-role';
import { Diagram } from '../../domain/diagram';
import { DiagramComment } from '../../domain/diagram-comment';
import { DiagramCommentRepository } from '../ports/diagram-comment.repository';
import { DiagramRepository } from '../ports/diagram.repository';
import { ListDiagramCommentsUseCase } from './list-diagram-comments.use-case';

describe('ListDiagramCommentsUseCase', () => {
  const user: AuthenticatedUser = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'viewer@example.com',
    displayName: 'Viewer'
  };
  const diagram = Diagram.create({
    id: '44444444-4444-4444-8444-444444444444',
    workspaceId: '22222222-2222-4222-8222-222222222222',
    projectId: '33333333-3333-4333-8333-333333333333',
    title: 'System context',
    sourceCode: 'flowchart LR\nA-->B',
    createdBy: '99999999-9999-4999-8999-999999999999'
  });
  const project = Project.create({
    id: diagram.projectId,
    workspaceId: diagram.workspaceId,
    name: 'Review Project',
    createdBy: '99999999-9999-4999-8999-999999999999'
  });
  const comment = DiagramComment.create({
    id: '55555555-5555-4555-8555-555555555555',
    diagramId: diagram.id,
    workspaceId: diagram.workspaceId,
    authorId: user.id,
    body: 'Read-only feedback is visible.'
  });

  function buildUseCase(role: WorkspaceMemberRole | null = WorkspaceMemberRole.VIEWER): {
    diagramRepository: jest.Mocked<DiagramRepository>;
    commentRepository: jest.Mocked<DiagramCommentRepository>;
    useCase: ListDiagramCommentsUseCase;
  } {
    const diagramRepository: jest.Mocked<DiagramRepository> = {
      save: jest.fn(),
      findById: jest.fn().mockResolvedValue(diagram),
      listByProjectId: jest.fn()
    };
    const projectRepository: jest.Mocked<ProjectRepository> = {
      save: jest.fn(),
      findById: jest.fn().mockResolvedValue(project),
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
    const commentRepository: jest.Mocked<DiagramCommentRepository> = {
      save: jest.fn(),
      findById: jest.fn(),
      listByDiagramId: jest.fn().mockResolvedValue([comment])
    };

    return {
      diagramRepository,
      commentRepository,
      useCase: new ListDiagramCommentsUseCase(
        { ensureUser: jest.fn().mockResolvedValue(undefined) } as unknown as CurrentUserSyncService,
        diagramRepository,
        projectRepository,
        workspaceMemberRepository,
        commentRepository
      )
    };
  }

  it('allows viewers to list diagram comments', async () => {
    const { commentRepository, useCase } = buildUseCase();

    const comments = await useCase.execute(user, diagram.id);

    expect(commentRepository.listByDiagramId.mock.calls).toEqual([[diagram.id]]);
    expect(comments).toEqual([comment]);
  });

  it('rejects users outside the workspace', async () => {
    const { useCase } = buildUseCase(null);

    await expect(useCase.execute(user, diagram.id)).rejects.toThrow(ForbiddenException);
  });

  it('returns not found for missing diagrams', async () => {
    const { diagramRepository, useCase } = buildUseCase();
    diagramRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(user, diagram.id)).rejects.toThrow(NotFoundException);
  });
});
