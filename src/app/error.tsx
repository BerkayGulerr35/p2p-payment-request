'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';

// Top-level error boundary. Catches anything that bubbles past the per-route
// error.tsx files (e.g. errors during root layout rendering).
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center p-4 text-center sm:p-8"
      data-slot="global-error"
    >
      <div className="w-full max-w-md space-y-3">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="text-muted-foreground text-sm">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <div className="flex justify-center gap-2 pt-2">
          <Button onClick={reset} variant="outline" size="sm">
            Try again
          </Button>
          <Link href="/" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
