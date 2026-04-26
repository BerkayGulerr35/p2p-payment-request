'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

type Status = 'idle' | 'sent' | 'error';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });
      setStatus(error ? 'error' : 'sent');
    });
  }

  if (status === 'sent') {
    return (
      <div className="bg-muted/30 rounded-md border p-4 text-sm">
        Check your inbox at <strong>{email}</strong>. Click the link to sign in.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={pending}
        />
      </div>
      {status === 'error' && (
        <p className="text-destructive text-sm">Could not send the link. Try again.</p>
      )}
      <Button type="submit" className="w-full" disabled={pending || !email}>
        {pending ? 'Sending…' : 'Send magic link'}
      </Button>
    </form>
  );
}
