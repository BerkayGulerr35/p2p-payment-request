'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import './globals.css';

// Top-level error boundary. Catches errors that escape the per-route
// error.tsx files (e.g. errors thrown inside the root layout itself).
// MUST render its own <html> and <body> because it replaces the root layout.
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
    <html lang="en">
      <body>
        <main className="flex min-h-screen flex-col items-center justify-center p-4 text-center sm:p-8">
          <div className="w-full max-w-md space-y-3">
            <h1 className="text-2xl font-semibold">Something went wrong</h1>
            <p className="text-muted-foreground text-sm">
              {error.message || 'An unexpected error occurred. Please try again.'}
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={reset}
                className="bg-background hover:bg-muted inline-flex h-8 items-center justify-center rounded-md border px-3 text-sm font-medium"
              >
                Try again
              </button>
              <Link
                href="/"
                className="hover:bg-muted inline-flex h-8 items-center justify-center rounded-md px-3 text-sm font-medium"
              >
                Go home
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
