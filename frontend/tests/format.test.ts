import { describe, expect, it } from 'vitest';
import { formatMoney, penceToPounds } from '../src/lib/format';

describe('formatMoney', () => {
  it('formats a positive pence amount as GBP', () => {
    expect(formatMoney(12345n)).toBe('£123.45');
  });

  it('formats negative amounts with a leading minus', () => {
    expect(formatMoney(-9999n)).toBe('−£99.99');
  });

  it('accepts string pence values', () => {
    expect(formatMoney('500')).toBe('£5.00');
  });

  it('handles zero', () => {
    expect(formatMoney(0n)).toBe('£0.00');
  });

  it('signs positive amounts when requested', () => {
    expect(formatMoney(100n, { signed: true })).toBe('+£1.00');
  });
});

describe('penceToPounds', () => {
  it('converts pence to a pounds number', () => {
    expect(penceToPounds(12345n)).toBe(123.45);
    expect(penceToPounds('-500')).toBe(-5);
  });
});
