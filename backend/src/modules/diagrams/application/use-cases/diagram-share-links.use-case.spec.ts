import { ForbiddenException, GoneException } from '@nestjs/common';
import { AuthenticatedUser } from '../../../../common/auth/authenticated-user';
import { CurrentUserSyncService } from '../../../auth/application/current-user-sync.service';
import { ProjectRepository } from '../../../workspaces/application/ports/project.repository';
import { WorkspaceMemberRepository } from '../../../workspaces/application/ports/workspace-member.repository';
import { Project } from '../../../workspaces/domain/project';
import { WorkspaceMemberRole } from '../../../workspaces/domain/workspace-member-role';
import { DiagramShareLink } from '../../domain/diagram-share-link';
import { Diagram } from '../../domain/diagram';
import { DiagramShareLinkRepository } from '../ports/diagram-share-link.repository';
import { DiagramRepository } from '../ports/diagram.repository';
import { hashShareToken } from '../share-token';
import { CreateDiagramShareLinkUseCase } from './create-diagram-share-link.use-case';
import { GetSharedDiagramUseCase } from './get-shared-diagram.use-case';
import { RevokeDiagramShareLinkUseCase } from './revoke-diagram-share-link.use-case';

describe('diagram share link use cases', () => {
  const user: AuthenticatedUser = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'user@example.com',
    displayName: 'User'
  };
  const diagram = Diagram.create({
    id: '44444444-4444-4444-8444-444444444444',
    workspaceId: '22222222-2222-4222-8222-222222222222',
    projectId: '33333333-3333-4333-8333-333333333333',
    title: 'Shared',
    sourceCode: 'flowchart LR\nA-->B',
    createdBy: user.id
  });

  function setup(role: WorkspaceMemberRole | null = WorkspaceMemberRole.EDITOR): {
    diagramRepository: jest.Mocked<DiagramRepository>;
    shareLinkRepository: jest.Mocked<DiagramShareLinkRepository>;
    createUseCase: CreateDiagramShareLinkUseCase;
    revokeUseCase: RevokeDiagramShareLinkUseCase;
    getUseCase: GetSharedDiagramUseCase;
  } {
    let storedLink = DiagramShareLink.create({
      id: '55555555-5555-4555-8555-555555555555',
      diagramId: diagram.id,
      workspaceId: diagram.workspaceId,
      tokenHash: hashShareToken('known-token'),
      createdBy: user.id
    });
    const diagramRepository: jest.Mocked<DiagramRepository> = {
      save: jest.fn(),
      findById: jest.fn().mockResolvedValue(diagram),
      listByProjectId: jest.fn()
    };
    const shareLinkRepository: jest.Mocked<DiagramShareLinkRepository> = {
      save: jest.fn((link: DiagramShareLink) => {
        storedLink = link;
        return Promise.resolve(link);
      }),
      findById: jest.fn().mockImplementation(() => Promise.resolve(storedLink)),
      findByTokenHash: jest.fn().mockImplementation((tokenHash: string) =>
        Promise.resolve(tokenHash === storedLink.tokenHash ? storedLink : null)
      ),
      listByDiagramId: jest.fn().mockResolvedValue([storedLink])
    };
    const projectRepository: jest.Mocked<ProjectRepository> = {
      save: jest.fn(),
      findById: jest.fn().mockResolvedValue(
        Project.create({
          id: diagram.projectId,
          workspaceId: diagram.workspaceId,
          name: 'Project',
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
    const currentUserSyncService = {
      ensureUser: jest.fn().mockResolvedValue(undefined)
    } as unknown as CurrentUserSyncService;

    return {
      diagramRepository,
      shareLinkRepository,
      createUseCase: new CreateDiagramShareLinkUseCase(
        currentUserSyncService,
        diagramRepository,
        projectRepository,
        workspaceMemberRepository,
        shareLinkRepository,
        { requireShareLinksAllowed: jest.fn().mockResolvedValue(undefined) } as never
      ),
      revokeUseCase: new RevokeDiagramShareLinkUseCase(
        currentUserSyncService,
        diagramRepository,
        workspaceMemberRepository,
        shareLinkRepository
      ),
      getUseCase: new GetSharedDiagramUseCase(diagramRepository, shareLinkRepository)
    };
  }

  it('creates a hashed share token and returns the raw token once', async () => {
    const { shareLinkRepository, createUseCase } = setup();

    const result = await createUseCase.execute(user, diagram.id);

    expect(result.token).toHaveLength(43);
    expect(shareLinkRepository.save.mock.calls[0]?.[0].tokenHash).not.toBe(result.token);
  });

  it('revokes a share link for editors', async () => {
    const { revokeUseCase, shareLinkRepository } = setup();

    await revokeUseCase.execute(user, diagram.id, '55555555-5555-4555-8555-555555555555');

    expect(shareLinkRepository.save.mock.calls[0]?.[0].revokedAt).toBeInstanceOf(Date);
  });

  it('rejects viewer revocation', async () => {
    await expect(
      setup(WorkspaceMemberRole.VIEWER).revokeUseCase.execute(
        user,
        diagram.id,
        '55555555-5555-4555-8555-555555555555'
      )
    ).rejects.toThrow(ForbiddenException);
  });

  it('loads active shared diagrams by raw token and rejects revoked links', async () => {
    const { getUseCase, revokeUseCase } = setup();

    await expect(getUseCase.execute('known-token')).resolves.toEqual(diagram);
    await revokeUseCase.execute(user, diagram.id, '55555555-5555-4555-8555-555555555555');
    await expect(getUseCase.execute('known-token')).rejects.toThrow(GoneException);
  });
});
