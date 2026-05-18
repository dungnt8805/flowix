'use client';

import { FormEvent, useEffect, useState } from 'react';
import { DiagramDraft } from '@/features/diagram/types';
import { DiagramEditorScreen } from '@/features/diagram/components/DiagramEditorScreen';
import { diagramTemplates, getDiagramTemplate } from '@/features/diagram/templates';
import { MermaidPreview } from '@/features/renderer/components/MermaidPreview';
import {
  createBrowserAuthTokenStore,
  createBrowserFloVisApiClient,
  WorkspaceProjectApi
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

  const workspaceProjects = projects.filter((project) => project.workspaceId === selectedWorkspaceId);
  const projectDiagrams = diagrams.filter((diagram) => diagram.projectId === selectedProjectId);
  const selectedWorkspace = workspaces.find((workspace) => workspace.id === selectedWorkspaceId);
  const selectedProject = projects.find((project) => project.id === selectedProjectId);
  const selectedDiagram = diagrams.find((diagram) => diagram.id === selectedDiagramId);
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
    <main className="workspace-shell">
      <aside className="workspace-rail" aria-label="Workspace navigation">
        <div className="brand-lockup">
          <span className="brand-mark">FV</span>
          <div>
            <h1>Flo Vis</h1>
            <p>Mermaid workbench</p>
          </div>
        </div>

        <form className="compact-form" onSubmit={(event) => void createWorkspace(event)}>
          <label htmlFor="workspace-name">Workspace</label>
          <div className="inline-form-row">
            <input
              id="workspace-name"
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
              placeholder="New workspace"
            />
            <button type="submit">Create</button>
          </div>
        </form>

        <nav className="nav-stack" aria-label="Workspaces">
          {workspaces.map((workspace) => (
            <button
              className={workspace.id === selectedWorkspaceId ? 'nav-item active' : 'nav-item'}
              key={workspace.id}
              type="button"
              onClick={() => {
                setSelectedWorkspaceId(workspace.id);
                const nextProjectId =
                  projects.find((project) => project.workspaceId === workspace.id)?.id ?? '';
                setSelectedProjectId(nextProjectId);
                setSelectedDiagramId(
                  diagrams.find((diagram) => diagram.projectId === nextProjectId)?.id ?? ''
                );
              }}
            >
              <span>{workspace.name}</span>
              <small>{workspace.slug}</small>
            </button>
          ))}
        </nav>

        <form className="compact-form" onSubmit={(event) => void createProject(event)}>
          <label htmlFor="project-name">Project</label>
          <div className="inline-form-row">
            <input
              id="project-name"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              placeholder="New project"
              disabled={!canCreateProjects}
            />
            <button type="submit" disabled={!canCreateProjects}>Add</button>
          </div>
        </form>

        <nav className="nav-stack" aria-label="Projects">
          {workspaceProjects.length === 0 ? (
            <p className="empty-copy">No projects yet.</p>
          ) : (
            workspaceProjects.map((project) => (
              <button
                className={project.id === selectedProjectId ? 'nav-item active' : 'nav-item'}
                key={project.id}
                type="button"
                onClick={() => {
                  setSelectedProjectId(project.id);
                  setSelectedDiagramId(
                    diagrams.find((diagram) => diagram.projectId === project.id)?.id ?? ''
                  );
                }}
              >
                <span>{project.name}</span>
                <small>{project.description ?? 'No description'}</small>
              </button>
            ))
          )}
        </nav>
      </aside>

      <div className="workspace-main">
        <header className="topbar">
          <div>
            <p className="eyebrow">{selectedWorkspace?.name ?? 'Workspace'}</p>
            <h2>{selectedProject?.name ?? 'Project setup'}</h2>
          </div>
          <div className="topbar-actions">
            <a className="text-link" href="/login">
              Sign in
            </a>
            <button className="text-button" type="button" onClick={handleLogout}>
              Log out
            </button>
            <span className="status">{isSyncing ? 'Syncing API data' : 'Sprint 3 API-ready shell'}</span>
          </div>
        </header>

        {syncError === null ? null : (
          <div className="sync-error" role="alert">
            {syncError}
          </div>
        )}

        <section className="diagram-list-band" aria-label="Project diagrams">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Project diagrams</p>
              <h3>{projectDiagrams.length} charts</h3>
            </div>
            <div className="template-create-controls">
              <label htmlFor="diagram-template">Template</label>
              <select
                id="diagram-template"
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
                className="primary-action"
                type="button"
                onClick={() => void createDiagram()}
                disabled={selectedProjectId.length === 0 || !canEditDiagram}
              >
                New diagram
              </button>
            </div>
          </div>

          {projectDiagrams.length === 0 ? (
            <div className="diagram-empty-state">
              <h3>No diagrams in this project</h3>
              <p>Create the first Mermaid chart for {selectedProject?.name ?? 'this project'}.</p>
            </div>
          ) : (
            <div className="diagram-list">
              {projectDiagrams.map((diagram) => (
                <button
                  className={diagram.id === selectedDiagramId ? 'diagram-row active' : 'diagram-row'}
                  key={diagram.id}
                  type="button"
                  onClick={() => setSelectedDiagramId(diagram.id)}
                >
                  <span>
                    <strong>{diagram.title}</strong>
                    <small>{diagram.description ?? 'No description'}</small>
                  </span>
                  <span className="diagram-meta">
                    {diagram.diagramType} / {diagram.updatedAtLabel}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <div className="presentation-toolbar">
          <button className="secondary-action" type="button" onClick={() => setPresentationMode((value) => !value)}>
            {presentationMode ? 'Exit presentation' : 'Present'}
          </button>
          <button className="secondary-action" type="button" onClick={() => void exportSource()}>
            Export
          </button>
          <button
            className="secondary-action"
            type="button"
            onClick={() => void createShareLink()}
            disabled={!canEditDiagram}
          >
            Share
          </button>
        </div>

        {presentationMode && selectedDiagram !== undefined ? (
          <section className="presentation-stage" aria-label="Presentation mode">
            <div className="presentation-copy">
              <p className="eyebrow">{selectedWorkspace?.name ?? 'Workspace'}</p>
              <h2>{selectedDiagram.title}</h2>
            </div>
            <MermaidPreview source={selectedDiagram.sourceCode} theme={selectedDiagram.themeConfig.theme} />
          </section>
        ) : (
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
            draftKey={selectedDiagram?.id ?? 'empty'}
            onSave={selectedDiagram === undefined || !canEditDiagram ? undefined : saveSelectedDiagram}
            statusLabel={canEditDiagram ? 'Editor role can save' : 'Read-only role'}
          />
        )}

        <section className="import-band" aria-label="Import diagrams">
          <div className="utility-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Import</p>
                <h3>Mermaid source</h3>
              </div>
            </div>
            <textarea
              aria-label="Imported .mmd content"
              value={importSource}
              onChange={(event) => setImportSource(event.target.value)}
              placeholder="Paste .mmd source"
              disabled={!canEditDiagram}
            />
            <button className="secondary-action" type="button" onClick={() => void importMermaidSource()} disabled={!canEditDiagram}>
              Import .mmd
            </button>
          </div>
          <div className="utility-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Markdown</p>
                <h3>{markdownBlocks.length} blocks</h3>
              </div>
            </div>
            <textarea
              aria-label="Markdown Mermaid import"
              value={markdownSource}
              onChange={(event) => setMarkdownSource(event.target.value)}
              placeholder="Paste Markdown with ```mermaid blocks"
              disabled={!canEditDiagram}
            />
            <button className="secondary-action" type="button" onClick={() => void parseMarkdownSource()} disabled={!canEditDiagram}>
              Detect blocks
            </button>
            <div className="version-list">
              {markdownBlocks.map((block) => (
                <button className="diagram-row" key={block.index} type="button" onClick={() => void importMarkdownBlock(block)} disabled={!canEditDiagram}>
                  <span>
                    <strong>{block.title}</strong>
                    <small>{block.sourceCode.split('\n')[0]}</small>
                  </span>
                  <span className="diagram-meta">Import</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {selectedDiagram === undefined ? null : (
          <section className="diagram-utilities" aria-label="Diagram utilities">
            <div className="utility-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Versions</p>
                  <h3>{diagramVersions.length} snapshots</h3>
                </div>
                {restoreMessage === null ? null : <span className="status">{restoreMessage}</span>}
              </div>
              <div className="version-list">
                {diagramVersions.length === 0 ? (
                  <p className="empty-copy">No versions yet.</p>
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

            <div className="utility-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Export</p>
                  <h3>Portable source</h3>
                </div>
                {exportMessage === null ? null : <span className="status">{exportMessage}</span>}
              </div>
              <button className="secondary-action" type="button" onClick={() => void exportSource()}>
                Export .mmd
              </button>
            </div>

            <div className="utility-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Share</p>
                  <h3>Read-only links</h3>
                </div>
                {shareMessage === null ? null : <span className="status">{shareMessage}</span>}
              </div>
              <button
                className="secondary-action"
                type="button"
                onClick={() => void createShareLink()}
                disabled={!canEditDiagram}
              >
                New share link
              </button>
              <div className="version-list">
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

            <div className="utility-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Comments</p>
                  <h3>{diagramComments.length} open notes</h3>
                </div>
                {commentMessage === null ? null : <span className="status">{commentMessage}</span>}
              </div>
              <form className="comment-form" onSubmit={(event) => void createComment(event)}>
                <label htmlFor="diagram-comment">Comment</label>
                <textarea
                  id="diagram-comment"
                  value={commentBody}
                  onChange={(event) => setCommentBody(event.target.value)}
                  placeholder="Leave review feedback"
                  disabled={!canCommentDiagram}
                />
                <button className="secondary-action" type="submit" disabled={!canCommentDiagram}>
                  Add comment
                </button>
              </form>
              <div className="version-list">
                {diagramComments.length === 0 ? (
                  <p className="empty-copy">No comments yet.</p>
                ) : (
                  diagramComments.map((comment) => (
                    <article className="diagram-row comment-row" key={comment.id}>
                      <span>
                        <strong>{comment.body}</strong>
                        <small>{new Date(comment.createdAt).toLocaleString()}</small>
                      </span>
                      <button
                        className="inline-row-action"
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
          </section>
        )}

        <section className="diagram-utilities" aria-label="Enterprise governance">
          <div className="utility-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Policies</p>
                <h3>Workspace controls</h3>
              </div>
              {governanceMessage === null ? null : <span className="status">{governanceMessage}</span>}
            </div>
            {workspacePolicy === null ? (
              <p className="empty-copy">Policy settings unavailable.</p>
            ) : (
              <div className="policy-grid">
                <label>
                  <input
                    type="checkbox"
                    checked={workspacePolicy.allowShareLinks}
                    onChange={(event) => void updatePolicy({ allowShareLinks: event.target.checked })}
                    disabled={!canManageWorkspace}
                  />
                  Share links
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={workspacePolicy.allowExports}
                    onChange={(event) => void updatePolicy({ allowExports: event.target.checked })}
                    disabled={!canManageWorkspace}
                  />
                  Exports
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={workspacePolicy.ssoRequired}
                    onChange={(event) => void updatePolicy({ ssoRequired: event.target.checked })}
                    disabled={!canManageWorkspace}
                  />
                  SSO required
                </label>
                <label>
                  Retention days
                  <input
                    type="number"
                    min="30"
                    max="3650"
                    value={workspacePolicy.retentionDays}
                    onChange={(event) => void updatePolicy({ retentionDays: Number(event.target.value) })}
                    disabled={!canManageWorkspace}
                  />
                </label>
                <button className="secondary-action" type="button" onClick={() => void enforceRetention()} disabled={!canManageWorkspace}>
                  Enforce retention
                </button>
              </div>
            )}
          </div>
          <div className="utility-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Members</p>
                <h3>{workspaceMembers.length} people</h3>
              </div>
            </div>
            <form className="member-form" onSubmit={(event) => void addWorkspaceMember(event)}>
              <input
                aria-label="Member email"
                type="email"
                placeholder="member@example.com"
                value={memberEmail}
                onChange={(event) => setMemberEmail(event.target.value)}
                disabled={!canManageWorkspace}
              />
              <select
                aria-label="Member role"
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
              <button className="secondary-action" type="submit" disabled={!canManageWorkspace}>
                Add member
              </button>
            </form>
            <div className="version-list">
              {workspaceMembers.length === 0 ? (
                <p className="empty-copy">No members loaded.</p>
              ) : (
                workspaceMembers.slice(0, 6).map((member) => (
                  <article className="diagram-row comment-row" key={member.id}>
                    <span>
                      <strong>{member.displayName ?? member.email}</strong>
                      <small>{member.email}</small>
                    </span>
                    <select
                      aria-label={`Role for ${member.email}`}
                      value={member.role}
                      onChange={(event) =>
                        void updateWorkspaceMemberRole(member.userId, event.target.value as WorkspaceRole)
                      }
                      disabled={!canManageWorkspaceMember(currentWorkspaceRole, member.role)}
                    >
                      {getAssignableWorkspaceRoles(currentWorkspaceRole).map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                    <button
                      className="secondary-action"
                      type="button"
                      onClick={() => void removeWorkspaceMember(member.userId)}
                      disabled={!canManageWorkspaceMember(currentWorkspaceRole, member.role)}
                    >
                      Remove
                    </button>
                  </article>
                ))
              )}
            </div>
            <p className="empty-copy">
              {enterpriseIdentity === null
                ? 'Enterprise identity path unavailable.'
                : `${enterpriseIdentity.loginUrl} / ${enterpriseIdentity.requiredClaims.join(', ')}`}
            </p>
          </div>
          <div className="utility-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Audit</p>
                <h3>{auditEvents.length} events</h3>
              </div>
            </div>
            <div className="version-list">
              {auditEvents.length === 0 ? (
                <p className="empty-copy">No audit events yet.</p>
              ) : (
                auditEvents.slice(0, 6).map((event) => (
                  <article className="diagram-row comment-row" key={event.id}>
                    <span>
                      <strong>{event.action}</strong>
                      <small>{new Date(event.createdAt).toLocaleString()}</small>
                    </span>
                    <span className="diagram-meta">{event.targetType}</span>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
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
