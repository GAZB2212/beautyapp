import { describe, expect, it } from 'vitest';
import { isValidSlug, toSlug } from './slug';

describe('toSlug', () => {
  it('normalises salon names', () => {
    expect(toSlug("Sarah's Hair & Beauty")).toBe('sarahs-hair-beauty');
    expect(toSlug('  Élan  Studio ')).toBe('elan-studio');
  });
  it('rejects reserved and malformed slugs', () => {
    expect(isValidSlug('admin')).toBe(false);
    expect(isValidSlug('-bad')).toBe(false);
    expect(isValidSlug('a')).toBe(false);
    expect(isValidSlug('sarahs-hair')).toBe(true);
  });
});
