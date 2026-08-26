export const ROOT_PATH = '/';

export interface PathAware {
  id: string;
  path: string;
  depth: number;
}

export function childPath(parent: PathAware | null): string {
  return parent ? `${parent.path}${parent.id}/` : ROOT_PATH;
}

export function childDepth(parent: PathAware | null): number {
  return parent ? parent.depth + 1 : 0;
}

export function subtreePrefix(node: PathAware): string {
  return `${node.path}${node.id}/`;
}

export function ancestorIds(node: Pick<PathAware, 'path'>): string[] {
  return node.path.split('/').filter(Boolean);
}

export function isDescendantOf(candidate: PathAware, ancestor: PathAware): boolean {
  return candidate.path.startsWith(subtreePrefix(ancestor));
}

export function rebuildPath(currentPath: string, oldPrefix: string, newPrefix: string): string {
  return `${newPrefix}${currentPath.slice(oldPrefix.length)}`;
}
