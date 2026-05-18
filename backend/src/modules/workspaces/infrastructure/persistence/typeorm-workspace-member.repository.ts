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
      roleId: input.roleId
    });
    const saved = await this.repository.save(member);
    // Reload to get the relation
    const loaded = await this.repository.findOneOrFail({
      where: { id: saved.id },
      relations: ['role']
    });
    return WorkspaceMemberMapper.toDomain(loaded);
  }

  async listByWorkspaceId(workspaceId: string): Promise<WorkspaceMember[]> {
    const members = await this.repository.find({
      where: { workspaceId },
      relations: ['role'],
      order: { createdAt: 'ASC' }
    });
    return members.map((member) => WorkspaceMemberMapper.toDomain(member));
  }

  async findByWorkspaceIdAndUserId(workspaceId: string, userId: string): Promise<WorkspaceMember | null> {
    const member = await this.repository.findOne({
      where: { workspaceId, userId },
      relations: ['role']
    });
    return member === null ? null : WorkspaceMemberMapper.toDomain(member);
  }

  async updateRole(workspaceId: string, userId: string, roleId: string): Promise<WorkspaceMember> {
    await this.repository.update({ workspaceId, userId }, { roleId });
    const member = await this.repository.findOneOrFail({
      where: { workspaceId, userId },
      relations: ['role']
    });
    return WorkspaceMemberMapper.toDomain(member);
  }

  async removeByWorkspaceIdAndUserId(workspaceId: string, userId: string): Promise<void> {
    await this.repository.delete({ workspaceId, userId });
  }

  countByWorkspaceIdAndRole(workspaceId: string, roleId: string): Promise<number> {
    return this.repository.countBy({ workspaceId, roleId });
  }
}
