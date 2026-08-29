'use client';

import { useQuery } from '@tanstack/react-query';
import { HardDrive } from 'lucide-react';
import { storageApi } from '@/lib/api/endpoints';
import { formatBytes, pluralize } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const WARN_AT = 0.75;
const FULL_AT = 0.9;

export function StorageMeter() {
  const { data, isPending } = useQuery({
    queryKey: queryKeys.storageUsage,
    queryFn: storageApi.usage,
    staleTime: 30_000,
  });

  if (isPending || !data) {
    return <Skeleton className="h-14 w-full rounded-xl sm:w-72" />;
  }

  const fraction = data.quotaBytes === 0 ? 0 : Math.min(data.usedBytes / data.quotaBytes, 1);
  const percent = Math.round(fraction * 100);

  return (
    <div className="w-full rounded-xl border bg-card px-3.5 py-2.5 sm:w-72">
      <div className="flex items-center gap-2 text-sm">
        <HardDrive className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="font-medium">
          {formatBytes(data.usedBytes)} <span className="text-muted-foreground">of</span>{' '}
          {formatBytes(data.quotaBytes)}
        </span>
        <span className="ml-auto text-xs text-muted-foreground">{percent}%</span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Storage used"
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-500',
            fraction >= FULL_AT
              ? 'bg-destructive'
              : fraction >= WARN_AT
                ? 'bg-[color:var(--warning)]'
                : 'bg-primary',
          )}
          style={{ width: `${Math.max(percent, 2)}%` }}
        />
      </div>

      <p className="mt-1.5 text-xs text-muted-foreground">
        {pluralize(data.objectCount, 'document')} stored
      </p>
    </div>
  );
}
