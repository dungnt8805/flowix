import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { Diagram } from '../domain/diagram';
import { ListProjectDiagramsUseCase } from '../application/use-cases/list-project-diagrams.use-case';
import { ProjectDiagramsController } from './project-diagrams.controller';

describe('ProjectDiagramsController', () => {
  it('lists diagrams for a project', async () => {
    const user: AuthenticatedUser = {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'user@example.com',
      displayName: 'Workspace User'
    };
    const diagram = Diagram.create({
      id: '44444444-4444-4444-8444-444444444444',
      workspaceId: '22222222-2222-4222-8222-222222222222',
      projectId: '33333333-3333-4333-8333-333333333333',
      title: 'System context',
      sourceCode: 'flowchart LR\nA-->B',
      createdBy: user.id
    });
    const execute = jest.fn().mockResolvedValue([diagram]);
    const controller = new ProjectDiagramsController({
      execute
    } as unknown as ListProjectDiagramsUseCase);

    const response = await controller.listProjectDiagrams(user, diagram.projectId);

    expect(execute).toHaveBeenCalledWith(user, diagram.projectId);
    expect(response).toEqual([
      {
        id: '44444444-4444-4444-8444-444444444444',
        workspaceId: '22222222-2222-4222-8222-222222222222',
        projectId: '33333333-3333-4333-8333-333333333333',
        title: 'System context',
        description: null,
        sourceCode: 'flowchart LR\nA-->B',
        diagramType: 'unknown',
        themeConfig: { theme: 'default' }
      }
    ]);
  });
});
