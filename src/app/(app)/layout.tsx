import { redirect } from 'next/navigation';

import { createSupabaseServerClient } from '@/lib/supabase/ssr';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <div className="bg-background min-h-screen">{children}</div>;
}
