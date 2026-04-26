import { describe, expect, it } from 'vitest';

import {
  cancelRequestSchema,
  createPaymentRequestSchema,
  declineRequestSchema,
  payRequestSchema,
} from '@/lib/validators';

describe('createPaymentRequestSchema', () => {
  it('accepts a valid input', () => {
    const result = createPaymentRequestSchema.safeParse({
      recipient_email: 'bob@example.com',
      amount_cents: 5000,
      memo: 'Lunch',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a null memo and a missing memo', () => {
    expect(
      createPaymentRequestSchema.safeParse({
        recipient_email: 'bob@example.com',
        amount_cents: 5000,
        memo: null,
      }).success,
    ).toBe(true);
    expect(
      createPaymentRequestSchema.safeParse({
        recipient_email: 'bob@example.com',
        amount_cents: 5000,
      }).success,
    ).toBe(true);
  });

  it('rejects invalid email addresses', () => {
    expect(
      createPaymentRequestSchema.safeParse({
        recipient_email: 'not-an-email',
        amount_cents: 5000,
        memo: null,
      }).success,
    ).toBe(false);
  });

  it('rejects amounts above the configured maximum', () => {
    expect(
      createPaymentRequestSchema.safeParse({
        recipient_email: 'bob@example.com',
        amount_cents: 100_000_001,
        memo: null,
      }).success,
    ).toBe(false);
  });

  it('rejects non-integer (cents-violating) amounts', () => {
    expect(
      createPaymentRequestSchema.safeParse({
        recipient_email: 'bob@example.com',
        amount_cents: 12.34,
        memo: null,
      }).success,
    ).toBe(false);
  });

  it('rejects memos longer than 280 characters', () => {
    expect(
      createPaymentRequestSchema.safeParse({
        recipient_email: 'bob@example.com',
        amount_cents: 5000,
        memo: 'x'.repeat(281),
      }).success,
    ).toBe(false);
  });
});

describe('payRequestSchema / declineRequestSchema / cancelRequestSchema', () => {
  it('accepts a valid uuid', () => {
    const id = '00000000-0000-4000-8000-000000000000';
    expect(payRequestSchema.safeParse({ request_id: id }).success).toBe(true);
    expect(declineRequestSchema.safeParse({ request_id: id }).success).toBe(true);
    expect(cancelRequestSchema.safeParse({ request_id: id }).success).toBe(true);
  });

  it('rejects non-uuid strings', () => {
    expect(payRequestSchema.safeParse({ request_id: 'abc' }).success).toBe(false);
    expect(payRequestSchema.safeParse({ request_id: '' }).success).toBe(false);
  });

  it('rejects missing request_id', () => {
    expect(payRequestSchema.safeParse({}).success).toBe(false);
  });
});
