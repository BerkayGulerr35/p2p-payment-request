'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { devLoginAs } from '@/app/actions/dev-login';
import { Button } from '@/components/ui/button';

export function DevLoginButtons() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick(persona: 'alice' | 'bob') {
    startTransition(async () => {
      await devLoginAs(persona);
      router.push('/dashboard');
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <Button variant="outline" disabled={pending} onClick={() => handleClick('alice')}>
        Continue as Alice
      </Button>
      <Button variant="outline" disabled={pending} onClick={() => handleClick('bob')}>
        Continue as Bob
      </Button>
    </div>
  );
}
