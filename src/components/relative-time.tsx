'use client';

import { formatDistanceToNow } from 'date-fns';
import { useEffect, useState } from 'react';

// Renders "X minutes ago"-style text. The relative-to-now value is computed
// only on the client to avoid SSR/CSR hydration mismatches.
export function RelativeTime({ iso }: { iso: string }) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setText(formatDistanceToNow(new Date(iso), { addSuffix: true }));
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [iso]);

  return (
    <time dateTime={iso} suppressHydrationWarning>
      {text ?? '…'}
    </time>
  );
}
