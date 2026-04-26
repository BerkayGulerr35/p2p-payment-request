'use client';

import { useEffect, useState } from 'react';

// Live countdown to a target ISO timestamp. Ticks every second on the client.
// Shows "Expired" once the target has passed; the actual status flip on the
// server is handled by the hourly pg_cron job, so the visual "Expired" can lead
// the server status by up to one hour. Server-side checks reject any action.
export function Countdown({ to }: { to: string }) {
  const target = new Date(to).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (now === null) {
    return (
      <span suppressHydrationWarning data-slot="countdown">
        …
      </span>
    );
  }

  const remaining = target - now;
  if (remaining <= 0) {
    return (
      <span suppressHydrationWarning data-slot="countdown-expired">
        Expired
      </span>
    );
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let text: string;
  if (days > 0) text = `${days}d ${hours}h ${minutes}m`;
  else if (hours > 0) text = `${hours}h ${minutes}m ${seconds}s`;
  else text = `${minutes}m ${seconds}s`;

  return (
    <span suppressHydrationWarning data-slot="countdown">
      {text}
    </span>
  );
}
