import { DiagramThemeConfig } from '@/features/diagram/types';

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  currentUserRole: WorkspaceRole;
}

export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'commenter' | 'viewer';

export interface WorkspaceMemberSummary {
  id: string;
  workspaceId: string;
  userId: string;
  email: string;
  displayName: string | null;
  role: WorkspaceRole;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSummary {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
}

export interface DiagramSummary {
  id: string;
  workspaceId: string;
  projectId: string;
  title: string;
  description: string | null;
  diagramType: 'flowchart' | 'sequence' | 'class' | 'erd' | 'gantt' | 'state' | 'mindmap' | 'timeline' | 'unknown';
  sourceCode: string;
  themeConfig: DiagramThemeConfig;
  updatedAtLabel: string;
}

export interface DiagramVersionSummary {
  id: string;
  diagramId: string;
  workspaceId: string;
  projectId: string;
  title: string;
  description: string | null;
  diagramType: DiagramSummary['diagramType'];
  sourceCode: string;
  themeConfig: DiagramThemeConfig;
  createdBy: string;
  createdAt: string;
}

export interface DiagramShareLinkSummary {
  id: string;
  diagramId: string;
  token?: string;
  url?: string;
  revokedAt: string | null;
  createdAt: string;
}

export interface MermaidImportBlockSummary {
  index: number;
  title: string;
  sourceCode: string;
}

export interface AuditEventSummary {
  id: string;
  workspaceId: string;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface WorkspacePolicySummary {
  workspaceId: string;
  allowShareLinks: boolean;
  allowExports: boolean;
  retentionDays: number;
  ssoRequired: boolean;
}

export interface EnterpriseIdentitySummary {
  workspaceId: string;
  strategy: 'oidc';
  status: 'specified';
  loginUrl: string;
  requiredClaims: string[];
}

export interface DiagramCommentSummary {
  id: string;
  diagramId: string;
  workspaceId: string;
  authorId: string;
  body: string;
  anchor: Record<string, unknown> | null;
  status: 'open' | 'resolved';
  createdAt: string;
  updatedAt: string;
}
