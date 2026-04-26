import Link from 'next/link';

export default function PublicSummaryNotFound() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center p-4 text-center sm:p-8"
      data-slot="public-summary-not-found"
    >
      <div className="w-full max-w-md space-y-3">
        <h1 className="text-2xl font-semibold">Request not found</h1>
        <p className="text-muted-foreground text-sm">
          This payment request does not exist, or its public link is no longer valid.
        </p>
        <p className="pt-2 text-sm">
          <Link href="/" className="hover:text-foreground underline">
            Go home
          </Link>
        </p>
      </div>
    </main>
  );
}
