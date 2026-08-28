'use client';

import { useState, type ComponentProps } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function PasswordInput({ className, ...props }: ComponentProps<typeof Input>) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        type={isVisible ? 'text' : 'password'}
        className={cn('pr-9', className)}
      />

      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        tabIndex={-1}
        aria-label={isVisible ? 'Hide password' : 'Show password'}
        aria-pressed={isVisible}
        className="absolute inset-y-0 right-1 my-auto text-muted-foreground"
        onClick={() => setIsVisible((value) => !value)}
      >
        {isVisible ? <EyeOff /> : <Eye />}
      </Button>
    </div>
  );
}
