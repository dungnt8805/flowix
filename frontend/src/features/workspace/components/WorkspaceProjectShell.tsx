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
    <main className="h-screen w-screen overflow-hidden bg-[var(--color-bg-app)] text-[var(--color-text-primary)]" aria-label="Flo Vis Application">
      <div className="grid h-full min-w-0 grid-cols-[260px_minmax(420px,560px)_minmax(0,1fr)] gap-4 p-4">
        <aside className="flex min-h-0 flex-col rounded-[10px] border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)]" aria-label="Workspace navigation">
          <div className="flex min-h-0 flex-1 flex-col gap-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--color-accent-soft)] text-base font-semibold text-[var(--color-accent)]">F</span>
              <div>
                <h1 className="text-xl font-semibold">Flo Vis</h1>
                <p className="text-xs text-[var(--color-text-secondary)]">Light theme workbench</p>
              </div>
            </div>

            <div className="min-h-0 space-y-5 overflow-y-auto pr-1">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="workspace-name" className="text-[11px] font-medium uppercase text-[var(--color-text-tertiary)]">
                    Workspace
                  </label>
                  {!isLoggedIn ? <span className="text-[11px] text-rose-500">auth required</span> : null}
                </div>
                <nav className="space-y-2" aria-label="Workspaces">
                  {workspaces.map((workspace) => (
                    <button
                      className={navigationButtonClassName(workspace.id === selectedWorkspaceId)}
                      key={workspace.id}
                      type="button"
                      onClick={() => {
                        setSelectedWorkspaceId(workspace.id);
                        const nextProjectId = projects.find((project) => project.workspaceId === workspace.id)?.id ?? '';
                        setSelectedProjectId(nextProjectId);
                        setSelectedDiagramId(diagrams.find((diagram) => diagram.projectId === nextProjectId)?.id ?? '');
                      }}
                    >
                      <span className="truncate text-sm font-medium">{workspace.name}</span>
                    </button>
                  ))}
                </nav>
                <form className="flex gap-2" onSubmit={(event) => void createWorkspace(event)}>
                  <input
                    id="workspace-name"
                    aria-label="Workspace"
                    className={compactInputClassName()}
                    value={workspaceName}
                    onChange={(event) => setWorkspaceName(event.target.value)}
                    placeholder={isLoggedIn ? 'New workspace' : 'Sign in to create'}
                    disabled={!isLoggedIn}
                  />
                  <button type="submit" className={secondaryButtonClassName()} disabled={!isLoggedIn}>
                    Create
                  </button>
                </form>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="project-name" className="text-[11px] font-medium uppercase text-[var(--color-text-tertiary)]">
                    Project
                  </label>
                  {!isLoggedIn ? <span className="text-[11px] text-rose-500">auth required</span> : null}
                </div>
                <nav className="space-y-2" aria-label="Projects">
                  {workspaceProjects.length === 0 ? (
                    <p className="rounded-[8px] border border-dashed border-[var(--color-border-default)] px-3 py-4 text-sm text-[var(--color-text-tertiary)]">
                      No projects yet.
                    </p>
                  ) : (
                    workspaceProjects.map((project) => (
                      <button
                        className={navigationButtonClassName(project.id === selectedProjectId)}
                        key={project.id}
                        type="button"
                        onClick={() => {
                          setSelectedProjectId(project.id);
                          setSelectedDiagramId(diagrams.find((diagram) => diagram.projectId === project.id)?.id ?? '');
                        }}
                      >
                        <span className="truncate text-sm font-medium">{project.name}</span>
                      </button>
                    ))
                  )}
                </nav>
                <form className="flex gap-2" onSubmit={(event) => void createProject(event)}>
                  <input
                    id="project-name"
                    aria-label="Project"
                    className={compactInputClassName()}
                    value={projectName}
                    onChange={(event) => setProjectName(event.target.value)}
                    placeholder={isLoggedIn ? 'New project' : 'Sign in to add'}
                    disabled={!isLoggedIn || !canCreateProjects}
                  />
                  <button type="submit" className={secondaryButtonClassName()} disabled={!isLoggedIn || !canCreateProjects}>
                    Add
                  </button>
                </form>
              </div>

              <div className="rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-panel-alt)] p-4">
                <p className="text-[11px] font-medium uppercase text-[var(--color-text-tertiary)]">Account</p>
                {isLoggedIn ? (
                  <div className="mt-3 space-y-3">
                    {currentUser ? (
                      <div className="text-sm text-[var(--color-text-secondary)]">
                        {currentUser.displayName || currentUser.email}
                      </div>
                    ) : null}
                    <button className={secondaryButtonClassName('w-full justify-center')} type="button" onClick={handleLogout}>
                      Log out
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <a href="/login" className={secondaryButtonClassName('justify-center')}>
                      Sign in
                    </a>
                    <a href="/login?mode=register" className={primaryButtonClassName('justify-center')}>
                      Sign up
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

        <section className="flex min-h-0 flex-col gap-4">
          <section className="rounded-[10px] border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)]" aria-label="Project diagrams">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase text-[var(--color-text-tertiary)]">Project diagrams</p>
                <h2 className="mt-1 text-base font-semibold">{projectDiagrams.length} diagrams</h2>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="diagram-template" className="text-[11px] font-medium uppercase text-[var(--color-text-tertiary)]">
                  Template
                </label>
                <select
                  id="diagram-template"
                  aria-label="Template"
                  className={compactSelectClassName()}
                  value={templateId}
                  onChange={(event) => setTemplateId(event.target.value)}
                >
                  {diagramTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
                <button
                  className={primaryButtonClassName()}
                  type="button"
                  onClick={() => void createDiagram()}
                  disabled={selectedProjectId.length === 0 || !canEditDiagram}
                >
                  New diagram
                </button>
              </div>
            </div>
            {projectDiagrams.length === 0 ? (
              <div className="rounded-[8px] border border-dashed border-[var(--color-border-default)] px-4 py-10 text-center text-sm text-[var(--color-text-secondary)]">
                <p className="font-medium text-[var(--color-text-primary)]">No diagrams in this project</p>
                <p className="mt-1">Create the first Mermaid chart.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {projectDiagrams.map((diagram) => (
                  <button
                    className={diagramRowClassName(diagram.id === selectedDiagramId)}
                    key={diagram.id}
                    type="button"
                    onClick={() => setSelectedDiagramId(diagram.id)}
                  >
                    <span className="min-w-0 flex-1 text-left">
                      <strong className="block truncate text-sm font-medium">{diagram.title}</strong>
                      <small className="block truncate text-xs text-[var(--color-text-tertiary)]">{diagram.description ?? 'No description'}</small>
                    </span>
                    <span className="rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-2 py-1 text-[10px] font-medium uppercase text-[var(--color-text-secondary)]">
                      {diagram.diagramType} / {diagram.updatedAtLabel}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

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

          <div className="grid min-h-0 gap-4 xl:grid-cols-2">
            <section className="rounded-[10px] border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <div className="mb-3">
                <p className="text-[11px] font-medium uppercase text-[var(--color-text-tertiary)]">Import</p>
                <h2 className="mt-1 text-base font-semibold">Mermaid source</h2>
              </div>
              <textarea
                aria-label="Imported .mmd content"
                placeholder="Paste .mmd source"
                className={textareaClassName()}
                value={importSource}
                onChange={(event) => setImportSource(event.target.value)}
                disabled={!canEditDiagram}
              />
              <button className={`${secondaryButtonClassName('mt-3')} w-full justify-center`} type="button" onClick={() => void importMermaidSource()} disabled={!canEditDiagram}>
                Import .mmd
              </button>
            </section>

            <section className="rounded-[10px] border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <div className="mb-3">
                <p className="text-[11px] font-medium uppercase text-[var(--color-text-tertiary)]">Import</p>
                <h2 className="mt-1 text-base font-semibold">{markdownBlocks.length} Markdown blocks</h2>
              </div>
              <textarea
                aria-label="Markdown Mermaid import"
                placeholder="Paste Markdown with ```mermaid blocks"
                className={textareaClassName()}
                value={markdownSource}
                onChange={(event) => setMarkdownSource(event.target.value)}
                disabled={!canEditDiagram}
              />
              <button className={`${secondaryButtonClassName('mt-3')} w-full justify-center`} type="button" onClick={() => void parseMarkdownSource()} disabled={!canEditDiagram}>
                Detect blocks
              </button>
              {markdownBlocks.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {markdownBlocks.map((block) => (
                    <button className={diagramRowClassName(false)} key={block.index} type="button" onClick={() => void importMarkdownBlock(block)} disabled={!canEditDiagram}>
                      <span className="min-w-0 flex-1 text-left">
                        <strong className="block truncate text-sm font-medium">{block.title}</strong>
                        <small className="block truncate text-xs text-[var(--color-text-tertiary)]">{block.sourceCode.split('\n')[0]}</small>
                      </span>
                      <span className="rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-2 py-1 text-[10px] font-medium uppercase text-[var(--color-text-secondary)]">
                        Import
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </section>
          </div>
        </section>

        <section className="flex min-h-0 flex-col gap-4 overflow-hidden rounded-[10px] border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)]" aria-label="Diagram canvas">
          <header className="flex flex-wrap items-start justify-between gap-4 rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-panel-alt)] px-4 py-3">
            <div>
              <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                <span className="font-medium">{selectedWorkspace?.name || 'Workspace'}</span>
                <span>/</span>
                <span>{selectedProject?.name || 'Project'}</span>
              </div>
              <h2 className="mt-1 text-lg font-semibold">{selectedDiagram?.title || 'No diagram loaded'}</h2>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full border border-[var(--color-border-subtle)] bg-white px-3 py-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
                {isSyncing ? 'Syncing...' : 'Saved just now'}
              </span>
              <button className={secondaryButtonClassName()} type="button" onClick={() => setPresentationMode((value) => !value)}>
                Present
              </button>
            </div>
          </header>

          {syncError ? (
            <div className="rounded-[8px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
              {syncError}
            </div>
          ) : null}

          <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="min-h-0">
              {presentationMode && selectedDiagram !== undefined ? (
                <section className="flex h-full min-h-[30rem] flex-col gap-4 rounded-[10px] border border-[var(--color-border-default)] bg-[var(--color-bg-panel-alt)] p-5" aria-label="Presentation mode">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-medium uppercase text-[var(--color-text-tertiary)]">{selectedWorkspace?.name ?? 'Workspace'}</p>
                      <h3 className="mt-1 text-base font-semibold">{selectedDiagram.title}</h3>
                    </div>
                    <button className={secondaryButtonClassName()} type="button" onClick={() => setPresentationMode(false)}>
                      Exit presentation
                    </button>
                  </div>
                  <div className="min-h-0 flex-1">
                    <MermaidPreview source={liveSourceCode || selectedDiagram.sourceCode} theme={selectedDiagram.themeConfig.theme} />
                  </div>
                </section>
              ) : selectedDiagram !== undefined ? (
                <MermaidPreview source={liveSourceCode || selectedDiagram.sourceCode} theme={selectedDiagram.themeConfig.theme} />
              ) : (
                <div className="flex h-full min-h-[30rem] items-center justify-center rounded-[10px] border border-dashed border-[var(--color-border-default)] bg-[var(--color-bg-panel-alt)] p-8 text-center">
                  <div className="max-w-sm">
                    <h3 className="text-lg font-semibold">Create or select a diagram</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                      Select a diagram from the list or create a new template-based draft to start editing.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <section className="flex min-h-0 flex-col rounded-[10px] border border-[var(--color-border-default)] bg-[var(--color-bg-panel-alt)] p-4" aria-label="Diagram utilities">
              <div className="mb-4 flex flex-wrap gap-2 border-b border-[var(--color-border-subtle)] pb-3 text-sm">
                {['Preview', 'Theme', 'Versions', 'Share', 'Comments', 'Export'].map((tab) => (
                  <span key={tab} className={`rounded-[8px] px-3 py-2 ${tab === 'Preview' ? 'bg-white font-medium text-[var(--color-accent)] shadow-[0_1px_2px_rgba(15,23,42,0.04)]' : 'text-[var(--color-text-secondary)]'}`}>
                    {tab}
                  </span>
                ))}
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
                {selectedDiagram !== undefined ? (
                  <>
                    <UtilityCard eyebrow="Versions" title={`${diagramVersions.length} snapshots`} status={restoreMessage}>
                      <div className="space-y-2">
                        {diagramVersions.length === 0 ? (
                          <p className="text-sm text-[var(--color-text-secondary)]">No versions yet.</p>
                        ) : (
                          diagramVersions.map((version) => (
                            <button
                              aria-label={`Restore snapshot from ${new Date(version.createdAt).toLocaleString()}`}
                              className={diagramRowClassName(false)}
                              key={version.id}
                              type="button"
                              onClick={() => void restoreVersion(version)}
                              disabled={!canEditDiagram}
                            >
                              <span className="min-w-0 flex-1 text-left">
                                <strong className="block truncate text-sm font-medium">{version.title}</strong>
                                <small className="block truncate text-xs text-[var(--color-text-tertiary)]">{new Date(version.createdAt).toLocaleString()}</small>
                              </span>
                              <span className="rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-2 py-1 text-[10px] font-medium uppercase text-[var(--color-text-secondary)]">
                                Restore
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </UtilityCard>

                    <UtilityCard eyebrow="Export" title="Portable source" status={exportMessage}>
                      <button className={`${secondaryButtonClassName()} w-full justify-center`} type="button" onClick={() => void exportSource()}>
                        Export .mmd
                      </button>
                    </UtilityCard>

                    <UtilityCard eyebrow="Share" title="Read-only links" status={shareMessage}>
                      <button className={`${primaryButtonClassName()} w-full justify-center`} type="button" onClick={() => void createShareLink()} disabled={!canEditDiagram}>
                        New share link
                      </button>
                      <div className="mt-3 space-y-2">
                        {shareLinks.length === 0 ? (
                          <p className="text-sm text-[var(--color-text-secondary)]">No share links created.</p>
                        ) : (
                          shareLinks.map((link) => (
                            <button
                              aria-label={`Revoke share link ${link.url ?? link.id}`}
                              className={diagramRowClassName(false)}
                              disabled={link.revokedAt !== null}
                              key={link.id}
                              type="button"
                              onClick={() => void revokeShareLink(link)}
                            >
                              <span className="min-w-0 flex-1 text-left">
                                <strong className="block truncate text-sm font-medium">{link.url ?? '/share/link'}</strong>
                                <small className="block truncate text-xs text-[var(--color-text-tertiary)]">
                                  {link.revokedAt === null ? 'Active read-only link' : 'Revoked'}
                                </small>
                              </span>
                              <span className="rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-2 py-1 text-[10px] font-medium uppercase text-[var(--color-text-secondary)]">
                                Revoke
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </UtilityCard>

                    <UtilityCard eyebrow="Comments" title={`${diagramComments.length} open notes`} status={commentMessage}>
                      <form className="space-y-3" onSubmit={(event) => void createComment(event)}>
                        <label htmlFor="diagram-comment" className="block text-[11px] font-medium uppercase text-[var(--color-text-tertiary)]">
                          Comment
                        </label>
                        <textarea
                          id="diagram-comment"
                          aria-label="Comment"
                          className={textareaClassName('min-h-[5rem]')}
                          value={commentBody}
                          onChange={(event) => setCommentBody(event.target.value)}
                          placeholder="Leave review feedback"
                          disabled={!canCommentDiagram}
                        />
                        <button className={`${primaryButtonClassName()} w-full justify-center`} type="submit" disabled={!canCommentDiagram}>
                          Add comment
                        </button>
                      </form>
                      <div className="mt-3 space-y-2">
                        {diagramComments.length === 0 ? (
                          <p className="text-sm text-[var(--color-text-secondary)]">No comments yet.</p>
                        ) : (
                          diagramComments.map((comment) => (
                            <article className="rounded-[8px] border border-[var(--color-border-subtle)] bg-white p-3" key={comment.id}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <strong className="block text-sm font-medium">{comment.body}</strong>
                                  <small className="mt-1 block text-xs text-[var(--color-text-tertiary)]">{new Date(comment.createdAt).toLocaleString()}</small>
                                </div>
                                <button className={secondaryButtonClassName()} type="button" onClick={() => void setCommentStatus(comment)} disabled={!canCommentDiagram}>
                                  {comment.status === 'open' ? 'Resolve' : 'Reopen'}
                                </button>
                              </div>
                            </article>
                          ))
                        )}
                      </div>
                    </UtilityCard>
                  </>
                ) : null}

                <UtilityCard eyebrow="Policies" title="Workspace controls" status={governanceMessage}>
                  {workspacePolicy === null ? (
                    <p className="text-sm text-[var(--color-text-secondary)]">Policy settings unavailable.</p>
                  ) : (
                    <div className="space-y-3 text-sm text-[var(--color-text-secondary)]">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 accent-[var(--color-accent)]"
                          checked={workspacePolicy.allowShareLinks}
                          onChange={(event) => void updatePolicy({ allowShareLinks: event.target.checked })}
                          disabled={!canManageWorkspace}
                          aria-label="Share links"
                        />
                        <span>Share links</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 accent-[var(--color-accent)]"
                          checked={workspacePolicy.allowExports}
                          onChange={(event) => void updatePolicy({ allowExports: event.target.checked })}
                          disabled={!canManageWorkspace}
                          aria-label="Exports"
                        />
                        <span>Exports</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 accent-[var(--color-accent)]"
                          checked={workspacePolicy.ssoRequired}
                          onChange={(event) => void updatePolicy({ ssoRequired: event.target.checked })}
                          disabled={!canManageWorkspace}
                          aria-label="SSO required"
                        />
                        <span>SSO required</span>
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-medium uppercase text-[var(--color-text-tertiary)]">Retention days</span>
                        <input
                          type="number"
                          className={compactInputClassName()}
                          min="30"
                          max="3650"
                          value={workspacePolicy.retentionDays}
                          onChange={(event) => void updatePolicy({ retentionDays: Number(event.target.value) })}
                          disabled={!canManageWorkspace}
                        />
                      </label>
                      <button className={`${secondaryButtonClassName()} w-full justify-center`} type="button" onClick={() => void enforceRetention()} disabled={!canManageWorkspace}>
                        Enforce retention
                      </button>
                    </div>
                  )}
                </UtilityCard>

                <UtilityCard eyebrow="Members" title={`${workspaceMembers.length} people`}>
                  <form className="space-y-3" onSubmit={(event) => void addWorkspaceMember(event)}>
                    <label htmlFor="member-email" className="block text-[11px] font-medium uppercase text-[var(--color-text-tertiary)]">
                      Add member
                    </label>
                    <input
                      id="member-email"
                      aria-label="Member email"
                      type="email"
                      placeholder="member@example.com"
                      className={compactInputClassName()}
                      value={memberEmail}
                      onChange={(event) => setMemberEmail(event.target.value)}
                      disabled={!canManageWorkspace}
                    />
                    <div className="flex gap-2">
                      <select
                        aria-label="Member role"
                        className={compactSelectClassName('flex-1')}
                        value={memberRole}
                        onChange={(event) => setMemberRole(event.target.value as WorkspaceRole)}
                        disabled={!canManageWorkspace}
                      >
                        {getAssignableWorkspaceRoles(currentWorkspaceRole).map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                      <button className={primaryButtonClassName()} type="submit" disabled={!canManageWorkspace}>
                        Add member
                      </button>
                    </div>
                  </form>
                  <div className="mt-3 space-y-2">
                    {workspaceMembers.length === 0 ? (
                      <p className="text-sm text-[var(--color-text-secondary)]">No members loaded.</p>
                    ) : (
                      workspaceMembers.slice(0, 6).map((member) => (
                        <article className="rounded-[8px] border border-[var(--color-border-subtle)] bg-white p-3" key={member.id}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <strong className="block truncate text-sm font-medium">{member.displayName ?? member.email}</strong>
                              <small className="block truncate text-xs text-[var(--color-text-tertiary)]">{member.email}</small>
                            </div>
                            <div className="flex items-center gap-2">
                              <select
                                aria-label={`Role for ${member.email}`}
                                className={compactSelectClassName('min-w-[6.5rem]')}
                                value={member.role}
                                onChange={(event) => void updateWorkspaceMemberRole(member.userId, event.target.value as WorkspaceRole)}
                                disabled={!canManageWorkspaceMember(currentWorkspaceRole, member.role)}
                              >
                                {getAssignableWorkspaceRoles(currentWorkspaceRole).map((role) => (
                                  <option key={role} value={role}>
                                    {role}
                                  </option>
                                ))}
                              </select>
                              <button
                                className={secondaryButtonClassName()}
                                type="button"
                                onClick={() => void removeWorkspaceMember(member.userId)}
                                disabled={!canManageWorkspaceMember(currentWorkspaceRole, member.role)}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </article>
                      ))
                    )}
                  </div>

                  <div className="mt-4 rounded-[8px] border border-[var(--color-border-subtle)] bg-white p-3">
                    <p className="text-[11px] font-medium uppercase text-[var(--color-text-tertiary)]">SSO config</p>
                    <p className="mt-2 whitespace-pre-line font-mono text-xs leading-5 text-[var(--color-text-secondary)]">
                      {enterpriseIdentity === null
                        ? 'Enterprise identity path unavailable.'
                        : `${enterpriseIdentity.loginUrl} \n Required claims: ${enterpriseIdentity.requiredClaims.join(', ')}`}
                    </p>
                  </div>

                  <div className="mt-4 rounded-[8px] border border-[var(--color-border-subtle)] bg-white p-3">
                    <p className="text-[11px] font-medium uppercase text-[var(--color-text-tertiary)]">Audit logs ({auditEvents.length})</p>
                    <div className="mt-3 space-y-2">
                      {auditEvents.length === 0 ? (
                        <p className="text-sm text-[var(--color-text-secondary)]">No audit events yet.</p>
                      ) : (
                        auditEvents.slice(0, 6).map((event) => (
                          <article className="flex items-center justify-between gap-3 rounded-[8px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-panel-alt)] p-3 text-sm" key={event.id}>
                            <span>
                              <strong className="block font-medium">{event.action}</strong>
                              <small className="block text-xs text-[var(--color-text-tertiary)]">{new Date(event.createdAt).toLocaleString()}</small>
                            </span>
                            <span className="rounded-full border border-[var(--color-border-subtle)] bg-white px-2 py-1 text-[10px] font-medium uppercase text-[var(--color-text-secondary)]">
                              {event.targetType}
                            </span>
                          </article>
                        ))
                      )}
                    </div>
                  </div>
                </UtilityCard>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function UtilityCard({
  eyebrow,
  title,
  status,
  children
}: {
  eyebrow: string;
  title: string;
  status?: string | null;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <section className="rounded-[10px] border border-[var(--color-border-subtle)] bg-white p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase text-[var(--color-text-tertiary)]">{eyebrow}</p>
          <h3 className="mt-1 text-sm font-semibold">{title}</h3>
        </div>
        {status ? (
          <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-medium text-sky-700">
            {status}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function navigationButtonClassName(active: boolean): string {
  return [
    'flex w-full items-center justify-between rounded-[8px] border px-3 py-2.5 text-left transition',
    active
      ? 'border-sky-200 bg-sky-50 text-sky-800'
      : 'border-[var(--color-border-subtle)] bg-white text-[var(--color-text-secondary)] hover:border-sky-200 hover:text-sky-700'
  ].join(' ');
}

function diagramRowClassName(active: boolean): string {
  return [
    'flex w-full items-center justify-between gap-3 rounded-[8px] border px-3 py-3 transition',
    active
      ? 'border-sky-200 bg-sky-50 text-sky-800'
      : 'border-[var(--color-border-subtle)] bg-white text-[var(--color-text-primary)] hover:border-sky-200'
  ].join(' ');
}

function compactInputClassName(): string {
  return 'h-10 w-full rounded-[8px] border border-[var(--color-border-default)] bg-white px-3 text-sm text-[var(--color-text-primary)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] disabled:cursor-not-allowed disabled:bg-slate-100';
}

function compactSelectClassName(extra = ''): string {
  return `h-10 rounded-[8px] border border-[var(--color-border-default)] bg-white px-3 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-accent)] disabled:cursor-not-allowed disabled:bg-slate-100 ${extra}`.trim();
}

function textareaClassName(extra = ''): string {
  return `min-h-[7rem] w-full rounded-[8px] border border-[var(--color-border-default)] bg-white px-3 py-2.5 font-mono text-xs leading-6 text-[var(--color-text-primary)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] disabled:cursor-not-allowed disabled:bg-slate-100 ${extra}`.trim();
}

function primaryButtonClassName(extra = ''): string {
  return `inline-flex h-10 items-center rounded-[8px] bg-[var(--color-accent)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 ${extra}`.trim();
}

function secondaryButtonClassName(extra = ''): string {
  return `inline-flex h-10 items-center rounded-[8px] border border-[var(--color-border-default)] bg-white px-4 text-sm font-medium text-[var(--color-text-secondary)] transition hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 ${extra}`.trim();
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
