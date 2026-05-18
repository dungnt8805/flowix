import { DiagramSummary } from '@/features/workspace/types';

export interface DiagramTemplate {
  id: string;
  name: string;
  description: string;
  diagramType: DiagramSummary['diagramType'];
  sourceCode: string;
}

export const diagramTemplates: DiagramTemplate[] = [
  {
    id: 'blank-flowchart',
    name: 'Blank flowchart',
    description: 'Minimal blank Mermaid flow for freeform editing',
    diagramType: 'flowchart',
    sourceCode: `flowchart LR
  Start[Start] --> Draft[Edit Mermaid source]
  Draft --> Preview[Preview chart]`
  },
  {
    id: 'system-design',
    name: 'System design',
    description: 'Frontend, API, database, and renderer boundary',
    diagramType: 'flowchart',
    sourceCode: `flowchart LR
  User[User] --> Web[Next.js Frontend]
  Web --> API[NestJS API]
  API --> DB[(PostgreSQL)]
  API --> Renderer[Mermaid Renderer]`
  },
  {
    id: 'sequence-flow',
    name: 'Sequence flow',
    description: 'Request and response path between actors',
    diagramType: 'sequence',
    sourceCode: `sequenceDiagram
  participant User
  participant Web as Frontend
  participant API as Backend API
  User->>Web: Start action
  Web->>API: Send request
  API-->>Web: Return response`
  },
  {
    id: 'state-machine',
    name: 'State machine',
    description: 'Simple lifecycle states and transitions',
    diagramType: 'state',
    sourceCode: `stateDiagram-v2
  [*] --> Draft
  Draft --> Review
  Review --> Published
  Review --> Draft
  Published --> [*]`
  }
];

export function getDiagramTemplate(templateId: string): DiagramTemplate {
  return diagramTemplates.find((template) => template.id === templateId) ?? diagramTemplates[0];
}
