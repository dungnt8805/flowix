import { Diagram } from './diagram';
import { DiagramType } from './diagram-type';

describe('Diagram', () => {
  it('should create a diagram with trimmed title and source', () => {
    const diagram = Diagram.create({
      workspaceId: '22222222-2222-4222-8222-222222222222',
      projectId: '33333333-3333-4333-8333-333333333333',
      title: ' System Design ',
      sourceCode: ' flowchart LR\nA-->B ',
      diagramType: DiagramType.FLOWCHART,
      createdBy: '11111111-1111-4111-8111-111111111111'
    });

    expect(diagram.title).toBe('System Design');
    expect(diagram.sourceCode).toBe('flowchart LR\nA-->B');
    expect(diagram.diagramType).toBe(DiagramType.FLOWCHART);
  });

  it('should reject empty titles', () => {
    expect(() =>
      Diagram.create({
        workspaceId: '22222222-2222-4222-8222-222222222222',
        projectId: '33333333-3333-4333-8333-333333333333',
        title: ' ',
        sourceCode: 'flowchart LR\nA-->B',
        createdBy: '11111111-1111-4111-8111-111111111111'
      })
    ).toThrow('Diagram title is required.');
  });

  it('should reject empty source code', () => {
    expect(() =>
      Diagram.create({
        workspaceId: '22222222-2222-4222-8222-222222222222',
        projectId: '33333333-3333-4333-8333-333333333333',
        title: 'System Design',
        sourceCode: ' ',
        createdBy: '11111111-1111-4111-8111-111111111111'
      })
    ).toThrow('Diagram source code is required.');
  });
});
