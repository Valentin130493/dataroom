'use client';

import { useQuery } from '@tanstack/react-query';
import { storageApi } from '@/lib/api/endpoints';
import { formatBytes, pluralize } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
    return <Skeleton className="hidden h-6 w-32 rounded-full sm:block" />;
  }

  const fraction = data.quotaBytes === 0 ? 0 : Math.min(data.usedBytes / data.quotaBytes, 1);
  const percent = Math.round(fraction * 100);

  const barColor =
    fraction >= FULL_AT
      ? 'bg-destructive'
      : fraction >= WARN_AT
        ? 'bg-[color:var(--warning)]'
        : 'bg-primary';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 rounded-full border px-2.5 py-1">
          <div
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Storage used: ${percent} percent`}
            className="h-1.5 w-14 overflow-hidden rounded-full bg-muted sm:w-20"
          >
            <div
              className={cn('h-full rounded-full transition-[width] duration-500', barColor)}
              style={{ width: `${Math.max(percent, 2)}%` }}
            />
          </div>

          <span className="hidden text-xs text-muted-foreground tabular-nums sm:inline">
            {formatBytes(data.usedBytes)} / {formatBytes(data.quotaBytes)}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums sm:hidden">{percent}%</span>
        </div>
      </TooltipTrigger>

      <TooltipContent>
        {formatBytes(data.usedBytes)} of {formatBytes(data.quotaBytes)} used ·{' '}
        {pluralize(data.objectCount, 'document')}
      </TooltipContent>
    </Tooltip>
  );
}
