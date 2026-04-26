'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';

export function CopyPublicLinkButton({ publicId }: { publicId: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/r/${publicId}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        // Best-effort. Browsers without clipboard permission silently no-op.
      });
  }

  return (
    <Button
      onClick={copy}
      variant="outline"
      size="sm"
      data-slot="copy-public-link"
      data-public-id={publicId}
    >
      {copied ? 'Copied!' : 'Copy public link'}
    </Button>
  );
}
