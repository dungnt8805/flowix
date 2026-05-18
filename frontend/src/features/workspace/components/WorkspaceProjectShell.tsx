'use client';

import { FormEvent, useEffect, useState } from 'react';
import { DiagramDraft } from '@/features/diagram/types';
import { DiagramEditorScreen } from '@/features/diagram/components/DiagramEditorScreen';
import { diagramTemplates, getDiagramTemplate } from '@/features/diagram/templates';
import { MermaidPreview } from '@/features/renderer/components/MermaidPreview';
import {
  createBrowserAuthTokenStore,
  createBrowserFloVisApiClient,
  WorkspaceProjectApi,
  AuthUserSummary
} from '@/lib/api/floVisApiClient';
import {
  DiagramCommentSummary,
  DiagramShareLinkSummary,
  DiagramSummary,
  DiagramVersionSummary,
  AuditEventSummary,
  EnterpriseIdentitySummary,
  MermaidImportBlockSummary,
  ProjectSummary,
  WorkspaceMemberSummary,
  WorkspaceRole,
  WorkspacePolicySummary,
  WorkspaceSummary
} from '../types';

const initialWorkspaces: WorkspaceSummary[] = [
  {
    id: 'workspace-platform',
    name: 'Platform Architecture',
    slug: 'platform-architecture',
    currentUserRole: 'owner'
  },
  {
    id: 'workspace-docs',
    name: 'Documentation Systems',
    slug: 'documentation-systems',
    currentUserRole: 'viewer'
  }
];

const initialProjects: ProjectSummary[] = [
  {
    id: 'project-chat',
    workspaceId: 'workspace-platform',
    name: 'Chat Project',
    description: 'System design, flows, and release diagrams'
  },
  {
    id: 'project-onboarding',
    workspaceId: 'workspace-platform',
    name: 'Onboarding Flows',
    description: 'User journeys and setup paths'
  }
];

const initialDiagrams: DiagramSummary[] = [
  {
    id: 'diagram-system-context',
    workspaceId: 'workspace-platform',
    projectId: 'project-chat',
    title: 'System Context',
    description: 'High-level product, API, database, and renderer boundaries',
    diagramType: 'flowchart',
    themeConfig: { theme: 'default' },
    sourceCode: `flowchart LR
  User[User] --> Web[Next.js Frontend]
  Web --> API[NestJS API]
  API --> DB[(PostgreSQL)]
  API --> Renderer[Sandboxed Mermaid Renderer]`,
    updatedAtLabel: 'Today'
  },
  {
    id: 'diagram-auth-flow',
    workspaceId: 'workspace-platform',
    projectId: 'project-chat',
    title: 'Auth Request Flow',
    description: 'Temporary header-auth path before JWT integration',
    diagramType: 'sequence',
    themeConfig: { theme: 'default' },
    sourceCode: `sequenceDiagram
  participant UI as Frontend
  participant API as NestJS API
  UI->>API: x-user-id + x-user-email
  API->>API: HeaderAuthGuard
  API-->>UI: Workspace-scoped response`,
    updatedAtLabel: 'Today'
  }
];

interface WorkspaceProjectShellProps {
  apiClient?: WorkspaceProjectApi | null;
}

