import Link from 'next/link';

import { RequestCard } from '@/components/request-card';
import { buttonVariants } from '@/components/ui/button';
import { createSupabaseServerClient } from '@/lib/supabase/ssr';

type RequestRow = {
  id: string;
  amount_cents: number;
  memo: string | null;
  status: string;
  created_at: string;
  expires_at: string;
  sender_id: string;
  recipient_id: string;
};

type UserRow = { id: string; display_name: string; email: string };

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Auth-gated layout guarantees user; this is just a guard for the type.
  if (!user) {
    return null;
  }

  // RLS limits the result set to rows where the caller is sender or recipient.
  const { data: requests } = await supabase
    .from('payment_requests')
    .select('id, amount_cents, memo, status, created_at, expires_at, sender_id, recipient_id')
    .order('created_at', { ascending: false });

  const rows: RequestRow[] = (requests ?? []) as unknown as RequestRow[];

  // Fetch counterparty user details in one round-trip and merge in JS.
  const counterpartyIds = Array.from(
    new Set(rows.flatMap((r) => [r.sender_id, r.recipient_id]).filter((id) => id !== user.id)),
  );

  let userMap = new Map<string, UserRow>();
  if (counterpartyIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, display_name, email')
      .in('id', counterpartyIds);
    const fetched = (users ?? []) as unknown as UserRow[];
    userMap = new Map(fetched.map((u) => [u.id, u]));
  }

  const outgoing = rows.filter((r) => r.sender_id === user.id);

  function counterpartyOf(senderId: string, recipientId: string) {
    const otherId = senderId === user!.id ? recipientId : senderId;
    return (
      userMap.get(otherId) ?? {
        id: otherId,
        display_name: 'Unknown',
        email: '',
      }
    );
  }

  return (
    <div className="space-y-6" data-slot="dashboard">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <Link href="/requests/new" className={buttonVariants({})}>
          New request
        </Link>
      </div>

      <section className="space-y-3" data-slot="outgoing-section">
        <h2 className="text-muted-foreground text-sm font-medium">Outgoing ({outgoing.length})</h2>
        {outgoing.length === 0 ? (
          <p className="bg-muted/30 text-muted-foreground rounded-md border p-4 text-sm">
            You have not sent any requests yet.
          </p>
        ) : (
          <div className="grid gap-3" data-slot="outgoing-list">
            {outgoing.map((r) => (
              <RequestCard
                key={r.id}
                id={r.id}
                amount_cents={r.amount_cents}
                memo={r.memo}
                status={r.status}
                created_at={r.created_at}
                expires_at={r.expires_at}
                role="sender"
                counterparty={counterpartyOf(r.sender_id, r.recipient_id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
