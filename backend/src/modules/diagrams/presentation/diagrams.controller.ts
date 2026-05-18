import { BadRequestException, Body, Controller, Delete, Get, Header, Inject, Param, ParseUUIDPipe, Patch, Post, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { AuditService } from '../../audit/audit.service';
import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { WorkspacePolicyService } from '../../workspaces/application/workspace-policy.service';
import { CreateDiagramUseCase } from '../application/use-cases/create-diagram.use-case';
import { CreateDiagramCommentUseCase } from '../application/use-cases/create-diagram-comment.use-case';
import { CreateDiagramShareLinkUseCase } from '../application/use-cases/create-diagram-share-link.use-case';
import { ExportDiagramSourceUseCase } from '../application/use-cases/export-diagram-source.use-case';
import { GetSharedDiagramUseCase } from '../application/use-cases/get-shared-diagram.use-case';
import { ListDiagramCommentsUseCase } from '../application/use-cases/list-diagram-comments.use-case';
import { ListDiagramVersionsUseCase } from '../application/use-cases/list-diagram-versions.use-case';
import { RequestDiagramSvgExportUseCase } from '../application/use-cases/request-diagram-svg-export.use-case';
import { RestoreDiagramVersionUseCase } from '../application/use-cases/restore-diagram-version.use-case';
import { UpdateDiagramUseCase } from '../application/use-cases/update-diagram.use-case';
import { UpdateDiagramCommentStatusUseCase } from '../application/use-cases/update-diagram-comment-status.use-case';
import { CreateDiagramCommentRequest } from './dto/create-diagram-comment.request';
import { CreateDiagramRequest } from './dto/create-diagram.request';
import { DiagramCommentResponse, toDiagramCommentResponse } from './dto/diagram-comment.response';
import { DiagramShareLinkResponse } from './dto/diagram-share-link.response';
import { DiagramVersionResponse, toDiagramVersionResponse } from './dto/diagram-version.response';
import { DiagramResponse, toDiagramResponse } from './dto/diagram.response';
import { DiagramSvgExportStatusResponse } from './dto/diagram-svg-export-status.response';
import { UpdateDiagramRequest } from './dto/update-diagram.request';
import { Public } from '../../../common/auth/public.decorator';
import { RevokeDiagramShareLinkUseCase } from '../application/use-cases/revoke-diagram-share-link.use-case';
import {
  DIAGRAM_VERSION_REPOSITORY,
  DiagramVersionRepository
} from '../application/ports/diagram-version.repository';
import { DiagramType } from '../domain/diagram-type';

interface ImportMermaidRequest {
  workspaceId: string;
  projectId: string;
  title: string;
  sourceCode: string;
}

interface MarkdownImportRequest {
  markdown: string;
}

interface MarkdownBlockResponse {
  index: number;
  title: string;
  sourceCode: string;
}

interface PublicValidateRequest {
  sourceCode: string;
}

@ApiTags('Diagrams')
@ApiBearerAuth()
@Controller('diagrams')
export class DiagramsController {
  constructor(
    private readonly createDiagramUseCase: CreateDiagramUseCase,
    private readonly updateDiagramUseCase: UpdateDiagramUseCase,
    private readonly createDiagramCommentUseCase: CreateDiagramCommentUseCase,
    private readonly listDiagramCommentsUseCase: ListDiagramCommentsUseCase,
    private readonly updateDiagramCommentStatusUseCase: UpdateDiagramCommentStatusUseCase,
    private readonly listDiagramVersionsUseCase: ListDiagramVersionsUseCase,
    private readonly restoreDiagramVersionUseCase: RestoreDiagramVersionUseCase,
    private readonly exportDiagramSourceUseCase: ExportDiagramSourceUseCase,
    private readonly requestDiagramSvgExportUseCase: RequestDiagramSvgExportUseCase,
    private readonly createDiagramShareLinkUseCase: CreateDiagramShareLinkUseCase,
    private readonly revokeDiagramShareLinkUseCase: RevokeDiagramShareLinkUseCase,
    private readonly getSharedDiagramUseCase: GetSharedDiagramUseCase,
    private readonly workspacePolicyService: WorkspacePolicyService,
    private readonly auditService: AuditService,
    @Inject(DIAGRAM_VERSION_REPOSITORY)
    private readonly diagramVersionRepository: DiagramVersionRepository
  ) {}

  @Post()
  async createDiagram(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateDiagramRequest
  ): Promise<DiagramResponse> {
    const diagram = await this.createDiagramUseCase.execute({
      user,
      workspaceId: body.workspaceId,
      projectId: body.projectId,
      title: body.title,
      description: body.description,
      sourceCode: body.sourceCode,
      diagramType: body.diagramType,
      themeConfig: body.themeConfig
    });

    await this.auditService.record({
      workspaceId: diagram.workspaceId,
      actor: user,
      action: 'diagram.create',
      targetType: 'diagram',
      targetId: diagram.id
    });

    return toDiagramResponse(diagram);
  }

  @Post('import/mmd')
  async importMermaidSource(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ImportMermaidRequest
  ): Promise<DiagramResponse> {
    validateMermaidImport(body.sourceCode);
    const diagram = await this.createDiagramUseCase.execute({
      user,
      workspaceId: body.workspaceId,
      projectId: body.projectId,
      title: body.title,
      sourceCode: body.sourceCode,
      diagramType: inferDiagramType(body.sourceCode),
      themeConfig: { theme: 'default' }
    });

    await this.auditService.record({
      workspaceId: diagram.workspaceId,
      actor: user,
      action: 'diagram.import_mmd',
      targetType: 'diagram',
      targetId: diagram.id,
      metadata: { sourceBytes: body.sourceCode.length }
    });

    return toDiagramResponse(diagram);
  }

  @Post('import/markdown-blocks')
  parseMarkdownMermaidBlocks(@Body() body: MarkdownImportRequest): MarkdownBlockResponse[] {
    if (typeof body.markdown !== 'string' || body.markdown.length > 200_000) {
      throw new BadRequestException('Markdown content must be provided and stay under 200 KB.');
    }

    return extractMermaidBlocks(body.markdown);
  }

  @Post('public/validate')
  validatePublicDiagram(@Body() body: PublicValidateRequest): {
    valid: boolean;
    diagramType: string;
    warnings: string[];
  } {
    validateMermaidImport(body.sourceCode);
    return {
      valid: true,
      diagramType: inferDiagramType(body.sourceCode),
      warnings: body.sourceCode.length > 40_000 ? ['Large diagrams may render slowly.'] : []
    };
  }

  @Post('public/render')
  renderPublicDiagram(@Body() body: PublicValidateRequest): {
    status: 'accepted';
    renderer: 'client-mermaid';
    diagramType: string;
    sourceCode: string;
  } {
    validateMermaidImport(body.sourceCode);
    return {
      status: 'accepted',
      renderer: 'client-mermaid',
      diagramType: inferDiagramType(body.sourceCode),
      sourceCode: body.sourceCode
    };
  }

  @Post('workspaces/:workspaceId/retention/enforce')
  async enforceRetention(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string
  ): Promise<{ workspaceId: string; cutoff: string; deletedVersions: number; deletedAuditEvents: number }> {
    const policy = await this.workspacePolicyService.getPolicy(workspaceId);
    await this.workspacePolicyService.requireAdmin(user, workspaceId);
    const cutoff = new Date(Date.now() - policy.retentionDays * 24 * 60 * 60 * 1000);
    const deletedVersions =
      this.diagramVersionRepository.deleteOlderThan === undefined
        ? 0
        : await this.diagramVersionRepository.deleteOlderThan(workspaceId, cutoff);
    const deletedAuditEvents = await this.auditService.purgeBefore(workspaceId, cutoff);
    await this.auditService.record({
      workspaceId,
      actor: user,
      action: 'workspace.retention_enforce',
      targetType: 'workspace',
      targetId: workspaceId,
      metadata: { cutoff: cutoff.toISOString(), deletedVersions, deletedAuditEvents }
    });
    return { workspaceId, cutoff: cutoff.toISOString(), deletedVersions, deletedAuditEvents };
  }

  @Patch(':diagramId')
  async updateDiagram(
    @CurrentUser() user: AuthenticatedUser,
    @Param('diagramId', new ParseUUIDPipe()) diagramId: string,
    @Body() body: UpdateDiagramRequest
  ): Promise<DiagramResponse> {
    const diagram = await this.updateDiagramUseCase.execute({
      user,
      diagramId,
      title: body.title,
      description: body.description,
      sourceCode: body.sourceCode,
      diagramType: body.diagramType,
      themeConfig: body.themeConfig
    });

    await this.auditService.record({
      workspaceId: diagram.workspaceId,
      actor: user,
      action: 'diagram.update',
      targetType: 'diagram',
      targetId: diagram.id
    });

    return toDiagramResponse(diagram);
  }

  @Get(':diagramId/versions')
  async listDiagramVersions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('diagramId', new ParseUUIDPipe()) diagramId: string
  ): Promise<DiagramVersionResponse[]> {
    const versions = await this.listDiagramVersionsUseCase.execute({
      user,
      diagramId
    });

    return versions.map((version) => toDiagramVersionResponse(version));
  }

  @Get(':diagramId/comments')
  async listDiagramComments(
    @CurrentUser() user: AuthenticatedUser,
    @Param('diagramId', new ParseUUIDPipe()) diagramId: string
  ): Promise<DiagramCommentResponse[]> {
    const comments = await this.listDiagramCommentsUseCase.execute(user, diagramId);
    return comments.map(toDiagramCommentResponse);
  }

  @Post(':diagramId/comments')
  async createDiagramComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('diagramId', new ParseUUIDPipe()) diagramId: string,
    @Body() body: CreateDiagramCommentRequest
  ): Promise<DiagramCommentResponse> {
    const comment = await this.createDiagramCommentUseCase.execute({
      user,
      diagramId,
      body: body.body,
      anchor: body.anchor
    });

    return toDiagramCommentResponse(comment);
  }

  @Post(':diagramId/comments/:commentId/resolve')
  async resolveDiagramComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('diagramId', new ParseUUIDPipe()) diagramId: string,
    @Param('commentId', new ParseUUIDPipe()) commentId: string
  ): Promise<DiagramCommentResponse> {
    return toDiagramCommentResponse(
      await this.updateDiagramCommentStatusUseCase.execute({
        user,
        diagramId,
        commentId,
        status: 'resolved'
      })
    );
  }

  @Post(':diagramId/comments/:commentId/reopen')
  async reopenDiagramComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('diagramId', new ParseUUIDPipe()) diagramId: string,
    @Param('commentId', new ParseUUIDPipe()) commentId: string
  ): Promise<DiagramCommentResponse> {
    return toDiagramCommentResponse(
      await this.updateDiagramCommentStatusUseCase.execute({
        user,
        diagramId,
        commentId,
        status: 'open'
      })
    );
  }

  @Post(':diagramId/versions/:versionId/restore')
  async restoreDiagramVersion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('diagramId', new ParseUUIDPipe()) diagramId: string,
    @Param('versionId', new ParseUUIDPipe()) versionId: string
  ): Promise<DiagramResponse> {
    const diagram = await this.restoreDiagramVersionUseCase.execute({
      user,
      diagramId,
      versionId
    });

    return toDiagramResponse(diagram);
  }

  @Get(':diagramId/export/source')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  async exportDiagramSource(
    @CurrentUser() user: AuthenticatedUser,
    @Param('diagramId', new ParseUUIDPipe()) diagramId: string,
    @Res({ passthrough: true }) response: Response
  ): Promise<string> {
    const exportResult = await this.exportDiagramSourceUseCase.execute({ user, diagramId });
    await this.workspacePolicyService.requireExportsAllowed(exportResult.workspaceId);
    await this.auditService.record({
      workspaceId: exportResult.workspaceId,
      actor: user,
      action: 'diagram.export_source',
      targetType: 'diagram',
      targetId: exportResult.diagramId,
      metadata: { format: 'mmd' }
    });
    response.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);

    return exportResult.sourceCode;
  }

  @Get(':diagramId/export/svg')
  async requestDiagramSvgExport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('diagramId', new ParseUUIDPipe()) diagramId: string
  ): Promise<DiagramSvgExportStatusResponse> {
    const result = await this.requestDiagramSvgExportUseCase.execute({ user, diagramId });
    return result;
  }

  @Post(':diagramId/share-links')
  async createShareLink(
    @CurrentUser() user: AuthenticatedUser,
    @Param('diagramId', new ParseUUIDPipe()) diagramId: string
  ): Promise<DiagramShareLinkResponse> {
    const link = await this.createDiagramShareLinkUseCase.execute(user, diagramId);
    await this.auditService.record({
      workspaceId: link.workspaceId,
      actor: user,
      action: 'diagram.share_link_create',
      targetType: 'share_link',
      targetId: link.id
    });
    return {
      id: link.id,
      diagramId: link.diagramId,
      token: link.token,
      url: `/share/${link.token}`,
      revokedAt: link.revokedAt?.toISOString() ?? null,
      createdAt: link.createdAt.toISOString()
    };
  }

  @Delete(':diagramId/share-links/:linkId')
  async revokeShareLink(
    @CurrentUser() user: AuthenticatedUser,
    @Param('diagramId', new ParseUUIDPipe()) diagramId: string,
    @Param('linkId', new ParseUUIDPipe()) linkId: string
  ): Promise<{ status: 'revoked' }> {
    await this.revokeDiagramShareLinkUseCase.execute(user, diagramId, linkId);
    return { status: 'revoked' };
  }

  @Public()
  @Get('shared/:token')
  async getSharedDiagram(@Param('token') token: string): Promise<DiagramResponse> {
    return toDiagramResponse(await this.getSharedDiagramUseCase.execute(token));
  }
}

