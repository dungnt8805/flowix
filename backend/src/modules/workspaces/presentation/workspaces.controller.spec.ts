import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { Project } from '../domain/project';
import { ProjectStatus } from '../domain/project-status';
import { Workspace } from '../domain/workspace';
import { WorkspaceMemberRole } from '../domain/workspace-member-role';
import { CreateProjectUseCase } from '../application/use-cases/create-project.use-case';
import { CreateWorkspaceUseCase } from '../application/use-cases/create-workspace.use-case';
import { ListProjectsUseCase } from '../application/use-cases/list-projects.use-case';
import { ListWorkspacesUseCase } from '../application/use-cases/list-workspaces.use-case';
import { WorkspacePolicyService } from '../application/workspace-policy.service';
import { WorkspaceMembersService } from '../application/workspace-members.service';
import { AuditService } from '../../audit/audit.service';
import { WorkspacesController } from './workspaces.controller';

describe('WorkspacesController', () => {
  const user: AuthenticatedUser = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'user@example.com',
    displayName: 'Workspace Admin'
  };

  function buildController(overrides: {
    createWorkspace?: unknown;
    listWorkspaces?: unknown;
    createProject?: unknown;
    listProjects?: unknown;
    policy?: unknown;
    members?: unknown;
    audit?: unknown;
  } = {}): WorkspacesController {
    return new WorkspacesController(
      (overrides.createWorkspace ?? { execute: jest.fn() }) as CreateWorkspaceUseCase,
      (overrides.listWorkspaces ?? { execute: jest.fn() }) as ListWorkspacesUseCase,
      (overrides.createProject ?? { execute: jest.fn() }) as CreateProjectUseCase,
      (overrides.listProjects ?? { execute: jest.fn() }) as ListProjectsUseCase,
      (overrides.policy ?? {
        getPolicy: jest.fn().mockResolvedValue({
          workspaceId: '22222222-2222-4222-8222-222222222222',
          allowShareLinks: true,
          allowExports: true,
          retentionDays: 365,
          ssoRequired: false
        }),
        updatePolicy: jest.fn().mockResolvedValue({
          workspaceId: '22222222-2222-4222-8222-222222222222',
          allowShareLinks: false,
          allowExports: true,
          retentionDays: 180,
          ssoRequired: true
        }),
        requireAdmin: jest.fn().mockResolvedValue(undefined)
      }) as WorkspacePolicyService,
      (overrides.members ?? {
        listMembers: jest.fn().mockResolvedValue([]),
        addMember: jest.fn(),
        updateRole: jest.fn(),
        removeMember: jest.fn()
      }) as unknown as WorkspaceMembersService,
      (overrides.audit ?? {
        record: jest.fn().mockResolvedValue(undefined),
        listForWorkspace: jest.fn().mockResolvedValue([])
      }) as unknown as AuditService
    );
  }

  it('creates a workspace', async () => {
    const workspace = Workspace.create({
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Platform',
      slug: 'platform-1234abcd',
      createdBy: user.id,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z')
    });
    const controller = buildController({
      createWorkspace: { execute: jest.fn().mockResolvedValue(workspace) }
    });

    const response = await controller.createWorkspace(user, { name: 'Platform' });

    expect(response).toEqual({
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Platform',
      slug: 'platform-1234abcd',
      currentUserRole: WorkspaceMemberRole.OWNER
    });
  });

  it('lists workspaces', async () => {
    const workspaces = [
      {
        workspace: Workspace.create({
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Platform',
        slug: 'platform-1234abcd',
        createdBy: user.id
        }),
        currentUserRole: WorkspaceMemberRole.COMMENTER
      }
    ];
    const controller = buildController({
      listWorkspaces: { execute: jest.fn().mockResolvedValue(workspaces) }
    });

    const response = await controller.listWorkspaces(user);

    expect(response).toEqual([
      {
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Platform',
        slug: 'platform-1234abcd',
        currentUserRole: WorkspaceMemberRole.COMMENTER
      }
    ]);
  });

  it('creates a project inside a workspace', async () => {
    const project = Project.create({
      id: '33333333-3333-4333-8333-333333333333',
      workspaceId: '22222222-2222-4222-8222-222222222222',
      name: 'Editor MVP',
      description: 'Workspace shell',
      createdBy: user.id
    });
    const controller = buildController({
      createProject: { execute: jest.fn().mockResolvedValue(project) }
    });

    const response = await controller.createProject(
      user,
      '22222222-2222-4222-8222-222222222222',
      { name: 'Editor MVP', description: 'Workspace shell' }
    );

    expect(response).toEqual({
      id: '33333333-3333-4333-8333-333333333333',
      workspaceId: '22222222-2222-4222-8222-222222222222',
      name: 'Editor MVP',
      description: 'Workspace shell',
      status: ProjectStatus.ACTIVE
    });
  });

  it('lists projects for a workspace', async () => {
    const projects = [
      Project.create({
        id: '33333333-3333-4333-8333-333333333333',
        workspaceId: '22222222-2222-4222-8222-222222222222',
        name: 'Editor MVP',
        createdBy: user.id
      })
    ];
    const controller = buildController({
      listProjects: { execute: jest.fn().mockResolvedValue(projects) }
    });

    const response = await controller.listProjects(
      user,
      '22222222-2222-4222-8222-222222222222'
    );

    expect(response).toEqual([
      {
        id: '33333333-3333-4333-8333-333333333333',
        workspaceId: '22222222-2222-4222-8222-222222222222',
        name: 'Editor MVP',
        description: null,
        status: ProjectStatus.ACTIVE
      }
    ]);
  });

  it('gets and updates workspace policy with audit recording', async () => {
    const policy = {
      getPolicy: jest.fn().mockResolvedValue({
        workspaceId: '22222222-2222-4222-8222-222222222222',
        allowShareLinks: true,
        allowExports: true,
        retentionDays: 365,
        ssoRequired: false
      }),
      updatePolicy: jest.fn().mockResolvedValue({
        workspaceId: '22222222-2222-4222-8222-222222222222',
        allowShareLinks: false,
        allowExports: true,
        retentionDays: 180,
        ssoRequired: true
      }),
      requireAdmin: jest.fn().mockResolvedValue(undefined)
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined), listForWorkspace: jest.fn() };
    const controller = buildController({ policy, audit });

    await expect(
      controller.getWorkspacePolicy(user, '22222222-2222-4222-8222-222222222222')
    ).resolves.toEqual(expect.objectContaining({ retentionDays: 365 }));
    await expect(
      controller.updateWorkspacePolicy(user, '22222222-2222-4222-8222-222222222222', {
        allowShareLinks: false,
        retentionDays: 180,
        ssoRequired: true
      })
    ).resolves.toEqual(expect.objectContaining({ allowShareLinks: false }));
    expect(policy.requireAdmin).toHaveBeenCalledWith(user, '22222222-2222-4222-8222-222222222222');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'workspace.policy_update' }));
  });

  it('lists audit events and returns enterprise identity rollout path', async () => {
    const audit = {
      record: jest.fn(),
      listForWorkspace: jest.fn().mockResolvedValue([
        {
          id: 'audit-1',
          workspaceId: '22222222-2222-4222-8222-222222222222',
          actorId: user.id,
          action: 'diagram.create',
          targetType: 'diagram',
          targetId: 'diagram-1',
          metadata: {},
          createdAt: '2026-01-01T00:00:00.000Z'
        }
      ])
    };
    const controller = buildController({ audit });

    await expect(
      controller.listAuditEvents(user, '22222222-2222-4222-8222-222222222222')
    ).resolves.toHaveLength(1);
    await expect(
      controller.getEnterpriseIdentityPath(user, '22222222-2222-4222-8222-222222222222')
    ).resolves.toEqual(
      expect.objectContaining({
        strategy: 'oidc',
        loginUrl: '/api/v1/auth/oidc/start'
      })
    );
  });
});
