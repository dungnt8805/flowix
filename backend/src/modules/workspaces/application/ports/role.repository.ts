import { Role } from '../../domain/role';

export const ROLE_REPOSITORY = Symbol('ROLE_REPOSITORY');

export interface RoleRepository {
  findByNameAndWorkspaceId(name: string, workspaceId: string | null): Promise<Role | null>;
}
