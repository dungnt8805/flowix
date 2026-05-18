import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { RoleRepository } from '../../application/ports/role.repository';
import { Role } from '../../domain/role';
import { RoleEntity } from './role.entity';

@Injectable()
export class TypeOrmRoleRepository implements RoleRepository {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly repository: Repository<RoleEntity>
  ) {}

  async findByNameAndWorkspaceId(name: string, workspaceId: string | null): Promise<Role | null> {
    const entity = await this.repository.findOne({ where: { name, workspaceId: workspaceId === null ? IsNull() : workspaceId } });
    if (!entity) return null;
    return new Role({
      id: entity.id,
      workspaceId: entity.workspaceId,
      name: entity.name,
      permissions: entity.permissions,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    });
  }
}
