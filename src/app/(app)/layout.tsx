import Link from 'next/link';
import { redirect } from 'next/navigation';

import { SignOutButton } from '@/components/sign-out-button';
import { createSupabaseServerClient } from '@/lib/supabase/ssr';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="bg-background min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/dashboard" className="truncate font-semibold">
            <span className="sm:hidden">P2P Pay</span>
            <span className="hidden sm:inline">P2P Payment Request</span>
          </Link>
          <div className="flex items-center gap-2 text-sm sm:gap-3">
            <span
              className="text-muted-foreground hidden truncate sm:inline"
              data-slot="current-user-email"
            >
              {user.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
