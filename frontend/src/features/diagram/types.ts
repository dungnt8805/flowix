export interface DiagramDraft {
  title: string;
  sourceCode: string;
  themeConfig: DiagramThemeConfig;
}

export type DiagramThemeName = 'default' | 'forest' | 'dark' | 'neutral';

export interface DiagramThemeConfig {
  theme: DiagramThemeName;
}
