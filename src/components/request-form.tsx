'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { createPaymentRequest } from '@/app/actions/create-request';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { dollarsToCents, MAX_AMOUNT_CENTS } from '@/lib/money';

const formSchema = z.object({
  recipient_email: z.string().email('must be a valid email'),
  amount_dollars: z.string().refine((v) => {
    try {
      const cents = dollarsToCents(v);
      return cents > 0 && cents <= MAX_AMOUNT_CENTS;
    } catch {
      return false;
    }
  }, 'must be a USD amount between $0.01 and $1,000,000.00'),
  memo: z.string().max(280, 'memo must be at most 280 characters').optional(),
});

type FormValues = z.infer<typeof formSchema>;

const ERROR_MESSAGES: Record<string, string> = {
  recipient_not_found: 'No registered user has that email.',
  self_request_not_allowed: 'You cannot send a request to yourself.',
  validation_failed: 'Please check the values and try again.',
  unauthenticated: 'You need to sign in.',
  internal: 'Something went wrong. Try again.',
};

export function RequestForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { recipient_email: '', amount_dollars: '', memo: '' },
  });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const amount_cents = dollarsToCents(values.amount_dollars);
      const result = await createPaymentRequest({
        recipient_email: values.recipient_email,
        amount_cents,
        memo: values.memo && values.memo.length > 0 ? values.memo : null,
      });
      if ('error' in result) {
        setError('root', {
          message: ERROR_MESSAGES[result.error] ?? 'Something went wrong.',
        });
        return;
      }
      router.push('/dashboard');
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
      data-slot="request-form"
      noValidate
    >
      <div className="space-y-2">
        <Label htmlFor="recipient_email">Recipient email</Label>
        <Input
          id="recipient_email"
          type="email"
          autoComplete="off"
          placeholder="bob@example.com"
          {...register('recipient_email')}
          disabled={pending}
        />
        {errors.recipient_email && (
          <p className="text-destructive text-sm" data-slot="error-recipient_email">
            {errors.recipient_email.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount_dollars">Amount (USD)</Label>
        <Input
          id="amount_dollars"
          type="text"
          inputMode="decimal"
          placeholder="50.00"
          {...register('amount_dollars')}
          disabled={pending}
        />
        {errors.amount_dollars && (
          <p className="text-destructive text-sm" data-slot="error-amount_dollars">
            {errors.amount_dollars.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="memo">Memo (optional)</Label>
        <textarea
          id="memo"
          rows={3}
          maxLength={280}
          placeholder="Lunch"
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          {...register('memo')}
          disabled={pending}
        />
        {errors.memo && (
          <p className="text-destructive text-sm" data-slot="error-memo">
            {errors.memo.message}
          </p>
        )}
      </div>

      {errors.root && (
        <p className="text-destructive text-sm" data-slot="form-error">
          {errors.root.message}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Sending…' : 'Send request'}
      </Button>
    </form>
  );
}
