import { WorkspaceMemberRole } from './workspace-member-role';

export function canCreateProject(role: WorkspaceMemberRole): boolean {
  return role === WorkspaceMemberRole.OWNER || role === WorkspaceMemberRole.ADMIN;
}

export function canCreateDiagram(role: WorkspaceMemberRole): boolean {
  return (
    role === WorkspaceMemberRole.OWNER ||
    role === WorkspaceMemberRole.ADMIN ||
    role === WorkspaceMemberRole.EDITOR
  );
}

export function canUpdateDiagram(role: WorkspaceMemberRole): boolean {
  return canCreateDiagram(role);
}

export function canCommentOnDiagram(role: WorkspaceMemberRole): boolean {
  return (
    role === WorkspaceMemberRole.OWNER ||
    role === WorkspaceMemberRole.ADMIN ||
    role === WorkspaceMemberRole.EDITOR ||
    role === WorkspaceMemberRole.COMMENTER
  );
}

export function canViewDiagram(role: WorkspaceMemberRole): boolean {
  return (
    role === WorkspaceMemberRole.OWNER ||
    role === WorkspaceMemberRole.ADMIN ||
    role === WorkspaceMemberRole.EDITOR ||
    role === WorkspaceMemberRole.COMMENTER ||
    role === WorkspaceMemberRole.VIEWER
  );
}
