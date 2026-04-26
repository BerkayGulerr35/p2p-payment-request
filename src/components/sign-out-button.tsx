'use client';

import { useTransition } from 'react';

import { signOut } from '@/app/actions/sign-out';
import { Button } from '@/components/ui/button';

export function SignOutButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => signOut())}
      data-slot="sign-out-button"
    >
      {pending ? 'Signing out…' : 'Sign out'}
    </Button>
  );
}