function validateMermaidImport(sourceCode: string): void {
  if (typeof sourceCode !== 'string' || sourceCode.trim().length === 0) {
    throw new BadRequestException('Mermaid source is required.');
  }
  if (sourceCode.length > 100_000) {
    throw new BadRequestException('Mermaid source must stay under 100 KB.');
  }
  if (!/^\s*(flowchart|graph|sequenceDiagram|stateDiagram|classDiagram|erDiagram|gantt|journey|pie)\b/m.test(sourceCode)) {
    throw new BadRequestException('Input does not look like a supported Mermaid diagram.');
  }
}

function extractMermaidBlocks(markdown: string): MarkdownBlockResponse[] {
  const blocks: MarkdownBlockResponse[] = [];
  const regex = /```mermaid\s*\n([\s\S]*?)```/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(markdown)) !== null) {
    const sourceCode = match[1].trim();
    validateMermaidImport(sourceCode);
    blocks.push({
      index: blocks.length,
      title: `Imported block ${blocks.length + 1}`,
      sourceCode
    });
  }

  if (blocks.length === 0) {
    throw new BadRequestException('No Mermaid code blocks were found.');
  }

  return blocks;
}

function inferDiagramType(sourceCode: string): DiagramType {
  const normalized = sourceCode.trim();
  if (/^(flowchart|graph)\b/.test(normalized)) {
    return DiagramType.FLOWCHART;
  }
  if (/^sequenceDiagram\b/.test(normalized)) {
    return DiagramType.SEQUENCE;
  }
  if (/^stateDiagram\b/.test(normalized)) {
    return DiagramType.STATE;
  }
  if (/^classDiagram\b/.test(normalized)) {
    return DiagramType.CLASS;
  }
  return DiagramType.UNKNOWN;
}
