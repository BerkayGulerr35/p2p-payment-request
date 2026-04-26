import { z } from 'zod';

export const MAX_AMOUNT_CENTS = 100_000_000; // $1,000,000.00

// zod schema for validating an amount stored as integer cents.
export const amountCentsSchema = z
  .number({ invalid_type_error: 'amount must be a number' })
  .int('amount must be an integer (cents)')
  .positive('amount must be positive')
  .max(MAX_AMOUNT_CENTS, `amount must be at most ${MAX_AMOUNT_CENTS}`);

// Convert integer cents to a "1234.56"-style dollar string (no separators, no sign symbol).
export function centsToDollars(cents: number): string {
  if (!Number.isInteger(cents)) {
    throw new Error('cents must be an integer');
  }
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const wholeDollars = Math.floor(abs / 100);
  const remainder = abs % 100;
  return `${sign}${wholeDollars}.${remainder.toString().padStart(2, '0')}`;
}

// Parse a strict dollar-string ("1.00", "50", "1234.56") into integer cents.
// Rejects thousand separators, embedded whitespace, more than 2 decimals,
// scientific notation, and any non-numeric noise.
export function dollarsToCents(input: string): number {
  const trimmed = input.trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new Error('invalid amount format');
  }
  const [intPart, decPart = '0'] = trimmed.split('.');
  const sign = intPart.startsWith('-') ? -1 : 1;
  const absInt = Math.abs(Number.parseInt(intPart, 10));
  const decCents = Number.parseInt(decPart.padEnd(2, '0'), 10);
  return sign * (absInt * 100 + decCents);
}

// Format integer cents as a USD string with the dollar sign and thousands separators.
export function formatUSD(cents: number): string {
  const dollars = centsToDollars(cents);
  const [intPart, decPart] = dollars.split('.');
  const sign = intPart.startsWith('-') ? '-' : '';
  const absInt = sign ? intPart.slice(1) : intPart;
  const withCommas = absInt.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}$${withCommas}.${decPart}`;
}
