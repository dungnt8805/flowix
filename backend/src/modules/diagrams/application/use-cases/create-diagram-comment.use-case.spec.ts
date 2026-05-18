import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser } from '../../../../common/auth/authenticated-user';
import { CurrentUserSyncService } from '../../../auth/application/current-user-sync.service';
import { ProjectRepository } from '../../../workspaces/application/ports/project.repository';
import { WorkspaceMemberRepository } from '../../../workspaces/application/ports/workspace-member.repository';
import { Project } from '../../../workspaces/domain/project';
import { WorkspaceMemberRole } from '../../../workspaces/domain/workspace-member-role';
import { Diagram } from '../../domain/diagram';
import { DiagramCommentRepository } from '../ports/diagram-comment.repository';
import { DiagramRepository } from '../ports/diagram.repository';
import { CreateDiagramCommentUseCase } from './create-diagram-comment.use-case';

describe('CreateDiagramCommentUseCase', () => {
  const user: AuthenticatedUser = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'reviewer@example.com',
    displayName: 'Reviewer'
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

  function buildUseCase(role: WorkspaceMemberRole | null = WorkspaceMemberRole.COMMENTER): {
    commentRepository: jest.Mocked<DiagramCommentRepository>;
    useCase: CreateDiagramCommentUseCase;
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
      save: jest.fn((comment) => Promise.resolve(comment)),
      findById: jest.fn(),
      listByDiagramId: jest.fn()
    };

    return {
      commentRepository,
      useCase: new CreateDiagramCommentUseCase(
        { ensureUser: jest.fn().mockResolvedValue(undefined) } as unknown as CurrentUserSyncService,
        diagramRepository,
        projectRepository,
        workspaceMemberRepository,
        commentRepository
      )
    };
  }

  it('allows commenters to create diagram comments without edit permission', async () => {
    const { commentRepository, useCase } = buildUseCase();

    const comment = await useCase.execute({
      user,
      diagramId: diagram.id,
      body: ' Please clarify this dependency. '
    });

    expect(commentRepository.save.mock.calls).toHaveLength(1);
    expect(comment.diagramId).toBe(diagram.id);
    expect(comment.workspaceId).toBe(diagram.workspaceId);
    expect(comment.authorId).toBe(user.id);
    expect(comment.body).toBe('Please clarify this dependency.');
  });

  it('rejects viewers from creating comments', async () => {
    const { useCase } = buildUseCase(WorkspaceMemberRole.VIEWER);

    await expect(
      useCase.execute({
        user,
        diagramId: diagram.id,
        body: 'Read-only users cannot comment.'
      })
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects blank comments before persisting', async () => {
    const { commentRepository, useCase } = buildUseCase();

    await expect(
      useCase.execute({
        user,
        diagramId: diagram.id,
        body: ' '
      })
    ).rejects.toThrow(BadRequestException);
    expect(commentRepository.save.mock.calls).toHaveLength(0);
  });
});
