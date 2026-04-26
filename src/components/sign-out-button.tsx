'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { signOut } from '@/app/actions/sign-out';
import { Button } from '@/components/ui/button';

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await signOut();
      router.push('/login');
      router.refresh();
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={handleClick}
      data-slot="sign-out-button"
    >
      {pending ? 'Signing out…' : 'Sign out'}
    </Button>
  );
}
