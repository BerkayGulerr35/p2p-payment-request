'use server';

import { revalidatePath } from 'next/cache';

import { createSupabaseServerClient } from '@/lib/supabase/ssr';
import { cancelRequestSchema } from '@/lib/validators';

type Result = { ok: true } | { error: string };

export async function cancelRequest(input: { request_id: string }): Promise<Result> {
  const parsed = cancelRequestSchema.safeParse(input);
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

  const rpcResult = (await supabase.rpc('record_cancel', {
    p_request_id: parsed.data.request_id,
  } as never)) as unknown as { error: { message: string } | null };

  if (rpcResult.error) {
    if (rpcResult.error.message.includes('not_pending_or_not_sender')) {
      return { error: 'not_pending_or_not_sender' };
    }
    return { error: 'internal' };
  }

  revalidatePath('/dashboard');
  revalidatePath(`/requests/${parsed.data.request_id}`);
  return { ok: true };
}
