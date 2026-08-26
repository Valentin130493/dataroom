import Link from 'next/link';
import { LinkIcon, LockKeyhole } from 'lucide-react';
import { ErrorCode } from '@dataroom/shared';
import { Button } from '@/components/ui/button';
import type { ApiError } from '@/lib/api/http';

const MESSAGES: Partial<Record<string, { title: string; detail: string }>> = {
  [ErrorCode.SHARE_REVOKED]: {
    title: 'This link was revoked',
    detail: 'The owner turned off public access to this item.',
  },
  [ErrorCode.SHARE_EXPIRED]: {
    title: 'This link has expired',
    detail: 'Ask the owner for a fresh link.',
  },
  [ErrorCode.GONE]: {
    title: 'This item is no longer available',
    detail: 'It was deleted by its owner.',
  },
};

interface PublicShareErrorProps {
  error: ApiError;
  backHref?: string;
}

export function PublicShareError({ error, backHref }: PublicShareErrorProps) {
  const known = MESSAGES[error.code];
  const Icon = known ? LockKeyhole : LinkIcon;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </span>

      <div className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight">{known?.title ?? 'Link not found'}</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          {known?.detail ?? 'Double-check the address, or ask the owner to share it again.'}
        </p>
      </div>

      {backHref ? (
        <Button asChild variant="outline">
          <Link href={backHref}>Back to the shared folder</Link>
        </Button>
      ) : null}
    </main>
  );
}
