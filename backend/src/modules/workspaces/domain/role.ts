import { Permission } from './permission';

export class Role {
  id: string;
  workspaceId: string | null;
  name: string;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;

  constructor(props: {
    id: string;
    workspaceId: string | null;
    name: string;
    permissions: Permission[];
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = props.id;
    this.workspaceId = props.workspaceId;
    this.name = props.name;
    this.permissions = props.permissions;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  hasPermission(permission: Permission): boolean {
    return this.permissions.includes(permission);
  }
}
