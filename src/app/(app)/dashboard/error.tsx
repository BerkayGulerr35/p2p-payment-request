'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div
      className="border-destructive/30 bg-destructive/5 space-y-3 rounded-md border p-4"
      data-slot="dashboard-error"
    >
      <h2 className="font-medium">Could not load the dashboard.</h2>
      <p className="text-muted-foreground text-sm">
        {error.message || 'An unexpected error occurred.'}
      </p>
      <Button onClick={reset} variant="outline" size="sm">
        Try again
      </Button>
    </div>
  );
}
