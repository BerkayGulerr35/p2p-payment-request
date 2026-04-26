'use server';

import { createSupabaseServerClient } from '@/lib/supabase/ssr';

// Returns a plain { ok } so the client can navigate via the App Router.
// Avoids the NEXT_REDIRECT noise that `redirect()` writes to the console
// when the action is invoked from `useTransition` instead of a form action.
export async function signOut(): Promise<{ ok: true }> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return { ok: true };
}
