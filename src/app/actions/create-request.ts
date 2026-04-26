'use server';

import { revalidatePath } from 'next/cache';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { createSupabaseServerClient } from '@/lib/supabase/ssr';
import { createPaymentRequestSchema } from '@/lib/validators';

type CreateInput = {
  recipient_email: string;
  amount_cents: number;
  memo: string | null;
};

type Result = { ok: true; public_id: string } | { error: string };

export async function createPaymentRequest(input: CreateInput): Promise<Result> {
  const parsed = createPaymentRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { error: 'validation_failed' };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'unauthenticated' };
  }

  const recipientEmail = parsed.data.recipient_email.trim().toLowerCase();

  // The RLS policy on public.users only lets the caller see themselves and
  // existing counterparties. To resolve a brand-new recipient by email we use
  // the service-role client, which bypasses RLS — but only to read a single
  // id. No other user data is exposed to the caller.
  const admin = createServiceRoleClient();
  const lookup = (await admin
    .from('users')
    .select('id')
    .eq('email', recipientEmail)
    .maybeSingle()) as unknown as {
    data: { id: string } | null;
    error: { message: string } | null;
  };

  if (lookup.error) {
    return { error: 'internal' };
  }
  if (!lookup.data) {
    return { error: 'recipient_not_found' };
  }
  if (lookup.data.id === user.id) {
    return { error: 'self_request_not_allowed' };
  }
  const recipient = lookup.data;

  // The actual write goes through the user-scoped client. RLS enforces that
  // sender_id matches auth.uid() and that amount/memo bounds hold.
  const insertResult = (await supabase
    .from('payment_requests')
    .insert({
      sender_id: user.id,
      recipient_id: recipient.id,
      amount_cents: parsed.data.amount_cents,
      memo: parsed.data.memo ?? null,
    } as never)
    .select('public_id')
    .single()) as unknown as {
    data: { public_id: string } | null;
    error: { message: string } | null;
  };

  if (insertResult.error || !insertResult.data) {
    return { error: 'internal' };
  }

  revalidatePath('/dashboard');
  return { ok: true, public_id: insertResult.data.public_id };
}
