import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

import { StatusBadge } from '@/components/status-badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { formatUSD } from '@/lib/money';

type Counterparty = { display_name: string; email: string };

export type RequestCardProps = {
  id: string;
  amount_cents: number;
  memo: string | null;
  status: string;
  created_at: string;
  expires_at: string;
  role: 'sender' | 'recipient';
  counterparty: Counterparty;
};

export function RequestCard(props: RequestCardProps) {
  const { id, amount_cents, memo, status, created_at, role, counterparty } = props;
  const direction = role === 'sender' ? 'To' : 'From';
  return (
    <Link href={`/requests/${id}`} className="block" data-slot="request-card" data-id={id}>
      <Card className="hover:bg-muted/40 transition">
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
          <div>
            <p className="text-muted-foreground text-xs">{direction}</p>
            <p className="font-medium" data-slot="counterparty-name">
              {counterparty.display_name}
            </p>
            <p className="text-muted-foreground text-xs">{counterparty.email}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold" data-slot="amount">
              {formatUSD(amount_cents)}
            </p>
            <StatusBadge status={status} />
          </div>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          {memo ? (
            <p className="line-clamp-2" data-slot="memo">
              {memo}
            </p>
          ) : (
            <p className="italic">No memo</p>
          )}
          <p className="mt-1 text-xs">
            {formatDistanceToNow(new Date(created_at), { addSuffix: true })}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
