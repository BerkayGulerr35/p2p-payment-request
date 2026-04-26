import Link from 'next/link';
import { notFound } from 'next/navigation';

import { RequestActions } from '@/components/request-actions';
import { RequestDetail } from '@/components/request-detail';
import { buttonVariants } from '@/components/ui/button';
import { createSupabaseServerClient } from '@/lib/supabase/ssr';

type RequestRow = {
  id: string;
  public_id: string;
  amount_cents: number;
  memo: string | null;
  status: string;
  created_at: string;
  expires_at: string;
  sender_id: string;
  recipient_id: string;
};

type UserRow = { id: string; display_name: string; email: string };

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const requestResult = (await supabase
    .from('payment_requests')
    .select(
      'id, public_id, amount_cents, memo, status, created_at, expires_at, sender_id, recipient_id',
    )
    .eq('id', id)
    .maybeSingle()) as unknown as { data: RequestRow | null };

  if (!requestResult.data) {
    notFound();
  }

  const request = requestResult.data;

  const usersResult = (await supabase
    .from('users')
    .select('id, display_name, email')
    .in('id', [request.sender_id, request.recipient_id])) as unknown as { data: UserRow[] | null };

  const users = usersResult.data ?? [];
  const sender = users.find((u) => u.id === request.sender_id) ?? null;
  const recipient = users.find((u) => u.id === request.recipient_id) ?? null;

  const isSender = request.sender_id === user.id;
  const isRecipient = request.recipient_id === user.id;
  const isPending = request.status === 'pending';

  return (
    <div className="space-y-4" data-slot="detail-page">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Request</h1>
        <Link href="/dashboard" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          Back
        </Link>
      </div>

      <RequestDetail
        amount_cents={request.amount_cents}
        memo={request.memo}
        status={request.status}
        created_at={request.created_at}
        expires_at={request.expires_at}
        sender={sender}
        recipient={recipient}
        currentUserRole={isSender ? 'sender' : 'recipient'}
      />

      {isPending && (isRecipient || isSender) && (
        <RequestActions
          requestId={request.id}
          canPay={isRecipient}
          canDecline={isRecipient}
          canCancel={isSender}
        />
      )}
    </div>
  );
}
