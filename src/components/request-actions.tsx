'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { cancelRequest } from '@/app/actions/cancel-request';
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
  canCancel: boolean;
};

export function RequestActions({ requestId, canPay, canDecline, canCancel }: Props) {
  const router = useRouter();
  const [pendingPay, startPay] = useTransition();
  const [pendingDecline, startDecline] = useTransition();
  const [pendingCancel, startCancel] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const anyPending = pendingPay || pendingDecline || pendingCancel;

  function runAction(
    label: string,
    action: () => Promise<{ ok: true } | { error: string }>,
    transition: (cb: () => void) => void,
  ) {
    setError(null);
    transition(async () => {
      const result = await action();
      if ('error' in result) {
        setError(ERROR_MESSAGES[result.error] ?? `Could not ${label} the request.`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3" data-slot="request-actions">
      <div className="flex flex-col gap-2 sm:flex-row">
        {canPay && (
          <Button
            onClick={() => runAction('pay', () => payRequest({ request_id: requestId }), startPay)}
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
            onClick={() =>
              runAction('decline', () => declineRequest({ request_id: requestId }), startDecline)
            }
            disabled={anyPending}
            className="flex-1"
            data-slot="decline-button"
          >
            {pendingDecline ? 'Declining…' : 'Decline'}
          </Button>
        )}
        {canCancel && (
          <Button
            variant="outline"
            onClick={() =>
              runAction('cancel', () => cancelRequest({ request_id: requestId }), startCancel)
            }
            disabled={anyPending}
            className="flex-1"
            data-slot="cancel-button"
          >
            {pendingCancel ? 'Cancelling…' : 'Cancel request'}
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
