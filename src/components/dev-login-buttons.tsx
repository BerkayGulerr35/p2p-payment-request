'use client';

import { useTransition } from 'react';

import { devLoginAs } from '@/app/actions/dev-login';
import { Button } from '@/components/ui/button';

export function DevLoginButtons() {
  const [pending, startTransition] = useTransition();

  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => startTransition(() => devLoginAs('alice'))}
      >
        Continue as Alice
      </Button>
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => startTransition(() => devLoginAs('bob'))}
      >
        Continue as Bob
      </Button>
    </div>
  );
}
