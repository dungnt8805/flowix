import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateWorkspaceMemberRecord,
  WorkspaceMemberRepository
} from '../../application/ports/workspace-member.repository';
import { WorkspaceMember } from '../../domain/workspace-member';
import { WorkspaceMemberEntity } from './workspace-member.entity';
import { WorkspaceMemberMapper } from './workspace-member.mapper';

@Injectable()
export class TypeOrmWorkspaceMemberRepository implements WorkspaceMemberRepository {
  constructor(
    @InjectRepository(WorkspaceMemberEntity)
    private readonly repository: Repository<WorkspaceMemberEntity>
  ) {}

  async addMember(input: CreateWorkspaceMemberRecord): Promise<WorkspaceMember> {
    const member = this.repository.create({
      workspaceId: input.workspaceId,
      userId: input.userId,
      role: input.role
    });
    const saved = await this.repository.save(member);
    return WorkspaceMemberMapper.toDomain(saved);
  }

  async listByWorkspaceId(workspaceId: string): Promise<WorkspaceMember[]> {
    const members = await this.repository.find({
      where: { workspaceId },
      order: { createdAt: 'ASC' }
    });
    return members.map((member) => WorkspaceMemberMapper.toDomain(member));
  }

  async findByWorkspaceIdAndUserId(workspaceId: string, userId: string): Promise<WorkspaceMember | null> {
    const member = await this.repository.findOneBy({ workspaceId, userId });
    return member === null ? null : WorkspaceMemberMapper.toDomain(member);
  }

  async updateRole(workspaceId: string, userId: string, role: WorkspaceMember['role']): Promise<WorkspaceMember> {
    await this.repository.update({ workspaceId, userId }, { role });
    const member = await this.repository.findOneByOrFail({ workspaceId, userId });
    return WorkspaceMemberMapper.toDomain(member);
  }

  async removeByWorkspaceIdAndUserId(workspaceId: string, userId: string): Promise<void> {
    await this.repository.delete({ workspaceId, userId });
  }

  countByWorkspaceIdAndRole(workspaceId: string, role: WorkspaceMember['role']): Promise<number> {
    return this.repository.countBy({ workspaceId, role });
  }
}
