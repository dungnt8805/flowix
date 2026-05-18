export function buildWorkspaceSlug(name: string, seed: string): string {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

  const base = normalized.length > 0 ? normalized : 'workspace';
  return `${base}-${seed.slice(0, 8).toLowerCase()}`;
}
