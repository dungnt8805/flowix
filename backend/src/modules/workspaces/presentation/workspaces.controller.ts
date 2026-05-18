import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuditEventSummary, AuditService } from '../../audit/audit.service';
import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { CreateProjectUseCase } from '../application/use-cases/create-project.use-case';
import { CreateWorkspaceUseCase } from '../application/use-cases/create-workspace.use-case';
import { ListProjectsUseCase } from '../application/use-cases/list-projects.use-case';
import { ListWorkspacesUseCase } from '../application/use-cases/list-workspaces.use-case';
import { WorkspaceMembersService, WorkspaceMemberSummary } from '../application/workspace-members.service';
import { CreateProjectRequest } from './dto/create-project.request';
import { CreateWorkspaceRequest } from './dto/create-workspace.request';
import { AddWorkspaceMemberRequest, UpdateWorkspaceMemberRoleRequest } from './dto/workspace-member.request';
import { ProjectResponse, toProjectResponse } from './dto/project.response';
import { WorkspaceResponse, toWorkspaceResponse, toWorkspaceWithRoleResponse } from './dto/workspace.response';
import { WorkspaceMemberRole } from '../domain/workspace-member-role';
import { WorkspacePolicyService, WorkspacePolicySummary } from '../application/workspace-policy.service';

interface UpdateWorkspacePolicyRequest {
  allowShareLinks?: boolean;
  allowExports?: boolean;
  retentionDays?: number;
  ssoRequired?: boolean;
}

@ApiTags('Workspaces')
@ApiBearerAuth()
@Controller('workspaces')
export class WorkspacesController {
  constructor(
    private readonly createWorkspaceUseCase: CreateWorkspaceUseCase,
    private readonly listWorkspacesUseCase: ListWorkspacesUseCase,
    private readonly createProjectUseCase: CreateProjectUseCase,
    private readonly listProjectsUseCase: ListProjectsUseCase,
    private readonly workspacePolicyService: WorkspacePolicyService,
    private readonly workspaceMembersService: WorkspaceMembersService,
    private readonly auditService: AuditService
  ) {}

  @Post()
  async createWorkspace(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateWorkspaceRequest
  ): Promise<WorkspaceResponse> {
    const workspace = await this.createWorkspaceUseCase.execute({
      user,
      name: body.name
    });

    return toWorkspaceResponse(workspace, WorkspaceMemberRole.OWNER);
  }

  @Get()
  async listWorkspaces(@CurrentUser() user: AuthenticatedUser): Promise<WorkspaceResponse[]> {
    const workspaces = await this.listWorkspacesUseCase.execute(user);
    return workspaces.map(toWorkspaceWithRoleResponse);
  }

  @Post(':workspaceId/projects')
  async createProject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Body() body: CreateProjectRequest
  ): Promise<ProjectResponse> {
    const project = await this.createProjectUseCase.execute({
      user,
      workspaceId,
      name: body.name,
      description: body.description
    });

    return toProjectResponse(project);
  }

  @Get(':workspaceId/projects')
  async listProjects(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string
  ): Promise<ProjectResponse[]> {
    const projects = await this.listProjectsUseCase.execute(user, workspaceId);
    return projects.map(toProjectResponse);
  }

  @Get(':workspaceId/members')
  listMembers(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string
  ): Promise<WorkspaceMemberSummary[]> {
    return this.workspaceMembersService.listMembers(user, workspaceId);
  }

  @Post(':workspaceId/members')
  async addMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Body() body: AddWorkspaceMemberRequest
  ): Promise<WorkspaceMemberSummary> {
    const member = await this.workspaceMembersService.addMember({
      actor: user,
      workspaceId,
      email: body.email,
      role: body.role
    });
    await this.auditService.record({
      workspaceId,
      actor: user,
      action: 'workspace.member_add',
      targetType: 'workspace_member',
      targetId: member.userId,
      metadata: { role: member.role, email: member.email }
    });
    return member;
  }

  @Patch(':workspaceId/members/:userId')
  async updateMemberRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() body: UpdateWorkspaceMemberRoleRequest
  ): Promise<WorkspaceMemberSummary> {
    const member = await this.workspaceMembersService.updateRole({
      actor: user,
      workspaceId,
      userId,
      role: body.role
    });
    await this.auditService.record({
      workspaceId,
      actor: user,
      action: 'workspace.member_role_update',
      targetType: 'workspace_member',
      targetId: userId,
      metadata: { role: member.role }
    });
    return member;
  }

  @Delete(':workspaceId/members/:userId')
  async removeMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string
  ): Promise<{ removed: true }> {
    await this.workspaceMembersService.removeMember({ actor: user, workspaceId, userId });
    await this.auditService.record({
      workspaceId,
      actor: user,
      action: 'workspace.member_remove',
      targetType: 'workspace_member',
      targetId: userId
    });
    return { removed: true };
  }

  @Get(':workspaceId/policies')
  async getWorkspacePolicy(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string
  ): Promise<WorkspacePolicySummary> {
    await this.workspacePolicyService.requireAdmin(user, workspaceId);
    return this.workspacePolicyService.getPolicy(workspaceId);
  }

  @Patch(':workspaceId/policies')
  async updateWorkspacePolicy(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Body() body: UpdateWorkspacePolicyRequest
  ): Promise<WorkspacePolicySummary> {
    const policy = await this.workspacePolicyService.updatePolicy(user, workspaceId, body);
    await this.auditService.record({
      workspaceId,
      actor: user,
      action: 'workspace.policy_update',
      targetType: 'workspace_policy',
      targetId: workspaceId,
      metadata: { ...policy }
    });
    return policy;
  }

  @Get(':workspaceId/audit-events')
  async listAuditEvents(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string
  ): Promise<AuditEventSummary[]> {
    await this.workspacePolicyService.requireAdmin(user, workspaceId);
    return this.auditService.listForWorkspace(workspaceId);
  }

  @Get(':workspaceId/enterprise-identity')
  async getEnterpriseIdentityPath(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string
  ): Promise<{
    workspaceId: string;
    strategy: 'oidc';
    status: 'specified';
    loginUrl: string;
    requiredClaims: string[];
  }> {
    await this.workspacePolicyService.requireAdmin(user, workspaceId);
    return {
      workspaceId,
      strategy: 'oidc',
      status: 'specified',
      loginUrl: '/api/v1/auth/oidc/start',
      requiredClaims: ['sub', 'email', 'workspace_id']
    };
  }
}
