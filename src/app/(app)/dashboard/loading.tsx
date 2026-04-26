export default function DashboardLoading() {
  return (
    <div className="space-y-6" data-slot="dashboard-loading" aria-busy>
      <div className="flex items-center justify-between">
        <div className="bg-muted/50 h-7 w-32 animate-pulse rounded" />
        <div className="bg-muted/50 h-9 w-28 animate-pulse rounded" />
      </div>
      <div className="bg-muted/30 h-10 animate-pulse rounded" />
      <div className="space-y-3">
        <div className="bg-muted/50 h-4 w-24 animate-pulse rounded" />
        <div className="bg-muted/30 h-24 animate-pulse rounded" />
        <div className="bg-muted/30 h-24 animate-pulse rounded" />
      </div>
      <div className="space-y-3">
        <div className="bg-muted/50 h-4 w-24 animate-pulse rounded" />
        <div className="bg-muted/30 h-24 animate-pulse rounded" />
      </div>
    </div>
  );
}
