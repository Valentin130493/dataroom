import type { NodeSummary } from '@dataroom/shared';

export interface NodeActions {
  onRename?: (node: NodeSummary) => void;
  onMove?: (node: NodeSummary) => void;
  onShare?: (node: NodeSummary) => void;
  onDelete?: (node: NodeSummary) => void;
  onDownload?: (node: NodeSummary) => void;
}

export function hasAnyAction(actions: NodeActions): boolean {
  return Object.values(actions).some(Boolean);
}
