'use server';

import { revalidatePath } from 'next/cache';

import { createSupabaseServerClient } from '@/lib/supabase/ssr';
import { payRequestSchema } from '@/lib/validators';

type Result = { ok: true } | { error: string };

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function payRequest(input: { request_id: string }): Promise<Result> {
  const parsed = payRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { error: 'validation_failed' };
  }

  // FR-011 — visible 2-3 second processing simulation.
  const processingTime = 2000 + Math.floor(Math.random() * 1000);
  await delay(processingTime);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'unauthenticated' };
  }

  const rpcResult = (await supabase.rpc('record_pay', {
    p_request_id: parsed.data.request_id,
  } as never)) as unknown as { error: { message: string } | null };

  if (rpcResult.error) {
    if (rpcResult.error.message.includes('not_pending_or_not_recipient')) {
      return { error: 'not_pending_or_not_recipient' };
    }
    return { error: 'internal' };
  }

  revalidatePath('/dashboard');
  revalidatePath(`/requests/${parsed.data.request_id}`);
  return { ok: true };
}
