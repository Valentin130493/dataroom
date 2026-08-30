import { FileImage, FileSpreadsheet, FileText, Folder, Presentation } from 'lucide-react';
import { NodeType, isImage } from '@dataroom/shared';
import { cn } from '@/lib/utils';

function iconFor(mimeType: string | null | undefined) {
  if (isImage(mimeType)) {
    return FileImage;
  }

  if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel') || mimeType === 'text/csv') {
    return FileSpreadsheet;
  }

  if (mimeType?.includes('presentation') || mimeType?.includes('powerpoint')) {
    return Presentation;
  }

  return FileText;
}

interface NodeIconProps {
  type: NodeType;
  mimeType?: string | null;
  className?: string;
}

export function NodeIcon({ type, mimeType, className }: NodeIconProps) {
  const isFolder = type === NodeType.FOLDER;
  const Icon = isFolder ? Folder : iconFor(mimeType);

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
