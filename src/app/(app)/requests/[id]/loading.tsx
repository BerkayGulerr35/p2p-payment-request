export default function RequestDetailLoading() {
  return (
    <div className="space-y-4" data-slot="request-detail-loading" aria-busy>
      <div className="flex items-center justify-between">
        <div className="bg-muted/50 h-7 w-24 animate-pulse rounded" />
        <div className="flex items-center gap-2">
          <div className="bg-muted/50 h-8 w-32 animate-pulse rounded" />
          <div className="bg-muted/50 h-8 w-14 animate-pulse rounded" />
        </div>
      </div>
      <div className="bg-muted/30 h-48 animate-pulse rounded" />
      <div className="bg-muted/30 h-10 animate-pulse rounded" />
    </div>
  );
}
