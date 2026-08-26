import { FileText, Folder } from 'lucide-react';
import { NodeType } from '@dataroom/shared';
import { cn } from '@/lib/utils';

export function NodeIcon({ type, className }: { type: NodeType; className?: string }) {
  const isFolder = type === NodeType.FOLDER;
  const Icon = isFolder ? Folder : FileText;

  return (
    <span
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-md',
        isFolder ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
        className,
      )}
    >
      <Icon className="size-4" />
    </span>
  );
}
