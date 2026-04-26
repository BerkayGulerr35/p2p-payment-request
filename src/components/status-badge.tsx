import { Badge } from '@/components/ui/badge';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  paid: 'Paid',
  declined: 'Declined',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'default',
  paid: 'default',
  declined: 'destructive',
  cancelled: 'secondary',
  expired: 'secondary',
};

export function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABEL[status] ?? status;
  const variant = STATUS_VARIANT[status] ?? 'secondary';
  return (
    <Badge variant={variant} data-slot="status-badge" data-status={status}>
      {label}
    </Badge>
  );
}