export function WorkspaceProjectShell({
  apiClient: apiClientProp
}: WorkspaceProjectShellProps): React.ReactElement {
  const [apiClient] = useState<WorkspaceProjectApi | null>(
    () => apiClientProp ?? createBrowserFloVisApiClient()
  );
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUserSummary | null>(null);

  useEffect(() => {
    if (apiClient === null) {
      setIsLoggedIn(true);
      return;
    }

    const tokenStore = createBrowserAuthTokenStore();
    const hasToken = !!tokenStore?.load()?.accessToken;
    setIsLoggedIn(hasToken);

    if (hasToken) {
      apiClient
        .getCurrentUser()
        .then((user: AuthUserSummary) => {
          setCurrentUser(user);
        })
        .catch(() => {
          setCurrentUser(null);
        });
    } else {
      setCurrentUser(null);
    }
  }, [apiClient]);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>(() =>
    apiClient === null ? initialWorkspaces : []
  );
  const [projects, setProjects] = useState<ProjectSummary[]>(() =>
    apiClient === null ? initialProjects : []
  );
  const [diagrams, setDiagrams] = useState<DiagramSummary[]>(() =>
    apiClient === null ? initialDiagrams : []
  );
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(
    apiClient === null ? initialWorkspaces[0].id : ''
  );
  const [selectedProjectId, setSelectedProjectId] = useState(
    apiClient === null ? initialProjects[0].id : ''
  );
  const [selectedDiagramId, setSelectedDiagramId] = useState(
    apiClient === null ? initialDiagrams[0].id : ''
  );
  const [workspaceName, setWorkspaceName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [templateId, setTemplateId] = useState(diagramTemplates[0].id);
  const [diagramVersions, setDiagramVersions] = useState<DiagramVersionSummary[]>([]);
  const [diagramComments, setDiagramComments] = useState<DiagramCommentSummary[]>([]);
  const [shareLinks, setShareLinks] = useState<DiagramShareLinkSummary[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [commentMessage, setCommentMessage] = useState<string | null>(null);
  const [presentationMode, setPresentationMode] = useState(false);
  const [importSource, setImportSource] = useState('');
  const [markdownSource, setMarkdownSource] = useState('');
  const [markdownBlocks, setMarkdownBlocks] = useState<MermaidImportBlockSummary[]>([]);
  const [workspacePolicy, setWorkspacePolicy] = useState<WorkspacePolicySummary | null>(null);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMemberSummary[]>([]);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<WorkspaceRole>('viewer');
  const [auditEvents, setAuditEvents] = useState<AuditEventSummary[]>([]);
  const [enterpriseIdentity, setEnterpriseIdentity] = useState<EnterpriseIdentitySummary | null>(null);
  const [governanceMessage, setGovernanceMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [liveSourceCode, setLiveSourceCode] = useState('');

  const workspaceProjects = projects.filter((project) => project.workspaceId === selectedWorkspaceId);
  const projectDiagrams = diagrams.filter((diagram) => diagram.projectId === selectedProjectId);
  const selectedWorkspace = workspaces.find((workspace) => workspace.id === selectedWorkspaceId);
  const selectedProject = projects.find((project) => project.id === selectedProjectId);
  const selectedDiagram = diagrams.find((diagram) => diagram.id === selectedDiagramId);

  useEffect(() => {
    setLiveSourceCode(selectedDiagram?.sourceCode ?? '');
  }, [selectedDiagramId, selectedDiagram?.sourceCode]);
  const currentWorkspaceRole = selectedWorkspace?.currentUserRole;
  const canCreateProjects = currentWorkspaceRole === undefined ? false : canCreateProject(currentWorkspaceRole);
  const canEditDiagram = selectedWorkspace === undefined ? false : canEdit(selectedWorkspace.currentUserRole);
  const canCommentDiagram =
    selectedWorkspace === undefined ? false : canComment(selectedWorkspace.currentUserRole);
  const canManageWorkspace = currentWorkspaceRole === undefined ? false : canAdministerWorkspace(currentWorkspaceRole);

  function handleLogout(): void {
    createBrowserAuthTokenStore()?.clear();
    window.location.href = '/login';
  }

  useEffect(() => {
    if (apiClient === null) {
      return;
    }

    let cancelled = false;
    setIsSyncing(true);
    setSyncError(null);

    apiClient
      .listWorkspaces()
      .then((nextWorkspaces) => {
        if (cancelled) {
          return;
        }

        const nextWorkspaceId = nextWorkspaces[0]?.id ?? '';
        setWorkspaces(nextWorkspaces);
        setSelectedWorkspaceId(nextWorkspaceId);
        setSelectedProjectId('');
        setSelectedDiagramId('');
      })
      .catch(() => {
        if (!cancelled) {
          setSyncError('Could not load workspaces from the API.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsSyncing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiClient]);

  useEffect(() => {
    if (apiClient === null || selectedWorkspaceId.length === 0) {
      return;
    }

    let cancelled = false;
    setIsSyncing(true);
    setSyncError(null);

    apiClient
      .listProjects(selectedWorkspaceId)
      .then((nextProjects) => {
        if (cancelled) {
          return;
        }

        const nextProjectId = nextProjects[0]?.id ?? '';
        setProjects((current) => [
          ...nextProjects,
          ...current.filter((project) => project.workspaceId !== selectedWorkspaceId)
        ]);
        setSelectedProjectId(nextProjectId);
        setSelectedDiagramId('');
      })
      .catch(() => {
        if (!cancelled) {
          setSyncError('Could not load projects from the API.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsSyncing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiClient, selectedWorkspaceId]);

  useEffect(() => {
    if (selectedWorkspaceId.length === 0) {
      setWorkspacePolicy(null);
      setAuditEvents([]);
      setEnterpriseIdentity(null);
      return;
    }

    if (apiClient === null) {
      setWorkspacePolicy({
        workspaceId: selectedWorkspaceId,
        allowShareLinks: true,
        allowExports: true,
        retentionDays: 365,
        ssoRequired: false
      });
      setAuditEvents([]);
      setEnterpriseIdentity({
        workspaceId: selectedWorkspaceId,
        strategy: 'oidc',
        status: 'specified',
        loginUrl: '/api/v1/auth/oidc/start',
        requiredClaims: ['sub', 'email', 'workspace_id']
      });
      return;
    }

    let cancelled = false;
    Promise.all([
      apiClient.getWorkspacePolicy(selectedWorkspaceId),
      apiClient.listAuditEvents(selectedWorkspaceId),
      apiClient.getEnterpriseIdentity(selectedWorkspaceId),
      apiClient.listWorkspaceMembers(selectedWorkspaceId)
    ])
      .then(([policy, events, identity, members]) => {
        if (!cancelled) {
          setWorkspacePolicy(policy);
          setAuditEvents(events);
          setEnterpriseIdentity(identity);
          setWorkspaceMembers(members);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGovernanceMessage('Governance data requires workspace admin access.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiClient, selectedWorkspaceId]);

  useEffect(() => {
    if (apiClient === null || selectedProjectId.length === 0) {
      return;
    }

    let cancelled = false;
    setIsSyncing(true);
    setSyncError(null);

    apiClient
      .listProjectDiagrams(selectedProjectId)
      .then((nextDiagrams) => {
        if (cancelled) {
          return;
        }

        setDiagrams((current) => [
          ...nextDiagrams,
          ...current.filter((diagram) => diagram.projectId !== selectedProjectId)
        ]);
        setSelectedDiagramId(nextDiagrams[0]?.id ?? '');
      })
      .catch(() => {
        if (!cancelled) {
          setSyncError('Could not load diagrams from the API.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsSyncing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiClient, selectedProjectId]);

  useEffect(() => {
    if (selectedDiagram === undefined) {
      setDiagramVersions([]);
      setDiagramComments([]);
      return;
    }

    if (apiClient === null) {
      setDiagramVersions([
        {
          id: `${selectedDiagram.id}-local-current`,
          diagramId: selectedDiagram.id,
          workspaceId: selectedDiagram.workspaceId,
          projectId: selectedDiagram.projectId,
          title: selectedDiagram.title,
          description: selectedDiagram.description,
          diagramType: selectedDiagram.diagramType,
          themeConfig: selectedDiagram.themeConfig,
          sourceCode: selectedDiagram.sourceCode,
          createdBy: 'local-user',
          createdAt: new Date().toISOString()
        }
      ]);
      setDiagramComments([]);
      return;
    }

    let cancelled = false;
    Promise.all([
      apiClient.listDiagramVersions(selectedDiagram.id),
      apiClient.listDiagramComments(selectedDiagram.id)
    ])
      .then(([versions, comments]) => {
        if (!cancelled) {
          setDiagramVersions(versions);
          setDiagramComments(comments);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSyncError('Could not load diagram activity.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiClient, selectedDiagram]);

  async function createWorkspace(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const name = workspaceName.trim();

    if (name.length === 0) {
      return;
    }

    if (apiClient !== null && !isLoggedIn) {
      setSyncError('You must be signed in to create workspaces.');
      return;
    }

    try {
      setSyncError(null);
      const workspace =
        apiClient === null
          ? {
              id: `workspace-${Date.now()}`,
              name,
              slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
              currentUserRole: 'owner' as const
            }
          : await apiClient.createWorkspace({ name });

      setWorkspaces((current) => [workspace, ...current]);
      setSelectedWorkspaceId(workspace.id);
      setSelectedProjectId('');
      setSelectedDiagramId('');
      setWorkspaceName('');
    } catch {
      setSyncError('Could not create workspace.');
    }
  }

  async function createProject(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const name = projectName.trim();

    if (name.length === 0 || selectedWorkspaceId.length === 0 || !canCreateProjects) {
      return;
    }

    if (apiClient !== null && !isLoggedIn) {
      setSyncError('You must be signed in to create projects.');
      return;
    }

    try {
      setSyncError(null);
      const project =
        apiClient === null
          ? {
              id: `project-${Date.now()}`,
              workspaceId: selectedWorkspaceId,
              name,
              description: null
            }
          : await apiClient.createProject({
              workspaceId: selectedWorkspaceId,
              name
            });

      setProjects((current) => [project, ...current]);
      setSelectedProjectId(project.id);
      setSelectedDiagramId('');
      setProjectName('');
    } catch {
      setSyncError('Could not create project.');
    }
  }

  async function createDiagram(): Promise<void> {
    if (selectedWorkspaceId.length === 0 || selectedProjectId.length === 0) {
      return;
    }

    const nextIndex = diagrams.filter((diagram) => diagram.projectId === selectedProjectId).length + 1;
    const template = getDiagramTemplate(templateId);
    const draft = {
      workspaceId: selectedWorkspaceId,
      projectId: selectedProjectId,
      title: `${template.name} ${nextIndex}`,
      description: template.description,
      diagramType: template.diagramType,
      themeConfig: { theme: 'default' as const },
      sourceCode: template.sourceCode
    };

    try {
      setSyncError(null);
      const diagram: DiagramSummary =
        apiClient === null
          ? {
              ...draft,
              id: `diagram-${Date.now()}`,
              updatedAtLabel: 'Just now'
            }
          : await apiClient.createDiagram(draft);

      setDiagrams((current) => [diagram, ...current]);
      setSelectedDiagramId(diagram.id);
    } catch {
      setSyncError('Could not create diagram.');
    }
  }

  async function importMermaidSource(): Promise<void> {
    if (selectedWorkspaceId.length === 0 || selectedProjectId.length === 0 || !canEditDiagram) {
      return;
    }

    const sourceCode = importSource.trim();
    if (sourceCode.length === 0) {
      return;
    }

    try {
      setSyncError(null);
      const title = `Imported diagram ${projectDiagrams.length + 1}`;
      const diagram =
        apiClient === null
          ? {
              id: `diagram-import-${Date.now()}`,
              workspaceId: selectedWorkspaceId,
              projectId: selectedProjectId,
              title,
              description: 'Imported Mermaid source',
              diagramType: inferDiagramType(sourceCode),
              themeConfig: { theme: 'default' as const },
              sourceCode,
              updatedAtLabel: 'Imported locally'
            }
          : await apiClient.importMermaid({
              workspaceId: selectedWorkspaceId,
              projectId: selectedProjectId,
              title,
              sourceCode
            });

      setDiagrams((current) => [diagram, ...current]);
      setSelectedDiagramId(diagram.id);
      setImportSource('');
    } catch {
      setSyncError('Could not import Mermaid source.');
    }
  }

  async function parseMarkdownSource(): Promise<void> {
    const markdown = markdownSource.trim();
    if (markdown.length === 0) {
      return;
    }

    try {
      const blocks =
        apiClient === null
          ? parseLocalMarkdownBlocks(markdown)
          : await apiClient.parseMarkdownMermaidBlocks(markdown);
      setMarkdownBlocks(blocks);
    } catch {
      setSyncError('Could not find Mermaid blocks in Markdown.');
    }
  }

  async function importMarkdownBlock(block: MermaidImportBlockSummary): Promise<void> {
    setImportSource(block.sourceCode);
    await importMermaidSourceFromBlock(block);
  }

  async function importMermaidSourceFromBlock(block: MermaidImportBlockSummary): Promise<void> {
    if (selectedWorkspaceId.length === 0 || selectedProjectId.length === 0 || !canEditDiagram) {
      return;
    }

    try {
      const diagram =
        apiClient === null
          ? {
              id: `diagram-md-${Date.now()}-${block.index}`,
              workspaceId: selectedWorkspaceId,
              projectId: selectedProjectId,
              title: block.title,
              description: 'Imported from Markdown',
              diagramType: inferDiagramType(block.sourceCode),
              themeConfig: { theme: 'default' as const },
              sourceCode: block.sourceCode,
              updatedAtLabel: 'Imported locally'
            }
          : await apiClient.importMermaid({
              workspaceId: selectedWorkspaceId,
              projectId: selectedProjectId,
              title: block.title,
              sourceCode: block.sourceCode
            });
      setDiagrams((current) => [diagram, ...current]);
      setSelectedDiagramId(diagram.id);
      setMarkdownBlocks([]);
      setMarkdownSource('');
    } catch {
      setSyncError('Could not import selected Markdown block.');
    }
  }

  async function saveSelectedDiagram(draft: DiagramDraft): Promise<void> {
    if (selectedDiagram === undefined) {
      throw new Error('No diagram is selected.');
    }

    if (!canEditDiagram) {
      throw new Error('Current role cannot edit diagrams.');
    }

    const updatedDiagram =
      apiClient === null
        ? {
            ...selectedDiagram,
            title: draft.title,
            sourceCode: draft.sourceCode,
            themeConfig: draft.themeConfig,
            updatedAtLabel: 'Saved locally'
          }
        : await apiClient.updateDiagram({
            diagramId: selectedDiagram.id,
            title: draft.title,
            description: selectedDiagram.description,
            sourceCode: draft.sourceCode,
            diagramType: selectedDiagram.diagramType,
            themeConfig: draft.themeConfig
          });

    setDiagrams((current) =>
      current.map((diagram) => (diagram.id === updatedDiagram.id ? updatedDiagram : diagram))
    );
    setDiagramVersions((current) => [
      {
        id: `${updatedDiagram.id}-saved-${Date.now()}`,
        diagramId: updatedDiagram.id,
        workspaceId: updatedDiagram.workspaceId,
        projectId: updatedDiagram.projectId,
        title: updatedDiagram.title,
        description: updatedDiagram.description,
        diagramType: updatedDiagram.diagramType,
        themeConfig: updatedDiagram.themeConfig,
        sourceCode: updatedDiagram.sourceCode,
        createdBy: 'current-user',
        createdAt: new Date().toISOString()
      },
      ...current
    ]);
    setSelectedDiagramId(updatedDiagram.id);
  }

  async function restoreVersion(version: DiagramVersionSummary): Promise<void> {
    if (selectedDiagram === undefined || !canEditDiagram) {
      return;
    }

    try {
      setRestoreMessage(null);
      const restoredDiagram =
        apiClient === null
          ? {
              ...selectedDiagram,
              title: version.title,
              description: version.description,
              diagramType: version.diagramType,
              themeConfig: version.themeConfig,
              sourceCode: version.sourceCode,
              updatedAtLabel: 'Restored locally'
            }
          : await apiClient.restoreDiagramVersion(selectedDiagram.id, version.id);

      setDiagrams((current) =>
        current.map((diagram) => (diagram.id === restoredDiagram.id ? restoredDiagram : diagram))
      );
      setSelectedDiagramId(restoredDiagram.id);
      setRestoreMessage('Version restored');

      if (apiClient !== null) {
        setDiagramVersions(await apiClient.listDiagramVersions(restoredDiagram.id));
      }
    } catch {
      setRestoreMessage('Could not restore version.');
    }
  }

  async function exportSource(): Promise<void> {
    if (selectedDiagram === undefined) {
      return;
    }

    try {
      setExportMessage(null);
      const exportResult =
        apiClient === null
          ? {
              filename: `${selectedDiagram.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'diagram'}.mmd`,
              sourceCode: selectedDiagram.sourceCode
            }
          : await apiClient.exportDiagramSource(selectedDiagram.id);

      downloadTextFile(exportResult.filename, exportResult.sourceCode);
      setExportMessage('Mermaid source exported');
    } catch {
      setExportMessage('Could not export Mermaid source.');
    }
  }

  async function createShareLink(): Promise<void> {
    if (selectedDiagram === undefined || !canEditDiagram) {
      return;
    }

    try {
      setShareMessage(null);
      const link =
        apiClient === null
          ? {
              id: `${selectedDiagram.id}-local-share-${Date.now()}`,
              diagramId: selectedDiagram.id,
              token: `local-${selectedDiagram.id}`,
              url: `/share/local-${selectedDiagram.id}`,
              revokedAt: null,
              createdAt: new Date().toISOString()
            }
          : await apiClient.createShareLink(selectedDiagram.id);

      setShareLinks((current) => [link, ...current]);
      setShareMessage('Read-only share link created');
    } catch {
      setShareMessage('Could not create share link.');
    }
  }

  async function updatePolicy(patch: Partial<WorkspacePolicySummary>): Promise<void> {
    if (selectedWorkspaceId.length === 0 || workspacePolicy === null || !canManageWorkspace) {
      return;
    }

    try {
      const nextPolicy =
        apiClient === null
          ? { ...workspacePolicy, ...patch }
          : await apiClient.updateWorkspacePolicy({
              workspaceId: selectedWorkspaceId,
              ...patch
            });
      setWorkspacePolicy(nextPolicy);
      setGovernanceMessage('Workspace policy updated');
    } catch {
      setGovernanceMessage('Could not update workspace policy.');
    }
  }

  async function enforceRetention(): Promise<void> {
    if (selectedWorkspaceId.length === 0 || !canManageWorkspace) {
      return;
    }

    try {
      const result =
        apiClient === null
          ? { deletedVersions: 0, deletedAuditEvents: 0 }
          : await apiClient.enforceRetention(selectedWorkspaceId);
      setGovernanceMessage(
        `Retention removed ${result.deletedVersions} snapshots and ${result.deletedAuditEvents} audit events`
      );
    } catch {
      setGovernanceMessage('Could not enforce retention policy.');
    }
  }

  async function addWorkspaceMember(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (selectedWorkspaceId.length === 0 || memberEmail.trim().length === 0 || !canManageWorkspace) {
      return;
    }

    if (!canAssignWorkspaceRole(currentWorkspaceRole, memberRole)) {
      setGovernanceMessage('Current role cannot assign that workspace role.');
      return;
    }

    try {
      const member =
        apiClient === null
          ? {
              id: `member-${memberEmail}`,
              workspaceId: selectedWorkspaceId,
              userId: `local-${memberEmail}`,
              email: memberEmail,
              displayName: null,
              role: memberRole,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          : await apiClient.addWorkspaceMember({
              workspaceId: selectedWorkspaceId,
              email: memberEmail,
              role: memberRole
            });
      setWorkspaceMembers((current) => [member, ...current.filter((item) => item.userId !== member.userId)]);
      setMemberEmail('');
      setGovernanceMessage('Workspace member added');
    } catch {
      setGovernanceMessage('Could not add workspace member.');
    }
  }

  async function updateWorkspaceMemberRole(userId: string, role: WorkspaceRole): Promise<void> {
    const targetMember = workspaceMembers.find((item) => item.userId === userId);
    if (selectedWorkspaceId.length === 0 || targetMember === undefined || !canManageWorkspace) {
      return;
    }

    if (!canManageWorkspaceMember(currentWorkspaceRole, targetMember.role)) {
      setGovernanceMessage('Current role cannot manage that workspace member.');
      return;
    }

    if (!canAssignWorkspaceRole(currentWorkspaceRole, role)) {
      setGovernanceMessage('Current role cannot assign that workspace role.');
      return;
    }

    try {
      const member =
        apiClient === null
          ? workspaceMembers.find((item) => item.userId === userId)
          : await apiClient.updateWorkspaceMemberRole({ workspaceId: selectedWorkspaceId, userId, role });
      if (member !== undefined) {
        setWorkspaceMembers((current) =>
          current.map((item) => (item.userId === userId ? { ...member, role } : item))
        );
      }
      setGovernanceMessage('Workspace member role updated');
    } catch {
      setGovernanceMessage('Could not update workspace member role.');
    }
  }

  async function removeWorkspaceMember(userId: string): Promise<void> {
    const targetMember = workspaceMembers.find((item) => item.userId === userId);
    if (selectedWorkspaceId.length === 0 || targetMember === undefined || !canManageWorkspace) {
      return;
    }

    if (!canManageWorkspaceMember(currentWorkspaceRole, targetMember.role)) {
      setGovernanceMessage('Current role cannot manage that workspace member.');
      return;
    }

    try {
      if (apiClient !== null) {
        await apiClient.removeWorkspaceMember(selectedWorkspaceId, userId);
      }
      setWorkspaceMembers((current) => current.filter((member) => member.userId !== userId));
      setGovernanceMessage('Workspace member removed');
    } catch {
      setGovernanceMessage('Could not remove workspace member.');
    }
  }

  async function revokeShareLink(link: DiagramShareLinkSummary): Promise<void> {
    if (selectedDiagram === undefined || !canEditDiagram) {
      return;
    }

    try {
      if (apiClient !== null) {
        await apiClient.revokeShareLink(selectedDiagram.id, link.id);
      }
      setShareLinks((current) =>
        current.map((currentLink) =>
          currentLink.id === link.id
            ? {
                ...currentLink,
                revokedAt: new Date().toISOString()
              }
            : currentLink
        )
      );
      setShareMessage('Share link revoked');
    } catch {
      setShareMessage('Could not revoke share link.');
    }
  }

  async function createComment(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (selectedDiagram === undefined || !canCommentDiagram) {
      return;
    }

    const body = commentBody.trim();
    if (body.length === 0) {
      return;
    }

    try {
      setCommentMessage(null);
      const comment =
        apiClient === null
          ? {
              id: `${selectedDiagram.id}-local-comment-${Date.now()}`,
              diagramId: selectedDiagram.id,
              workspaceId: selectedDiagram.workspaceId,
              authorId: 'local-user',
              body,
              anchor: null,
              status: 'open' as const,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          : await apiClient.createDiagramComment({
              diagramId: selectedDiagram.id,
              body
            });

      setDiagramComments((current) => [...current, comment]);
      setCommentBody('');
      setCommentMessage('Comment added');
    } catch {
      setCommentMessage('Could not add comment.');
    }
  }

  async function setCommentStatus(comment: DiagramCommentSummary): Promise<void> {
    if (selectedDiagram === undefined || !canCommentDiagram) {
      return;
    }

    try {
      setCommentMessage(null);
      const updatedComment =
        apiClient === null
          ? {
              ...comment,
              status: comment.status === 'open' ? ('resolved' as const) : ('open' as const),
              updatedAt: new Date().toISOString()
            }
          : comment.status === 'open'
            ? await apiClient.resolveDiagramComment(selectedDiagram.id, comment.id)
            : await apiClient.reopenDiagramComment(selectedDiagram.id, comment.id);

      setDiagramComments((current) =>
        current.map((currentComment) =>
          currentComment.id === updatedComment.id ? updatedComment : currentComment
        )
      );
      setCommentMessage(updatedComment.status === 'resolved' ? 'Comment resolved' : 'Comment reopened');
    } catch {
      setCommentMessage('Could not update comment.');
    }
  }

  return (
    <main className="h-screen w-screen flex bg-slate-950 text-slate-100 overflow-hidden font-sans select-none" aria-label="Flo Vis Application">
      
      {/* 1. LEFT WORKSPACE & SELECTORS RAIL */}
      <aside className="w-[260px] flex-shrink-0 flex flex-col bg-slate-950 border-r border-slate-800/80 h-full p-4 justify-between" aria-label="Workspace navigation">
        <div className="flex flex-col gap-5 min-h-0">
          {/* Brand lockup */}
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-teal-500 text-slate-950 font-bold text-base shadow-md shadow-teal-500/20 active:scale-95 transition-transform duration-100">FV</span>
            <div>
              <h1 className="text-xs font-bold tracking-wider text-slate-200">Flo Vis</h1>
              <p className="text-[9px] text-slate-500 font-semibold tracking-wider uppercase leading-none">Mermaid workbench</p>
            </div>
          </div>

          {/* Nav Selectors */}
          <div className="flex flex-col gap-4 min-h-0 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
            {/* Workspaces Section */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="workspace-name" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Workspace
                </label>
                {!isLoggedIn && <span className="text-red-400 text-[9px] font-normal lowercase">(auth required)</span>}
              </div>

              <nav className="flex flex-col gap-1 max-h-36 overflow-y-auto bg-slate-900/40 p-1.5 rounded-lg border border-slate-850" aria-label="Workspaces">
                {workspaces.map((workspace) => (
                  <button
                    className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all duration-100 flex flex-col justify-center ${workspace.id === selectedWorkspaceId ? 'bg-teal-500/10 text-teal-400 font-semibold border border-teal-500/20' : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200 border border-transparent'}`}
                    key={workspace.id}
                    type="button"
                    onClick={() => {
                      setSelectedWorkspaceId(workspace.id);
                      const nextProjectId = projects.find((project) => project.workspaceId === workspace.id)?.id ?? '';
                      setSelectedProjectId(nextProjectId);
                      setSelectedDiagramId(diagrams.find((diagram) => diagram.projectId === nextProjectId)?.id ?? '');
                    }}
                  >
                    <span className="truncate">{workspace.name}</span>
                  </button>
                ))}
              </nav>

              {/* Create workspace */}
              <form className="mt-1 flex gap-1.5" onSubmit={(event) => void createWorkspace(event)}>
                <input
                  id="workspace-name"
                  className="flex-1 min-w-0 bg-slate-900 text-slate-200 border border-slate-800 rounded px-2 py-1 text-[11px] placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-teal-500/40"
                  value={workspaceName}
                  onChange={(event) => setWorkspaceName(event.target.value)}
                  placeholder={isLoggedIn ? "New workspace" : "Sign in to create"}
                  disabled={!isLoggedIn}
                />
                <button
                  type="submit"
                  className="bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-slate-100 border border-slate-700/60 text-[10px] font-semibold px-2 py-1 rounded transition-colors disabled:opacity-50"
                  disabled={!isLoggedIn}
                >
                  Create
                </button>
              </form>
            </div>

            {/* Projects Section */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="project-name" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Project
                </label>
                {!isLoggedIn && <span className="text-red-400 text-[9px] font-normal lowercase">(auth required)</span>}
              </div>

              <nav className="flex flex-col gap-1 max-h-36 overflow-y-auto bg-slate-900/40 p-1.5 rounded-lg border border-slate-850" aria-label="Projects">
                {workspaceProjects.length === 0 ? (
                  <p className="text-[10px] text-slate-600 italic px-2 py-1">No projects yet.</p>
                ) : (
                  workspaceProjects.map((project) => (
                    <button
                      className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all duration-100 flex flex-col justify-center ${project.id === selectedProjectId ? 'bg-teal-500/10 text-teal-400 font-semibold border border-teal-500/20' : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200 border border-transparent'}`}
                      key={project.id}
                      type="button"
                      onClick={() => {
                        setSelectedProjectId(project.id);
                        setSelectedDiagramId(diagrams.find((diagram) => diagram.projectId === project.id)?.id ?? '');
                      }}
                    >
                      <span className="truncate">{project.name}</span>
                    </button>
                  ))
                )}
              </nav>

              {/* Create project */}
              <form className="mt-1 flex gap-1.5" onSubmit={(event) => void createProject(event)}>
                <input
                  id="project-name"
                  className="flex-1 min-w-0 bg-slate-900 text-slate-200 border border-slate-800 rounded px-2 py-1 text-[11px] placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-teal-500/40"
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  placeholder={isLoggedIn ? "New project" : "Sign in to add"}
                  disabled={!isLoggedIn || !canCreateProjects}
                />
                <button
                  type="submit"
                  className="bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-slate-100 border border-slate-700/60 text-[10px] font-semibold px-2.5 py-1 rounded transition-colors disabled:opacity-50"
                  disabled={!isLoggedIn || !canCreateProjects}
                >
                  Add
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* User profile / bottom actions */}
        <div className="flex flex-col gap-2 pt-4 border-t border-slate-800/80">
          {isLoggedIn ? (
            <div className="flex flex-col gap-1.5">
              {currentUser && (
                <div className="text-[10px] text-slate-400 truncate">
                  User: <span className="font-semibold text-slate-200">{currentUser.displayName || currentUser.email}</span>
                </div>
              )}
              <button
                className="w-full text-center py-1.5 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-850 hover:text-red-400 text-slate-300 transition-colors border border-slate-800"
                type="button"
                onClick={handleLogout}
              >
                Log out
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <a href="/login" className="text-center py-1.5 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-850 transition-all active:scale-95">Sign in</a>
              <a href="/login?mode=register" className="text-center py-1.5 rounded text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-slate-950 transition-all active:scale-95 shadow-md shadow-teal-500/10">Sign up</a>
            </div>
          )}
        </div>
      </aside>

      {/* 2. UTILITY DOCK (420px) */}
      <section className="w-[420px] flex-shrink-0 flex flex-col bg-slate-900 border-r border-slate-800 h-full overflow-hidden" aria-label="Diagram utilities">
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5 scrollbar-thin scrollbar-thumb-slate-800">
          
          {/* 1. Project Diagrams List & Starter Templates */}
          <section className="diagram-list-band flex flex-col gap-3" aria-label="Project diagrams">
            <div className="section-heading bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 shadow-md flex flex-col gap-3.5">
              <div>
                <p className="eyebrow text-slate-500">Project diagrams</p>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">{projectDiagrams.length} charts</h3>
              </div>
              <div className="template-create-controls flex flex-col gap-2 w-full">
                <label htmlFor="diagram-template" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Template</label>
                <select
                  id="diagram-template"
                  className="w-full bg-slate-900 text-slate-200 border border-slate-800 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-teal-500/50 cursor-pointer"
                  value={templateId}
                  onChange={(event) => setTemplateId(event.target.value)}
                >
                  {diagramTemplates.map((template) => (
                    <option key={template.id} value={template.id}>{template.name}</option>
                  ))}
                </select>
                <button
                  className="primary-action w-full py-1.5 rounded text-xs font-semibold bg-teal-500 hover:bg-teal-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 transition-all shadow-md shadow-teal-500/10 active:scale-95 duration-100"
                  type="button"
                  onClick={() => void createDiagram()}
                  disabled={selectedProjectId.length === 0 || !canEditDiagram}
                >
                  New diagram
                </button>
              </div>
            </div>

            {projectDiagrams.length === 0 ? (
              <div className="diagram-empty-state text-center p-8 bg-slate-950/20 border border-slate-850 rounded-lg">
                <h3 className="text-xs font-semibold text-slate-400">No diagrams in this project</h3>
                <p className="text-[11px] text-slate-500 mt-1">Create the first Mermaid chart.</p>
              </div>
            ) : (
              <div className="diagram-list flex flex-col gap-1.5">
                {projectDiagrams.map((diagram) => (
                  <button
                    className={diagram.id === selectedDiagramId ? 'diagram-row active bg-teal-500/10 text-teal-400 border border-teal-500/30' : 'diagram-row'}
                    key={diagram.id}
                    type="button"
                    onClick={() => setSelectedDiagramId(diagram.id)}
                  >
                    <span>
                      <strong className="block truncate max-w-[280px]">{diagram.title}</strong>
                      <small className="block truncate max-w-[280px]">{diagram.description ?? 'No description'}</small>
                    </span>
                    <span className="diagram-meta">{diagram.diagramType} / {diagram.updatedAtLabel}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* 2. Import & Detect Band */}
          <section className="import-band flex flex-col gap-4">
            {/* Mermaid Source Import */}
            <div className="utility-panel bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 shadow-md flex flex-col gap-2.5">
              <div className="section-heading">
                <div>
                  <p className="eyebrow text-slate-500">Import</p>
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Mermaid source</h3>
                </div>
              </div>
              <textarea
                aria-label="Imported .mmd content"
                placeholder="Paste .mmd source"
                className="w-full bg-slate-950 text-slate-100 font-mono text-xs p-2.5 rounded border border-slate-800/80 focus:outline-none focus:ring-1 focus:ring-teal-500/50 resize-y min-h-[60px] placeholder-slate-700"
                value={importSource}
                onChange={(event) => setImportSource(event.target.value)}
                disabled={!canEditDiagram}
              />
              <button
                className="secondary-action w-full py-1.5 rounded text-xs font-semibold bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700/60 transition-colors"
                type="button"
                onClick={() => void importMermaidSource()}
                disabled={!canEditDiagram}
              >
                Import .mmd
              </button>
            </div>

            {/* Markdown Parser Import */}
            <div className="utility-panel bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 shadow-md flex flex-col gap-2.5">
              <div className="section-heading">
                <div>
                  <p className="eyebrow text-slate-500">Markdown</p>
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">{markdownBlocks.length} blocks</h3>
                </div>
              </div>
              <textarea
                aria-label="Markdown Mermaid import"
                placeholder="Paste Markdown with ```mermaid blocks"
                className="w-full bg-slate-950 text-slate-100 font-mono text-xs p-2.5 rounded border border-slate-800/80 focus:outline-none focus:ring-1 focus:ring-teal-500/50 resize-y min-h-[60px] placeholder-slate-700"
                value={markdownSource}
                onChange={(event) => setMarkdownSource(event.target.value)}
                disabled={!canEditDiagram}
              />
              <button
                className="secondary-action w-full py-1.5 rounded text-xs font-semibold bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700/60 transition-colors"
                type="button"
                onClick={() => void parseMarkdownSource()}
                disabled={!canEditDiagram}
              >
                Detect blocks
              </button>

              {markdownBlocks.length > 0 && (
                <div className="version-list flex flex-col gap-1.5 mt-2 max-h-36 overflow-y-auto pr-1 scrollbar-thin">
                  {markdownBlocks.map((block) => (
                    <button
                      className="diagram-row"
                      key={block.index}
                      type="button"
                      onClick={() => void importMarkdownBlock(block)}
                      disabled={!canEditDiagram}
                    >
                      <span>
                        <strong>{block.title}</strong>
                        <small className="block truncate max-w-[280px]">{block.sourceCode.split('\n')[0]}</small>
                      </span>
                      <span className="diagram-meta">Import</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* 3. Diagram Editor Controls (Mock Save) */}
          <section className="diagram-editor-band flex flex-col gap-4">
            <DiagramEditorScreen
              contextLabel={`${selectedWorkspace?.name ?? 'Workspace'} / ${selectedProject?.name ?? 'Project'}`}
              draft={
                selectedDiagram === undefined
                  ? undefined
                  : {
                      title: selectedDiagram.title,
                      sourceCode: selectedDiagram.sourceCode,
                      themeConfig: selectedDiagram.themeConfig
                    }
              }
              draftKey={selectedDiagram?.id ?? ''}
              onSave={selectedDiagram === undefined || !canEditDiagram ? undefined : saveSelectedDiagram}
              statusLabel={canEditDiagram ? 'Editor role can save' : 'Read-only role'}
              onSourceChange={(sourceCode) => setLiveSourceCode(sourceCode)}
            />
          </section>

          {/* 4. Diagram Utilities (Versions, Exports, Share links, Comments) */}
          {selectedDiagram !== undefined && (
            <div className="flex flex-col gap-5">
              
              {/* Snapshots / Versions */}
              <div className="utility-panel bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 shadow-md">
                <div className="section-heading mb-2">
                  <div>
                    <p className="eyebrow">Versions</p>
                    <h3>{diagramVersions.length} snapshots</h3>
                  </div>
                  {restoreMessage === null ? null : <span className="status text-[10px] text-teal-400">{restoreMessage}</span>}
                </div>
                <div className="version-list flex flex-col gap-1.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
                  {diagramVersions.length === 0 ? (
                    <p className="empty-copy text-xs text-slate-650 italic py-2">No versions yet.</p>
                  ) : (
                    diagramVersions.map((version) => (
                      <button
                        aria-label={`Restore snapshot from ${new Date(version.createdAt).toLocaleString()}`}
                        className="diagram-row"
                        key={version.id}
                        type="button"
                        onClick={() => void restoreVersion(version)}
                        disabled={!canEditDiagram}
                      >
                        <span>
                          <strong>{version.title}</strong>
                          <small>{new Date(version.createdAt).toLocaleString()}</small>
                        </span>
                        <span className="diagram-meta">Restore</span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Quick Exports */}
              <div className="utility-panel bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 shadow-md">
                <div className="section-heading mb-2">
                  <div>
                    <p className="eyebrow">Export</p>
                    <h3>Portable source</h3>
                  </div>
                  {exportMessage === null ? null : <span className="status text-[10px] text-teal-400">{exportMessage}</span>}
                </div>
                <button
                  className="secondary-action w-full py-1.5 rounded text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/60"
                  type="button"
                  onClick={() => void exportSource()}
                >
                  Export .mmd
                </button>
              </div>

              {/* Share Link Manager */}
              <div className="utility-panel bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 shadow-md">
                <div className="section-heading mb-2">
                  <div>
                    <p className="eyebrow">Share</p>
                    <h3>Read-only links</h3>
                  </div>
                  {shareMessage === null ? null : <span className="status text-[10px] text-teal-400">{shareMessage}</span>}
                </div>
                <button
                  className="secondary-action w-full py-1.5 rounded text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-slate-950 border border-transparent shadow-md shadow-teal-500/10"
                  type="button"
                  onClick={() => void createShareLink()}
                  disabled={!canEditDiagram}
                >
                  New share link
                </button>
                <div className="version-list flex flex-col gap-1.5 mt-3 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                  {shareLinks.map((link) => (
                    <button
                      aria-label={`Revoke share link ${link.url ?? link.id}`}
                      className="diagram-row"
                      disabled={link.revokedAt !== null}
                      key={link.id}
                      type="button"
                      onClick={() => void revokeShareLink(link)}
                    >
                      <span>
                        <strong>{link.url ?? '/share/link'}</strong>
                        <small>{link.revokedAt === null ? 'Active read-only link' : 'Revoked'}</small>
                      </span>
                      <span className="diagram-meta">Revoke</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Comments Feed & Form */}
              <div className="utility-panel bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 shadow-md">
                <div className="section-heading mb-2">
                  <div>
                    <p className="eyebrow">Comments</p>
                    <h3>{diagramComments.length} open notes</h3>
                  </div>
                  {commentMessage === null ? null : <span className="status text-[10px] text-teal-400">{commentMessage}</span>}
                </div>
                <form className="comment-form flex flex-col gap-2 mb-3" onSubmit={(event) => void createComment(event)}>
                  <label htmlFor="diagram-comment" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Comment</label>
                  <textarea
                    id="diagram-comment"
                    className="w-full bg-slate-950 text-slate-100 font-sans text-xs p-2.5 rounded border border-slate-800/80 focus:outline-none focus:ring-1 focus:ring-teal-500/50 resize-y min-h-[50px] placeholder-slate-700"
                    value={commentBody}
                    onChange={(event) => setCommentBody(event.target.value)}
                    placeholder="Leave review feedback"
                    disabled={!canCommentDiagram}
                  />
                  <button
                    className="secondary-action w-full py-1.5 rounded text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-slate-950 border border-transparent shadow-md shadow-teal-500/10"
                    type="submit"
                    disabled={!canCommentDiagram}
                  >
                    Add comment
                  </button>
                </form>
                <div className="version-list flex flex-col gap-1.5 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                  {diagramComments.length === 0 ? (
                    <p className="empty-copy text-xs text-slate-650 italic py-2">No comments yet.</p>
                  ) : (
                    diagramComments.map((comment) => (
                      <article className="diagram-row comment-row flex justify-between items-center bg-slate-950/50 p-2.5 rounded-lg border border-slate-850" key={comment.id}>
                        <span>
                          <strong className="text-xs text-slate-200 font-medium leading-relaxed block">{comment.body}</strong>
                          <small className="text-[10px] text-slate-500">{new Date(comment.createdAt).toLocaleString()}</small>
                        </span>
                        <button
                          className="inline-row-action text-[10px] font-bold text-teal-400 hover:bg-teal-500/10 px-1.5 py-0.5 rounded"
                          type="button"
                          onClick={() => void setCommentStatus(comment)}
                          disabled={!canCommentDiagram}
                        >
                          {comment.status === 'open' ? 'Resolve' : 'Reopen'}
                        </button>
                      </article>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

          {/* 5. Enterprise Governance Policies & Members */}
          <section className="governance-band flex flex-col gap-5 border-t border-slate-800/80 pt-4" aria-label="Enterprise governance">
            
            {/* Policies Panel */}
            <div className="utility-panel bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 shadow-md">
              <div className="section-heading mb-2">
                <div>
                  <p className="eyebrow">Policies</p>
                  <h3>Workspace controls</h3>
                </div>
                {governanceMessage === null ? null : <span className="status text-[10px] text-teal-400">{governanceMessage}</span>}
              </div>
              {workspacePolicy === null ? (
                <p className="empty-copy text-xs text-slate-650 italic py-2">Policy settings unavailable.</p>
              ) : (
                <div className="policy-grid flex flex-col gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-slate-100">
                    <input
                      type="checkbox"
                      className="rounded border-slate-800 text-teal-500 focus:ring-0 cursor-pointer bg-slate-950"
                      checked={workspacePolicy.allowShareLinks}
                      onChange={(event) => void updatePolicy({ allowShareLinks: event.target.checked })}
                      disabled={!canManageWorkspace}
                    />
                    <span>Share links</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-slate-100">
                    <input
                      type="checkbox"
                      className="rounded border-slate-800 text-teal-500 focus:ring-0 cursor-pointer bg-slate-950"
                      checked={workspacePolicy.allowExports}
                      onChange={(event) => void updatePolicy({ allowExports: event.target.checked })}
                      disabled={!canManageWorkspace}
                    />
                    <span>Exports</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-slate-100">
                    <input
                      type="checkbox"
                      className="rounded border-slate-800 text-teal-500 focus:ring-0 cursor-pointer bg-slate-950"
                      checked={workspacePolicy.ssoRequired}
                      onChange={(event) => void updatePolicy({ ssoRequired: event.target.checked })}
                      disabled={!canManageWorkspace}
                    />
                    <span>SSO required</span>
                  </label>
                  <label className="flex flex-col gap-1 mt-1">
                    Retention days
                    <input
                      type="number"
                      className="bg-slate-900 text-slate-200 border border-slate-800 rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-teal-500/50 mt-1"
                      min="30"
                      max="3650"
                      value={workspacePolicy.retentionDays}
                      onChange={(event) => void updatePolicy({ retentionDays: Number(event.target.value) })}
                      disabled={!canManageWorkspace}
                    />
                  </label>
                  <button
                    className="secondary-action w-full py-1.5 rounded text-xs font-semibold bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700/60 mt-1.5 transition-colors"
                    type="button"
                    onClick={() => void enforceRetention()}
                    disabled={!canManageWorkspace}
                  >
                    Enforce retention
                  </button>
                </div>
              )}
            </div>

            {/* Members Panel */}
            <div className="utility-panel bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 shadow-md">
              <div className="section-heading mb-2.5">
                <div>
                  <p className="eyebrow">Members</p>
                  <h3>{workspaceMembers.length} people</h3>
                </div>
              </div>
              <form className="member-form flex flex-col gap-2 mb-3" onSubmit={(event) => void addWorkspaceMember(event)}>
                <label htmlFor="member-email" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Add member</label>
                <input
                  id="member-email"
                  aria-label="Member email"
                  type="email"
                  placeholder="member@example.com"
                  className="w-full bg-slate-950 text-slate-100 text-xs p-2 rounded border border-slate-800/80 focus:outline-none focus:ring-1 focus:ring-teal-500/50"
                  value={memberEmail}
                  onChange={(event) => setMemberEmail(event.target.value)}
                  disabled={!canManageWorkspace}
                />
                <div className="flex gap-2">
                  <select
                    aria-label="Member role"
                    className="flex-1 bg-slate-900 text-slate-200 border border-slate-800 rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-teal-500/50 cursor-pointer"
                    value={memberRole}
                    onChange={(event) => setMemberRole(event.target.value as WorkspaceRole)}
                    disabled={!canManageWorkspace}
                  >
                    {getAssignableWorkspaceRoles(currentWorkspaceRole).map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                  <button
                    className="primary-action px-3 py-1 rounded text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-slate-950 border border-transparent transition-colors disabled:opacity-50"
                    type="submit"
                    disabled={!canManageWorkspace}
                  >
                    Add member
                  </button>
                </div>
              </form>
              <div className="version-list flex flex-col gap-1.5 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                {workspaceMembers.length === 0 ? (
                  <p className="empty-copy text-xs text-slate-650 italic py-2">No members loaded.</p>
                ) : (
                  workspaceMembers.slice(0, 6).map((member) => (
                    <article className="diagram-row comment-row flex justify-between items-center bg-slate-950/50 p-2.5 rounded-lg border border-slate-850" key={member.id}>
                      <span>
                        <strong className="text-xs text-slate-200 font-medium leading-relaxed block truncate max-w-[150px]">{member.displayName ?? member.email}</strong>
                        <small className="text-[10px] text-slate-500 truncate block max-w-[150px]">{member.email}</small>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <select
                          aria-label={`Role for ${member.email}`}
                          className="bg-slate-900 text-slate-200 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] focus:ring-1 focus:ring-teal-500/50 cursor-pointer"
                          value={member.role}
                          onChange={(event) =>
                            void updateWorkspaceMemberRole(member.userId, event.target.value as WorkspaceRole)
                          }
                          disabled={!canManageWorkspaceMember(currentWorkspaceRole, member.role)}
                        >
                          {getAssignableWorkspaceRoles(currentWorkspaceRole).map((role) => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                        
                        <button
                          className="text-[9px] text-red-400 hover:text-red-300 font-semibold px-1 disabled:opacity-40"
                          type="button"
                          onClick={() => void removeWorkspaceMember(member.userId)}
                          disabled={!canManageWorkspaceMember(currentWorkspaceRole, member.role)}
                        >
                          Remove
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
              
              {/* SSO Configuration details */}
              <div className="mt-4 pt-3 border-t border-slate-850">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-2">SSO Config</p>
                <p className="empty-copy text-[10px] text-slate-400 bg-slate-950/30 p-2 rounded border border-slate-850 font-mono leading-relaxed select-all">
                  {enterpriseIdentity === null
                    ? 'Enterprise identity path unavailable.'
                    : `${enterpriseIdentity.loginUrl} \n Required claims: ${enterpriseIdentity.requiredClaims.join(', ')}`}
                </p>
              </div>

              {/* Audit Logs */}
              <div className="mt-4 pt-3 border-t border-slate-850">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-2">Audit Logs ({auditEvents.length})</p>
                <div className="version-list flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1 scrollbar-thin">
                  {auditEvents.length === 0 ? (
                    <p className="empty-copy text-[10px] text-slate-650 italic">No audit events yet.</p>
                  ) : (
                    auditEvents.slice(0, 6).map((event) => (
                      <article className="diagram-row comment-row bg-slate-950/20 p-2 rounded border border-slate-850 flex items-center justify-between text-xs" key={event.id}>
                        <span>
                          <strong className="text-[10px] text-slate-300 font-semibold block">{event.action}</strong>
                          <small className="text-[9px] text-slate-500">{new Date(event.createdAt).toLocaleString()}</small>
                        </span>
                        <span className="diagram-meta text-[8px]">{event.targetType}</span>
                      </article>
                    ))
                  )}
                </div>
              </div>

            </div>
          </section>

        </div>
      </section>

      {/* 3. INTERACTIVE PREVIEW CANVAS */}
      <section className="flex-1 flex flex-col bg-slate-900 overflow-hidden relative" aria-label="Diagram canvas">
        
        {/* Canvas floating overlay topbar */}
        <header className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between p-3 bg-slate-950/70 backdrop-blur-md border border-slate-850 rounded-xl shadow-lg">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20 uppercase tracking-wide">
                {selectedWorkspace?.name || 'Workspace'}
              </span>
              <span className="text-slate-600 font-bold text-[9px]">/</span>
              <span className="text-xs font-semibold text-slate-200">
                {selectedProject?.name || 'Project'}
              </span>
            </div>
            <h2 className="text-xs font-bold text-slate-100 mt-1 select-all">
              {selectedDiagram?.title || 'No diagram loaded'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-900/60 border border-slate-850 px-2.5 py-1 rounded-md">
              {isSyncing ? 'Syncing...' : 'Live Render'}
            </span>

            <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-lg border border-slate-800">
              <button
                className="px-2.5 py-1.5 rounded text-[10px] font-semibold text-slate-300 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                type="button"
                onClick={() => setPresentationMode((value) => !value)}
              >
                {presentationMode ? 'Exit presentation' : 'Present'}
              </button>
            </div>
          </div>
        </header>

        {/* Message Alert Banner */}
        {syncError && (
          <div className="absolute top-20 left-4 right-4 z-10 p-3 rounded-lg border border-red-500/25 bg-red-950/20 text-red-400 text-xs shadow-lg flex items-center gap-2" role="alert">
            <span className="text-sm">⚠️</span> {syncError}
          </div>
        )}

        {/* Canvas Render stage */}
        <div className="flex-1 w-full h-full flex items-center justify-center relative p-8 pt-24 preview-grid-bg">
          {presentationMode && selectedDiagram !== undefined ? (
            <section className="absolute inset-0 bg-slate-950/98 z-50 flex flex-col p-8 justify-center items-center" aria-label="Presentation mode">
              <button
                className="absolute top-4 right-4 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 z-50 transition-colors"
                type="button"
                onClick={() => setPresentationMode(false)}
              >
                Exit Presentation
              </button>
              <div className="w-full h-full flex flex-col justify-center items-center min-h-0 relative">
                <div className="absolute top-0 left-0 text-left">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">{selectedWorkspace?.name ?? 'Workspace'}</p>
                  <h2 className="text-xs font-bold text-slate-300 leading-none">{selectedDiagram.title}</h2>
                </div>
                <div className="flex-1 w-full flex items-center justify-center min-h-0 pt-10">
                  <MermaidPreview source={liveSourceCode || selectedDiagram.sourceCode} theme={selectedDiagram.themeConfig.theme} />
                </div>
              </div>
            </section>
          ) : selectedDiagram !== undefined ? (
            <div className="w-full h-full flex items-center justify-center overflow-auto p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl relative shadow-inner">
              <MermaidPreview source={liveSourceCode || selectedDiagram.sourceCode} theme={selectedDiagram.themeConfig.theme} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 max-w-sm">
              <span className="text-4xl mb-4 opacity-75">🎨</span>
              <h3 className="text-sm font-bold text-slate-200 mb-1.5">Create or Select a Diagram</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                To start modeling your system workflow, select a diagram from the Projects list, or load a preset template from the starter dock.
              </p>
            </div>
          )}
        </div>

      </section>

    </main>
  );
}

function canEdit(role: WorkspaceSummary['currentUserRole']): boolean {
  return role === 'owner' || role === 'admin' || role === 'editor';
}

function canComment(role: WorkspaceSummary['currentUserRole']): boolean {
  return canEdit(role) || role === 'commenter';
}

function canCreateProject(role: WorkspaceSummary['currentUserRole']): boolean {
  return role === 'owner' || role === 'admin';
}

function canAdministerWorkspace(role: WorkspaceSummary['currentUserRole']): boolean {
  return role === 'owner' || role === 'admin';
}

function canAssignWorkspaceRole(actorRole: WorkspaceRole | undefined, nextRole: WorkspaceRole): boolean {
  if (actorRole === 'owner') {
    return true;
  }

  if (actorRole === 'admin') {
    return nextRole === 'viewer' || nextRole === 'commenter' || nextRole === 'editor';
  }

  return false;
}

function canManageWorkspaceMember(
  actorRole: WorkspaceRole | undefined,
  targetRole: WorkspaceRole
): boolean {
  if (actorRole === 'owner') {
    return true;
  }

  if (actorRole === 'admin') {
    return targetRole !== 'owner';
  }

  return false;
}

function getAssignableWorkspaceRoles(actorRole: WorkspaceRole | undefined): WorkspaceRole[] {
  return workspaceRoleOptions.filter((role) => canAssignWorkspaceRole(actorRole, role));
}

const workspaceRoleOptions: WorkspaceRole[] = ['viewer', 'commenter', 'editor', 'admin', 'owner'];

function downloadTextFile(filename: string, sourceCode: string): void {
  const blob = new Blob([sourceCode], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function parseLocalMarkdownBlocks(markdown: string): MermaidImportBlockSummary[] {
  const blocks: MermaidImportBlockSummary[] = [];
  const regex = /```mermaid\s*\n([\s\S]*?)```/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(markdown)) !== null) {
    blocks.push({
      index: blocks.length,
      title: `Imported block ${blocks.length + 1}`,
      sourceCode: match[1].trim()
    });
  }
  return blocks;
}

function inferDiagramType(sourceCode: string): DiagramSummary['diagramType'] {
  const firstLine = sourceCode.trim();
  if (/^(flowchart|graph)\b/.test(firstLine)) {
    return 'flowchart';
  }
  if (/^sequenceDiagram\b/.test(firstLine)) {
    return 'sequence';
  }
  if (/^stateDiagram\b/.test(firstLine)) {
    return 'state';
  }
  if (/^classDiagram\b/.test(firstLine)) {
    return 'class';
  }
  return 'unknown';
}
