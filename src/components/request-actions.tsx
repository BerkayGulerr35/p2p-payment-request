'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { declineRequest } from '@/app/actions/decline-request';
import { payRequest } from '@/app/actions/pay-request';
import { Button } from '@/components/ui/button';

const ERROR_MESSAGES: Record<string, string> = {
  not_pending_or_not_recipient: 'This request can no longer be paid or declined.',
  not_pending_or_not_sender: 'This request can no longer be cancelled.',
  unauthenticated: 'You need to sign in.',
  internal: 'Something went wrong. Try again.',
  validation_failed: 'Invalid request id.',
};

type Props = {
  requestId: string;
  canPay: boolean;
  canDecline: boolean;
};

export function RequestActions({ requestId, canPay, canDecline }: Props) {
  const router = useRouter();
  const [pendingPay, startPay] = useTransition();
  const [pendingDecline, startDecline] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const anyPending = pendingPay || pendingDecline;

  function handlePay() {
    setError(null);
    startPay(async () => {
      const result = await payRequest({ request_id: requestId });
      if ('error' in result) {
        setError(ERROR_MESSAGES[result.error] ?? 'Something went wrong.');
        return;
      }
      router.refresh();
    });
  }

  function handleDecline() {
    setError(null);
    startDecline(async () => {
      const result = await declineRequest({ request_id: requestId });
      if ('error' in result) {
        setError(ERROR_MESSAGES[result.error] ?? 'Something went wrong.');
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3" data-slot="request-actions">
      <div className="flex gap-2">
        {canPay && (
          <Button
            onClick={handlePay}
            disabled={anyPending}
            className="flex-1"
            data-slot="pay-button"
          >
            {pendingPay ? 'Processing…' : 'Pay'}
          </Button>
        )}
        {canDecline && (
          <Button
            variant="outline"
            onClick={handleDecline}
            disabled={anyPending}
            className="flex-1"
            data-slot="decline-button"
          >
            {pendingDecline ? 'Declining…' : 'Decline'}
          </Button>
        )}
      </div>
      {error && (
        <p className="text-destructive text-sm" data-slot="action-error">
          {error}
        </p>
      )}
    </div>
  );
}
