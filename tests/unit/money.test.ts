import { describe, expect, it } from 'vitest';

import {
  MAX_AMOUNT_CENTS,
  amountCentsSchema,
  centsToDollars,
  dollarsToCents,
  formatUSD,
} from '@/lib/money';

describe('amountCentsSchema', () => {
  it('accepts valid integer cents within bounds', () => {
    expect(amountCentsSchema.parse(1)).toBe(1);
    expect(amountCentsSchema.parse(5000)).toBe(5000);
    expect(amountCentsSchema.parse(MAX_AMOUNT_CENTS)).toBe(MAX_AMOUNT_CENTS);
  });

  it('rejects zero, negative, non-integer, and out-of-bounds values', () => {
    expect(() => amountCentsSchema.parse(0)).toThrow();
    expect(() => amountCentsSchema.parse(-1)).toThrow();
    expect(() => amountCentsSchema.parse(0.5)).toThrow();
    expect(() => amountCentsSchema.parse(MAX_AMOUNT_CENTS + 1)).toThrow();
  });
});

describe('centsToDollars', () => {
  it('formats whole-dollar amounts with two decimals', () => {
    expect(centsToDollars(0)).toBe('0.00');
    expect(centsToDollars(100)).toBe('1.00');
    expect(centsToDollars(123_456)).toBe('1234.56');
  });

  it('pads single-digit cents with a leading zero', () => {
    expect(centsToDollars(105)).toBe('1.05');
    expect(centsToDollars(9)).toBe('0.09');
  });

  it('throws on non-integer input', () => {
    expect(() => centsToDollars(1.5)).toThrow();
  });
});

describe('dollarsToCents', () => {
  it('parses common dollar strings to integer cents', () => {
    expect(dollarsToCents('1.00')).toBe(100);
    expect(dollarsToCents('50')).toBe(5000);
    expect(dollarsToCents('1234.56')).toBe(123_456);
    expect(dollarsToCents('0.05')).toBe(5);
  });

  it('rejects strings with separators, embedded whitespace, or > 2 decimals', () => {
    expect(() => dollarsToCents('1,000.00')).toThrow();
    expect(() => dollarsToCents('1.234')).toThrow();
    expect(() => dollarsToCents('1 . 5')).toThrow();
    expect(() => dollarsToCents('1.5e2')).toThrow();
    expect(() => dollarsToCents('abc')).toThrow();
    expect(() => dollarsToCents('')).toThrow();
  });

  it('round-trips with centsToDollars at the boundaries', () => {
    for (const cents of [1, 99, 100, 105, 50_000, MAX_AMOUNT_CENTS]) {
      expect(dollarsToCents(centsToDollars(cents))).toBe(cents);
    }
  });
});

describe('formatUSD', () => {
  it('inserts thousands separators and the dollar sign', () => {
    expect(formatUSD(123_456)).toBe('$1,234.56');
    expect(formatUSD(100)).toBe('$1.00');
    expect(formatUSD(MAX_AMOUNT_CENTS)).toBe('$1,000,000.00');
  });
});
