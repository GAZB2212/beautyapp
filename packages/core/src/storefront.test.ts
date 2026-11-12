import { describe, expect, it } from 'vitest';
import { depositFor } from './storefront';

describe('depositFor', () => {
  const service = { price_pence: 4800, deposit_override_pence: null };
  it('returns nothing when the salon takes no deposit', () => {
    expect(depositFor(service, { deposit_type: 'none', deposit_value: 0 })).toBe(0);
  });
  it('applies a fixed deposit, never more than the price', () => {
    expect(depositFor(service, { deposit_type: 'fixed', deposit_value: 1500 })).toBe(1500);
    expect(depositFor(service, { deposit_type: 'fixed', deposit_value: 9900 })).toBe(4800);
  });
  it('applies a percentage deposit', () => {
    expect(depositFor(service, { deposit_type: 'percent', deposit_value: 25 })).toBe(1200);
    expect(depositFor(service, { deposit_type: 'percent', deposit_value: 250 })).toBe(4800);
  });
  it('lets a service override the salon rule', () => {
    expect(depositFor({ price_pence: 14500, deposit_override_pence: 3000 }, { deposit_type: 'none', deposit_value: 0 })).toBe(3000);
  });
});
