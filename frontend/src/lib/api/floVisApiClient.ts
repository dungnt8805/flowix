import {
  DiagramSummary,
  DiagramCommentSummary,
  DiagramShareLinkSummary,
  DiagramVersionSummary,
  EnterpriseIdentitySummary,
  AuditEventSummary,
  MermaidImportBlockSummary,
  ProjectSummary,
  WorkspaceMemberSummary,
  WorkspaceRole,
  WorkspacePolicySummary,
  WorkspaceSummary
} from '@/features/workspace/types';
import { DiagramThemeConfig } from '@/features/diagram/types';

export interface CreateWorkspacePayload {
  name: string;
}

export interface CreateProjectPayload {
  workspaceId: string;
  name: string;
  description?: string;
}

export interface CreateDiagramPayload {
  workspaceId: string;
  projectId: string;
  title: string;
  description?: string;
  sourceCode: string;
  diagramType?: DiagramSummary['diagramType'];
  themeConfig?: DiagramThemeConfig;
}

export interface ImportMermaidPayload {
  workspaceId: string;
  projectId: string;
  title: string;
  sourceCode: string;
}

export interface UpdateWorkspacePolicyPayload {
  workspaceId: string;
  allowShareLinks?: boolean;
  allowExports?: boolean;
  retentionDays?: number;
  ssoRequired?: boolean;
}

export interface AddWorkspaceMemberPayload {
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
}

export interface UpdateWorkspaceMemberRolePayload {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
}

export interface AuthUserSummary {
  id: string;
  email: string;
  displayName: string | null;
  emailVerifiedAt: string | null;
}

export interface AuthTokenSummary {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
}

export interface AuthSessionSummary {
  user: AuthUserSummary;
  tokens: AuthTokenSummary;
}

export interface RegisterPayload {
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

export interface UpdateDiagramPayload {
  diagramId: string;
  title?: string;
  description?: string | null;
  sourceCode?: string;
  diagramType?: DiagramSummary['diagramType'];
  themeConfig?: DiagramThemeConfig;
}

export interface CreateDiagramCommentPayload {
  diagramId: string;
  body: string;
  anchor?: Record<string, unknown>;
}

export interface AuthApi {
  register(payload: RegisterPayload): Promise<AuthSessionSummary>;
  login(payload: LoginPayload): Promise<AuthSessionSummary>;
  refreshSession(refreshToken: string): Promise<AuthSessionSummary>;
  logout(): Promise<void>;
  logoutAll(): Promise<void>;
  getCurrentUser(): Promise<AuthUserSummary>;
  forgotPassword(email: string): Promise<{ accepted: true; resetToken?: string }>;
  resetPassword(payload: ResetPasswordPayload): Promise<{ reset: true }>;
}

export interface WorkspaceProjectApi {
  getCurrentUser(): Promise<AuthUserSummary>;
  listWorkspaces(): Promise<WorkspaceSummary[]>;
  createWorkspace(payload: CreateWorkspacePayload): Promise<WorkspaceSummary>;
  listProjects(workspaceId: string): Promise<ProjectSummary[]>;
  createProject(payload: CreateProjectPayload): Promise<ProjectSummary>;
  listWorkspaceMembers(workspaceId: string): Promise<WorkspaceMemberSummary[]>;
  addWorkspaceMember(payload: AddWorkspaceMemberPayload): Promise<WorkspaceMemberSummary>;
  updateWorkspaceMemberRole(payload: UpdateWorkspaceMemberRolePayload): Promise<WorkspaceMemberSummary>;
  removeWorkspaceMember(workspaceId: string, userId: string): Promise<void>;
  listProjectDiagrams(projectId: string): Promise<DiagramSummary[]>;
  createDiagram(payload: CreateDiagramPayload): Promise<DiagramSummary>;
  importMermaid(payload: ImportMermaidPayload): Promise<DiagramSummary>;
  parseMarkdownMermaidBlocks(markdown: string): Promise<MermaidImportBlockSummary[]>;
  updateDiagram(payload: UpdateDiagramPayload): Promise<DiagramSummary>;
  listDiagramComments(diagramId: string): Promise<DiagramCommentSummary[]>;
  createDiagramComment(payload: CreateDiagramCommentPayload): Promise<DiagramCommentSummary>;
  resolveDiagramComment(diagramId: string, commentId: string): Promise<DiagramCommentSummary>;
  reopenDiagramComment(diagramId: string, commentId: string): Promise<DiagramCommentSummary>;
  listDiagramVersions(diagramId: string): Promise<DiagramVersionSummary[]>;
  restoreDiagramVersion(diagramId: string, versionId: string): Promise<DiagramSummary>;
  exportDiagramSource(diagramId: string): Promise<{ filename: string; sourceCode: string }>;
  requestDiagramSvgExport(diagramId: string): Promise<{
    status: 'not_available';
    format: 'svg';
    message: string;
  }>;
  createShareLink(diagramId: string): Promise<DiagramShareLinkSummary>;
  revokeShareLink(diagramId: string, linkId: string): Promise<void>;
  getSharedDiagram(token: string): Promise<DiagramSummary>;
  getWorkspacePolicy(workspaceId: string): Promise<WorkspacePolicySummary>;
  updateWorkspacePolicy(payload: UpdateWorkspacePolicyPayload): Promise<WorkspacePolicySummary>;
  listAuditEvents(workspaceId: string): Promise<AuditEventSummary[]>;
  getEnterpriseIdentity(workspaceId: string): Promise<EnterpriseIdentitySummary>;
  enforceRetention(workspaceId: string): Promise<{
    workspaceId: string;
    cutoff: string;
    deletedVersions: number;
    deletedAuditEvents: number;
  }>;
}

interface FloVisApiClientConfig {
  baseUrl: string;
  userId?: string;
  userEmail?: string;
  accessToken?: string;
  tokenStore?: AuthTokenStore;
}

interface ProjectResponse extends ProjectSummary {
  status: string;
}

type DiagramResponse = Omit<DiagramSummary, 'updatedAtLabel'>;

export class FloVisApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'FloVisApiError';
  }
}

