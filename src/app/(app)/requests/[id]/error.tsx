'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';

export default function RequestDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Request detail error:', error);
  }, [error]);

  return (
    <div
      className="border-destructive/30 bg-destructive/5 space-y-3 rounded-md border p-4"
      data-slot="request-detail-error"
    >
      <h2 className="font-medium">Could not load this request.</h2>
      <p className="text-muted-foreground text-sm">
        {error.message || 'The request may have been removed or your session expired.'}
      </p>
      <div className="flex gap-2">
        <Button onClick={reset} variant="outline" size="sm">
          Try again
        </Button>
        <Link href="/dashboard" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
