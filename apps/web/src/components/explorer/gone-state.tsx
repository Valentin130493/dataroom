import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/empty-state';

interface GoneStateProps {
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
}

export function GoneState({ title, description, backHref, backLabel }: GoneStateProps) {
  return (
    <EmptyState
      icon={FileQuestion}
      title={title}
      description={description}
      action={
        <Button asChild variant="outline">
          <Link href={backHref}>{backLabel}</Link>
        </Button>
      }
    />
  );
}
