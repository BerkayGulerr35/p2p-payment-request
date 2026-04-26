'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'declined', label: 'Declined' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'expired', label: 'Expired' },
];

export function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function update(key: string, value: string | null) {
    const url = new URLSearchParams(params.toString());
    if (!value || value === 'all') {
      url.delete(key);
    } else {
      url.set(key, value);
    }
    const qs = url.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row" data-slot="filter-bar">
      <Select
        value={params.get('status') ?? 'all'}
        onValueChange={(value) => update('status', value)}
      >
        <SelectTrigger className="sm:w-[180px]" data-slot="filter-status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="search"
        placeholder="Search memo or name…"
        defaultValue={params.get('q') ?? ''}
        onChange={(event) => update('q', event.target.value)}
        className="flex-1"
        data-slot="filter-search"
      />
    </div>
  );
}
