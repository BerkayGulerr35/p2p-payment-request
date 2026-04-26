import { format } from 'date-fns';

import { StatusBadge } from '@/components/status-badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { formatUSD } from '@/lib/money';

type UserSummary = { display_name: string; email: string };

export type RequestDetailProps = {
  amount_cents: number;
  memo: string | null;
  status: string;
  created_at: string;
  expires_at: string;
  sender: UserSummary | null;
  recipient: UserSummary | null;
  currentUserRole: 'sender' | 'recipient';
};

export function RequestDetail(props: RequestDetailProps) {
  const { amount_cents, memo, status, created_at, expires_at, sender, recipient, currentUserRole } =
    props;

  const counterparty = currentUserRole === 'sender' ? recipient : sender;
  const heading = currentUserRole === 'sender' ? 'You sent to' : 'You received from';

  return (
    <Card data-slot="request-detail">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-muted-foreground text-xs">{heading}</p>
            <p className="text-lg font-medium" data-slot="counterparty-name">
              {counterparty?.display_name ?? 'Unknown'}
            </p>
            <p className="text-muted-foreground text-xs">{counterparty?.email ?? ''}</p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-2xl font-semibold" data-slot="amount">
              {formatUSD(amount_cents)}
            </p>
            <StatusBadge status={status} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="text-muted-foreground text-xs tracking-wide uppercase">Memo</p>
          <p data-slot="memo">
            {memo ?? <span className="text-muted-foreground italic">No memo</span>}
          </p>
        </div>
        <div className="text-muted-foreground grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="tracking-wide uppercase">Created</p>
            <p>{format(new Date(created_at), 'PPp')}</p>
          </div>
          <div>
            <p className="tracking-wide uppercase">Expires</p>
            <p>{format(new Date(expires_at), 'PPp')}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
