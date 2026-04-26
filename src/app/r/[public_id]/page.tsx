import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AbsoluteTime } from '@/components/absolute-time';
import { Countdown } from '@/components/countdown';
import { StatusBadge } from '@/components/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatUSD } from '@/lib/money';
import { createAnonClient } from '@/lib/supabase/anon';

type PublicRow = {
  public_id: string;
  amount_cents: number;
  memo: string | null;
  status: string;
  created_at: string;
  expires_at: string;
  sender_display_name: string;
};

export default async function PublicSummaryPage({
  params,
}: {
  params: Promise<{ public_id: string }>;
}) {
  const { public_id } = await params;

  const supabase = createAnonClient();
  const result = (await supabase
    .from('payment_requests_public')
    .select('public_id, amount_cents, memo, status, created_at, expires_at, sender_display_name')
    .eq('public_id', public_id)
    .maybeSingle()) as unknown as { data: PublicRow | null };

  if (!result.data) {
    notFound();
  }

  const r = result.data;
  const isPending = r.status === 'pending';

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8"
      data-slot="public-summary"
    >
      <div className="w-full max-w-md space-y-4">
        <p className="text-muted-foreground text-center text-xs">Read-only summary</p>
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-muted-foreground text-xs">From</p>
                <CardTitle className="text-base" data-slot="sender-name">
                  {r.sender_display_name}
                </CardTitle>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-2xl font-semibold" data-slot="amount">
                  {formatUSD(r.amount_cents)}
                </p>
                <StatusBadge status={r.status} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs tracking-wide uppercase">Memo</p>
              <p data-slot="memo">
                {r.memo ?? <span className="text-muted-foreground italic">No memo</span>}
              </p>
            </div>
            <div className="text-muted-foreground grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="tracking-wide uppercase">Created</p>
                <p>
                  <AbsoluteTime iso={r.created_at} />
                </p>
              </div>
              <div>
                <p className="tracking-wide uppercase">Expires</p>
                <p>
                  <AbsoluteTime iso={r.expires_at} />
                </p>
              </div>
            </div>
            {isPending && (
              <div
                className="bg-muted/30 rounded-md border px-3 py-2 text-xs"
                data-slot="countdown-block"
              >
                <span className="text-muted-foreground">Time remaining: </span>
                <span className="text-foreground font-medium">
                  <Countdown to={r.expires_at} />
                </span>
              </div>
            )}
          </CardContent>
        </Card>
        <p className="text-muted-foreground text-center text-xs">
          <Link href="/login" className="hover:text-foreground underline">
            Sign in
          </Link>{' '}
          to act on this request.
        </p>
      </div>
    </main>
  );
}
