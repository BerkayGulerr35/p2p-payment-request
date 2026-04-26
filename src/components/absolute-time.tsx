'use client';

import { format } from 'date-fns';
import { useEffect, useState } from 'react';

// Locale-aware absolute time, computed on the client to avoid SSR/CSR
// hydration mismatches caused by timezone differences.
export function AbsoluteTime({ iso, fmt = 'PPp' }: { iso: string; fmt?: string }) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    setText(format(new Date(iso), fmt));
  }, [iso, fmt]);

  return (
    <time dateTime={iso} suppressHydrationWarning>
      {text ?? '…'}
    </time>
  );
}
