import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { WorkspaceMemberRole } from '../domain/workspace-member-role';
import { WorkspacePolicyEntity } from '../infrastructure/persistence/workspace-policy.entity';
import { WorkspacePolicyService } from './workspace-policy.service';

describe('WorkspacePolicyService', () => {
  const user = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'owner@example.com',
    displayName: 'Owner'
  };
  const workspaceId = '22222222-2222-4222-8222-222222222222';

  function buildService(existingPolicy: WorkspacePolicyEntity | null = null, role: WorkspaceMemberRole | null = WorkspaceMemberRole.OWNER): {
    repository: {
      findOneBy: jest.Mock;
      create: jest.Mock;
      save: jest.Mock;
    };
    service: WorkspacePolicyService;
  } {
    const defaultPolicy = {
      workspaceId,
      allowShareLinks: true,
      allowExports: true,
      retentionDays: 365,
      ssoRequired: false
    } as WorkspacePolicyEntity;
    const repository = {
      findOneBy: jest.fn().mockResolvedValue(existingPolicy),
      create: jest.fn().mockReturnValue(defaultPolicy),
      save: jest.fn((policy: WorkspacePolicyEntity) => Promise.resolve(policy))
    };
    const workspaceMemberRepository = {
      findByWorkspaceIdAndUserId: jest.fn().mockResolvedValue(
        role === null
          ? null
          : {
              id: 'member-1',
              workspaceId,
              userId: user.id,
              role,
              createdAt: new Date(),
              updatedAt: new Date()
            }
      )
    };

    return {
      repository,
      service: new WorkspacePolicyService(repository as never, workspaceMemberRepository as never)
    };
  }

  it('creates a default policy when no policy exists', async () => {
    const { repository, service } = buildService();

    await expect(service.getPolicy(workspaceId)).resolves.toEqual({
      workspaceId,
      allowShareLinks: true,
      allowExports: true,
      retentionDays: 365,
      ssoRequired: false
    });
    expect(repository.create).toHaveBeenCalledWith({ workspaceId });
    expect(repository.save).toHaveBeenCalled();
  });

  it('updates policy settings for admins', async () => {
    const { service } = buildService({
      workspaceId,
      allowShareLinks: true,
      allowExports: true,
      retentionDays: 365,
      ssoRequired: false
    } as WorkspacePolicyEntity);

    await expect(
      service.updatePolicy(user, workspaceId, {
        allowShareLinks: false,
        allowExports: false,
        retentionDays: 180,
        ssoRequired: true
      })
    ).resolves.toEqual({
      workspaceId,
      allowShareLinks: false,
      allowExports: false,
      retentionDays: 180,
      ssoRequired: true
    });
  });

  it('rejects disabled share/export policies and invalid retention', async () => {
    const { service } = buildService({
      workspaceId,
      allowShareLinks: false,
      allowExports: false,
      retentionDays: 365,
      ssoRequired: false
    } as WorkspacePolicyEntity);

    await expect(service.requireShareLinksAllowed(workspaceId)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.requireExportsAllowed(workspaceId)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.updatePolicy(user, workspaceId, { retentionDays: 10 })).rejects.toBeInstanceOf(
      ForbiddenException
    );
  });

  it('requires workspace membership and admin-capable roles', async () => {
    await expect(buildService(null, null).service.requireAdmin(user, workspaceId)).rejects.toBeInstanceOf(
      NotFoundException
    );
    await expect(
      buildService(null, WorkspaceMemberRole.VIEWER).service.requireAdmin(user, workspaceId)
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
