import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { ListProjectDiagramsUseCase } from '../application/use-cases/list-project-diagrams.use-case';
import { DiagramResponse, toDiagramResponse } from './dto/diagram.response';

@ApiTags('Diagrams')
@ApiBearerAuth()
@Controller('projects/:projectId/diagrams')
export class ProjectDiagramsController {
  constructor(private readonly listProjectDiagramsUseCase: ListProjectDiagramsUseCase) {}

  @Get()
  async listProjectDiagrams(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', new ParseUUIDPipe()) projectId: string
  ): Promise<DiagramResponse[]> {
    const diagrams = await this.listProjectDiagramsUseCase.execute(user, projectId);
    return diagrams.map(toDiagramResponse);
  }
}
