'use client';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuthConfig } from '@/hooks/use-auth';
import { API_BASE } from '@/lib/api/http';

export function GoogleButton() {
  const { data, isPending } = useAuthConfig();
  const isEnabled = data?.providers.google === true;

  const button = (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full"
      disabled={!isEnabled || isPending}
      onClick={() => {
        window.location.href = `${API_BASE}/auth/google`;
      }}
    >
      <GoogleMark />
      Continue with Google
    </Button>
  );

  if (isEnabled) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="block w-full">
          {button}
        </span>
      </TooltipTrigger>
      <TooltipContent>Google sign-in is not configured on this deployment</TooltipContent>
    </Tooltip>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.28a12 12 0 0 0 0 10.76l4.01-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.62l4.01 3.09C6.23 6.87 8.88 4.75 12 4.75Z"
      />
    </svg>
  );
}
