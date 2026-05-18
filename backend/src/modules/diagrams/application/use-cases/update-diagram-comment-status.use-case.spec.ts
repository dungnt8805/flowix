import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../../../../common/auth/authenticated-user';
import { CurrentUserSyncService } from '../../../auth/application/current-user-sync.service';
import { ProjectRepository } from '../../../workspaces/application/ports/project.repository';
import { WorkspaceMemberRepository } from '../../../workspaces/application/ports/workspace-member.repository';
import { Project } from '../../../workspaces/domain/project';
import { WorkspaceMemberRole } from '../../../workspaces/domain/workspace-member-role';
import { Diagram } from '../../domain/diagram';
import { DiagramComment } from '../../domain/diagram-comment';
import { DiagramCommentStatus } from '../../domain/diagram-comment-status';
import { DiagramCommentRepository } from '../ports/diagram-comment.repository';
import { DiagramRepository } from '../ports/diagram.repository';
import { UpdateDiagramCommentStatusUseCase } from './update-diagram-comment-status.use-case';

describe('UpdateDiagramCommentStatusUseCase', () => {
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
  const comment = DiagramComment.create({
    id: '55555555-5555-4555-8555-555555555555',
    diagramId: diagram.id,
    workspaceId: diagram.workspaceId,
    authorId: user.id,
    body: 'Review note'
  });

  function buildUseCase(role: WorkspaceMemberRole | null = WorkspaceMemberRole.COMMENTER): {
    commentRepository: jest.Mocked<DiagramCommentRepository>;
    useCase: UpdateDiagramCommentStatusUseCase;
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
      save: jest.fn((nextComment) => Promise.resolve(nextComment)),
      findById: jest.fn().mockResolvedValue(comment),
      listByDiagramId: jest.fn()
    };

    return {
      commentRepository,
      useCase: new UpdateDiagramCommentStatusUseCase(
        { ensureUser: jest.fn().mockResolvedValue(undefined) } as unknown as CurrentUserSyncService,
        diagramRepository,
        projectRepository,
        workspaceMemberRepository,
        commentRepository
      )
    };
  }

  it('resolves and reopens comments for commenter role', async () => {
    const { commentRepository, useCase } = buildUseCase();

    const resolved = await useCase.execute({
      user,
      diagramId: diagram.id,
      commentId: comment.id,
      status: 'resolved'
    });
    commentRepository.findById.mockResolvedValue(resolved);
    const reopened = await useCase.execute({
      user,
      diagramId: diagram.id,
      commentId: comment.id,
      status: 'open'
    });

    expect(resolved.status).toBe(DiagramCommentStatus.RESOLVED);
    expect(reopened.status).toBe(DiagramCommentStatus.OPEN);
    expect(commentRepository.save.mock.calls).toHaveLength(2);
  });

  it('rejects viewers from changing comment status', async () => {
    const { useCase } = buildUseCase(WorkspaceMemberRole.VIEWER);

    await expect(
      useCase.execute({
        user,
        diagramId: diagram.id,
        commentId: comment.id,
        status: 'resolved'
      })
    ).rejects.toThrow(ForbiddenException);
  });

  it('returns not found when the comment is not for the diagram', async () => {
    const { commentRepository, useCase } = buildUseCase();
    commentRepository.findById.mockResolvedValue(
      DiagramComment.create({
        id: comment.id,
        diagramId: '66666666-6666-4666-8666-666666666666',
        workspaceId: diagram.workspaceId,
        authorId: user.id,
        body: 'Different diagram'
      })
    );

    await expect(
      useCase.execute({
        user,
        diagramId: diagram.id,
        commentId: comment.id,
        status: 'resolved'
      })
    ).rejects.toThrow(NotFoundException);
  });
});
