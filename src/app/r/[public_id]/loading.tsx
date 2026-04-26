export default function PublicSummaryLoading() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8"
      data-slot="public-summary-loading"
      aria-busy
    >
      <div className="w-full max-w-md space-y-4">
        <div className="bg-muted/50 mx-auto h-3 w-32 animate-pulse rounded" />
        <div className="bg-muted/30 h-56 animate-pulse rounded-lg" />
        <div className="bg-muted/50 mx-auto h-3 w-40 animate-pulse rounded" />
      </div>
    </main>
  );
}
