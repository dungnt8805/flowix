import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../../../../common/auth/authenticated-user';
import { ExportDiagramSourceUseCase } from './export-diagram-source.use-case';

export interface RequestDiagramSvgExportQuery {
  user: AuthenticatedUser;
  diagramId: string;
}

export interface DiagramSvgExportStatus {
  status: 'not_available';
  format: 'svg';
  message: string;
}

@Injectable()
export class RequestDiagramSvgExportUseCase {
  constructor(private readonly exportDiagramSourceUseCase: ExportDiagramSourceUseCase) {}

  async execute(query: RequestDiagramSvgExportQuery): Promise<DiagramSvgExportStatus> {
    await this.exportDiagramSourceUseCase.execute(query);

    return {
      status: 'not_available',
      format: 'svg',
      message: 'SVG export requires the renderer job pipeline and is not available in this sprint.'
    };
  }
}
