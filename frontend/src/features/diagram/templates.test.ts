import { describe, expect, it } from 'vitest';
import { diagramTemplates, getDiagramTemplate } from './templates';

describe('diagramTemplates', () => {
  it('includes starter templates for blank, system, sequence, and state charts', () => {
    expect(diagramTemplates.map((template) => template.id)).toEqual([
      'blank-flowchart',
      'system-design',
      'sequence-flow',
      'state-machine'
    ]);
  });

  it('keeps every starter template renderable with non-empty source', () => {
    for (const template of diagramTemplates) {
      expect(template.name.length).toBeGreaterThan(0);
      expect(template.description.length).toBeGreaterThan(0);
      expect(template.sourceCode.trim().length).toBeGreaterThan(0);
      expect(['flowchart', 'sequence', 'state']).toContain(template.diagramType);
    }
  });

  it('falls back to the blank flowchart when a template id is unknown', () => {
    expect(getDiagramTemplate('missing-template')).toBe(diagramTemplates[0]);
  });
});
