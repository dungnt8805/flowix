export type DiagramThemeName = 'default' | 'forest' | 'dark' | 'neutral';

export interface DiagramThemeConfig {
  theme: DiagramThemeName;
}

const allowedThemes = new Set<DiagramThemeName>(['default', 'forest', 'dark', 'neutral']);

export function normalizeDiagramThemeConfig(input?: DiagramThemeConfig | null): DiagramThemeConfig {
  if (input === undefined || input === null) {
    return { theme: 'default' };
  }

  if (!allowedThemes.has(input.theme)) {
    throw new Error('Diagram theme is not supported.');
  }

  return { theme: input.theme };
}
