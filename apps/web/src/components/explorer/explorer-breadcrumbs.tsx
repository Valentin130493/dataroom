'use client';

import Link from 'next/link';
import type { BreadcrumbItem as Crumb } from '@dataroom/shared';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';

interface ExplorerBreadcrumbsProps {
  rootLabel: string;
  trail: Crumb[];
  currentName: string | null;
  isStale?: boolean;
  buildHref: (nodeId: string | null) => string;
}

export function ExplorerBreadcrumbs({
  rootLabel,
  trail,
  currentName,
  isStale = false,
  buildHref,
}: ExplorerBreadcrumbsProps) {
  const isAtRoot = currentName === null && trail.length === 0;

  return (
    <Breadcrumb className={cn(isStale && 'opacity-70')}>
      <BreadcrumbList>
        <BreadcrumbItem>
          {isAtRoot ? (
            <BreadcrumbPage className="max-w-[16rem] truncate">{rootLabel}</BreadcrumbPage>
          ) : (
            <BreadcrumbLink asChild>
              <Link href={buildHref(null)} className="max-w-[12rem] truncate">
                {rootLabel}
              </Link>
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>

        {trail.map((crumb) => (
          <BreadcrumbItem key={crumb.id}>
            <BreadcrumbSeparator />
            <BreadcrumbLink asChild>
              <Link href={buildHref(crumb.id)} className="max-w-[12rem] truncate">
                {crumb.name}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
        ))}

        {currentName ? (
          <BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbPage className="max-w-[16rem] truncate">{currentName}</BreadcrumbPage>
          </BreadcrumbItem>
        ) : null}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