export class FloVisApiClient implements WorkspaceProjectApi {
  private readonly baseUrl: string;

  constructor(private readonly config: FloVisApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
  }

  async register(payload: RegisterPayload): Promise<AuthSessionSummary> {
    const session = await this.publicRequest<AuthSessionSummary>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    this.config.tokenStore?.save(session.tokens);
    return session;
  }

  async login(payload: LoginPayload): Promise<AuthSessionSummary> {
    const session = await this.publicRequest<AuthSessionSummary>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    this.config.tokenStore?.save(session.tokens);
    return session;
  }

  async refreshSession(refreshToken: string): Promise<AuthSessionSummary> {
    const session = await this.publicRequest<AuthSessionSummary>('/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken })
    });
    this.config.tokenStore?.save(session.tokens);
    return session;
  }

  async logout(): Promise<void> {
    await this.request('/api/v1/auth/logout', { method: 'POST' });
    this.config.tokenStore?.clear();
  }

  async logoutAll(): Promise<void> {
    await this.request('/api/v1/auth/logout-all', { method: 'POST' });
    this.config.tokenStore?.clear();
  }

  getCurrentUser(): Promise<AuthUserSummary> {
    return this.request('/api/v1/auth/me');
  }

  forgotPassword(email: string): Promise<{ accepted: true; resetToken?: string }> {
    return this.publicRequest('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  resetPassword(payload: ResetPasswordPayload): Promise<{ reset: true }> {
    return this.publicRequest('/api/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  listWorkspaces(): Promise<WorkspaceSummary[]> {
    return this.request<WorkspaceSummary[]>('/api/v1/workspaces');
  }

  createWorkspace(payload: CreateWorkspacePayload): Promise<WorkspaceSummary> {
    return this.request<WorkspaceSummary>('/api/v1/workspaces', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async listProjects(workspaceId: string): Promise<ProjectSummary[]> {
    const projects = await this.request<ProjectResponse[]>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/projects`
    );
    return projects.map(toProjectSummary);
  }

  async createProject(payload: CreateProjectPayload): Promise<ProjectSummary> {
    const project = await this.request<ProjectResponse>(
      `/api/v1/workspaces/${encodeURIComponent(payload.workspaceId)}/projects`,
      {
        method: 'POST',
        body: JSON.stringify({
          name: payload.name,
          description: payload.description
        })
      }
    );
    return toProjectSummary(project);
  }

  listWorkspaceMembers(workspaceId: string): Promise<WorkspaceMemberSummary[]> {
    return this.request(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/members`);
  }

  addWorkspaceMember(payload: AddWorkspaceMemberPayload): Promise<WorkspaceMemberSummary> {
    return this.request(`/api/v1/workspaces/${encodeURIComponent(payload.workspaceId)}/members`, {
      method: 'POST',
      body: JSON.stringify({
        email: payload.email,
        role: payload.role
      })
    });
  }

  updateWorkspaceMemberRole(payload: UpdateWorkspaceMemberRolePayload): Promise<WorkspaceMemberSummary> {
    return this.request(
      `/api/v1/workspaces/${encodeURIComponent(payload.workspaceId)}/members/${encodeURIComponent(payload.userId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ role: payload.role })
      }
    );
  }

  async removeWorkspaceMember(workspaceId: string, userId: string): Promise<void> {
    await this.request(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(userId)}`, {
      method: 'DELETE'
    });
  }

  async listProjectDiagrams(projectId: string): Promise<DiagramSummary[]> {
    const diagrams = await this.request<DiagramResponse[]>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/diagrams`
    );
    return diagrams.map(toDiagramSummary);
  }

  async createDiagram(payload: CreateDiagramPayload): Promise<DiagramSummary> {
    const diagram = await this.request<DiagramResponse>('/api/v1/diagrams', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return toDiagramSummary(diagram);
  }

  async importMermaid(payload: ImportMermaidPayload): Promise<DiagramSummary> {
    const diagram = await this.request<DiagramResponse>('/api/v1/diagrams/import/mmd', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return toDiagramSummary(diagram);
  }

  parseMarkdownMermaidBlocks(markdown: string): Promise<MermaidImportBlockSummary[]> {
    return this.request('/api/v1/diagrams/import/markdown-blocks', {
      method: 'POST',
      body: JSON.stringify({ markdown })
    });
  }

  async updateDiagram(payload: UpdateDiagramPayload): Promise<DiagramSummary> {
    const diagram = await this.request<DiagramResponse>(
      `/api/v1/diagrams/${encodeURIComponent(payload.diagramId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          title: payload.title,
          description: payload.description,
          sourceCode: payload.sourceCode,
          diagramType: payload.diagramType,
          themeConfig: payload.themeConfig
        })
      }
    );
    return toDiagramSummary(diagram);
  }

  listDiagramComments(diagramId: string): Promise<DiagramCommentSummary[]> {
    return this.request<DiagramCommentSummary[]>(
      `/api/v1/diagrams/${encodeURIComponent(diagramId)}/comments`
    );
  }

  createDiagramComment(payload: CreateDiagramCommentPayload): Promise<DiagramCommentSummary> {
    return this.request<DiagramCommentSummary>(
      `/api/v1/diagrams/${encodeURIComponent(payload.diagramId)}/comments`,
      {
        method: 'POST',
        body: JSON.stringify({
          body: payload.body,
          anchor: payload.anchor
        })
      }
    );
  }

  resolveDiagramComment(diagramId: string, commentId: string): Promise<DiagramCommentSummary> {
    return this.request<DiagramCommentSummary>(
      `/api/v1/diagrams/${encodeURIComponent(diagramId)}/comments/${encodeURIComponent(commentId)}/resolve`,
      {
        method: 'POST'
      }
    );
  }

  reopenDiagramComment(diagramId: string, commentId: string): Promise<DiagramCommentSummary> {
    return this.request<DiagramCommentSummary>(
      `/api/v1/diagrams/${encodeURIComponent(diagramId)}/comments/${encodeURIComponent(commentId)}/reopen`,
      {
        method: 'POST'
      }
    );
  }

  listDiagramVersions(diagramId: string): Promise<DiagramVersionSummary[]> {
    return this.request<DiagramVersionSummary[]>(
      `/api/v1/diagrams/${encodeURIComponent(diagramId)}/versions`
    );
  }

  async restoreDiagramVersion(diagramId: string, versionId: string): Promise<DiagramSummary> {
    const diagram = await this.request<DiagramResponse>(
      `/api/v1/diagrams/${encodeURIComponent(diagramId)}/versions/${encodeURIComponent(versionId)}/restore`,
      {
        method: 'POST'
      }
    );
    return toDiagramSummary(diagram);
  }

  async exportDiagramSource(diagramId: string): Promise<{ filename: string; sourceCode: string }> {
    const response = await this.rawRequest(
      `/api/v1/diagrams/${encodeURIComponent(diagramId)}/export/source`
    );
    return {
      filename: readFilename(response.headers.get('content-disposition')) ?? 'diagram.mmd',
      sourceCode: await response.text()
    };
  }

  requestDiagramSvgExport(diagramId: string): Promise<{
    status: 'not_available';
    format: 'svg';
    message: string;
  }> {
    return this.request(`/api/v1/diagrams/${encodeURIComponent(diagramId)}/export/svg`);
  }

  createShareLink(diagramId: string): Promise<DiagramShareLinkSummary> {
    return this.request(`/api/v1/diagrams/${encodeURIComponent(diagramId)}/share-links`, {
      method: 'POST'
    });
  }

  async revokeShareLink(diagramId: string, linkId: string): Promise<void> {
    await this.request(`/api/v1/diagrams/${encodeURIComponent(diagramId)}/share-links/${encodeURIComponent(linkId)}`, {
      method: 'DELETE'
    });
  }

  async getSharedDiagram(token: string): Promise<DiagramSummary> {
    const diagram = await this.publicRequest<DiagramResponse>(`/api/v1/diagrams/shared/${encodeURIComponent(token)}`);
    return toDiagramSummary(diagram);
  }

  getWorkspacePolicy(workspaceId: string): Promise<WorkspacePolicySummary> {
    return this.request(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/policies`);
  }

  updateWorkspacePolicy(payload: UpdateWorkspacePolicyPayload): Promise<WorkspacePolicySummary> {
    return this.request(`/api/v1/workspaces/${encodeURIComponent(payload.workspaceId)}/policies`, {
      method: 'PATCH',
      body: JSON.stringify({
        allowShareLinks: payload.allowShareLinks,
        allowExports: payload.allowExports,
        retentionDays: payload.retentionDays,
        ssoRequired: payload.ssoRequired
      })
    });
  }

  listAuditEvents(workspaceId: string): Promise<AuditEventSummary[]> {
    return this.request(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/audit-events`);
  }

  getEnterpriseIdentity(workspaceId: string): Promise<EnterpriseIdentitySummary> {
    return this.request(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/enterprise-identity`);
  }

  enforceRetention(workspaceId: string): Promise<{
    workspaceId: string;
    cutoff: string;
    deletedVersions: number;
    deletedAuditEvents: number;
  }> {
    return this.request(`/api/v1/diagrams/workspaces/${encodeURIComponent(workspaceId)}/retention/enforce`, {
      method: 'POST'
    });
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.rawRequest(path, init);

    return response.json() as Promise<T>;
  }

  private async rawRequest(path: string, init: RequestInit = {}): Promise<Response> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeaders(),
        ...init.headers
      }
    });

    if (!response.ok) {
      throw new FloVisApiError(await readErrorMessage(response), response.status);
    }

    return response;
  }

  private async publicRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
    const hasInit = Object.keys(init).length > 0;
    const response = hasInit
      ? await fetch(`${this.baseUrl}${path}`, withJsonHeaders(init))
      : await fetch(`${this.baseUrl}${path}`);

    if (!response.ok) {
      throw new FloVisApiError(await readErrorMessage(response), response.status);
    }

    return response.json() as Promise<T>;
  }

  private authHeaders(): Record<string, string> {
    const accessToken = this.config.accessToken ?? this.config.tokenStore?.load()?.accessToken;
    if (accessToken !== undefined && accessToken.length > 0) {
      return { Authorization: `Bearer ${accessToken}` };
    }

    if (this.config.userId !== undefined && this.config.userEmail !== undefined) {
      return {
        'x-user-id': this.config.userId,
        'x-user-email': this.config.userEmail
      };
    }

    return {};
  }
}

function withJsonHeaders(init: RequestInit): RequestInit {
  if (init.body === undefined) {
    return init;
  }

  return {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers
    }
  };
}

export function createBrowserFloVisApiClient(): WorkspaceProjectApi | null {
  const baseUrl = process.env.NEXT_PUBLIC_FLO_VIS_API_BASE_URL;

  if (baseUrl === undefined || baseUrl.trim().length === 0) {
    return null;
  }

  return new FloVisApiClient({
    baseUrl,
    tokenStore: createBrowserAuthTokenStore(),
    userId:
      process.env.NEXT_PUBLIC_FLO_VIS_DEMO_USER_ID ?? '11111111-1111-4111-8111-111111111111',
    userEmail: process.env.NEXT_PUBLIC_FLO_VIS_DEMO_USER_EMAIL ?? 'demo@flo-vis.local'
  });
}

export interface AuthTokenStore {
  load(): AuthTokenSummary | null;
  save(tokens: AuthTokenSummary): void;
  clear(): void;
}

const AUTH_TOKEN_STORAGE_KEY = 'flo_vis_auth_tokens';

export function createBrowserAuthTokenStore(): AuthTokenStore | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return {
    load() {
      const rawValue = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
      if (rawValue === null) {
        return null;
      }

      try {
        return JSON.parse(rawValue) as AuthTokenSummary;
      } catch {
        window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        return null;
      }
    },
    save(tokens) {
      window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, JSON.stringify(tokens));
    },
    clear() {
      window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    }
  };
}

async function readErrorMessage(response: Response): Promise<string> {
  const fallback = `Flo Vis API request failed with status ${response.status}`;

  try {
    const payload = (await response.json()) as { message?: unknown };
    if (typeof payload.message === 'string') {
      return payload.message;
    }
    if (Array.isArray(payload.message)) {
      return payload.message.join(', ');
    }
    return fallback;
  } catch {
    return fallback;
  }
}

function toProjectSummary(project: ProjectResponse): ProjectSummary {
  return {
    id: project.id,
    workspaceId: project.workspaceId,
    name: project.name,
    description: project.description
  };
}

function toDiagramSummary(diagram: DiagramResponse): DiagramSummary {
  return {
    ...diagram,
    themeConfig: diagram.themeConfig ?? { theme: 'default' },
    updatedAtLabel: 'Synced'
  };
}

function readFilename(contentDisposition: string | null): string | null {
  if (contentDisposition === null) {
    return null;
  }

  const match = /filename="([^"]+)"/.exec(contentDisposition);
  return match?.[1] ?? null;
}
