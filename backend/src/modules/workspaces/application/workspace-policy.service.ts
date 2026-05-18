import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { canCreateProject } from '../domain/workspace-permissions';
import { WorkspacePolicyEntity } from '../infrastructure/persistence/workspace-policy.entity';
import {
  WORKSPACE_MEMBER_REPOSITORY,
  WorkspaceMemberRepository
} from './ports/workspace-member.repository';

export interface WorkspacePolicySummary {
  workspaceId: string;
  allowShareLinks: boolean;
  allowExports: boolean;
  retentionDays: number;
  ssoRequired: boolean;
}

@Injectable()
export class WorkspacePolicyService {
  constructor(
    @InjectRepository(WorkspacePolicyEntity)
    private readonly repository: Repository<WorkspacePolicyEntity>,
    @Inject(WORKSPACE_MEMBER_REPOSITORY)
    private readonly workspaceMemberRepository: WorkspaceMemberRepository
  ) {}

  async getPolicy(workspaceId: string): Promise<WorkspacePolicySummary> {
    const policy = await this.findOrCreate(workspaceId);
    return toSummary(policy);
  }

  async updatePolicy(
    user: AuthenticatedUser,
    workspaceId: string,
    patch: Partial<Omit<WorkspacePolicySummary, 'workspaceId'>>
  ): Promise<WorkspacePolicySummary> {
    await this.requireAdmin(user, workspaceId);
    const current = await this.findOrCreate(workspaceId);
    current.allowShareLinks = patch.allowShareLinks ?? current.allowShareLinks;
    current.allowExports = patch.allowExports ?? current.allowExports;
    current.retentionDays = normalizeRetentionDays(patch.retentionDays ?? current.retentionDays);
    current.ssoRequired = patch.ssoRequired ?? current.ssoRequired;
    return toSummary(await this.repository.save(current));
  }

  async requireShareLinksAllowed(workspaceId: string): Promise<void> {
    const policy = await this.findOrCreate(workspaceId);
    if (!policy.allowShareLinks) {
      throw new ForbiddenException('Workspace policy does not allow share links.');
    }
  }

  async requireExportsAllowed(workspaceId: string): Promise<void> {
    const policy = await this.findOrCreate(workspaceId);
    if (!policy.allowExports) {
      throw new ForbiddenException('Workspace policy does not allow exports.');
    }
  }

  async requireAdmin(user: AuthenticatedUser, workspaceId: string): Promise<void> {
    const membership = await this.workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, user.id);
    if (membership === null) {
      throw new NotFoundException('Workspace was not found.');
    }
    if (!canCreateProject(membership.role)) {
      throw new ForbiddenException('Workspace policy requires owner or admin access.');
    }
  }

  private async findOrCreate(workspaceId: string): Promise<WorkspacePolicyEntity> {
    const existing = await this.repository.findOneBy({ workspaceId });
    if (existing !== null) {
      return existing;
    }
    return this.repository.save(this.repository.create({ workspaceId }));
  }
}

function toSummary(policy: WorkspacePolicyEntity): WorkspacePolicySummary {
  return {
    workspaceId: policy.workspaceId,
    allowShareLinks: policy.allowShareLinks,
    allowExports: policy.allowExports,
    retentionDays: policy.retentionDays,
    ssoRequired: policy.ssoRequired
  };
}

function normalizeRetentionDays(value: number): number {
  if (!Number.isInteger(value) || value < 30 || value > 3650) {
    throw new ForbiddenException('Retention days must be an integer between 30 and 3650.');
  }
  return value;
}
