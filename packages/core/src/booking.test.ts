import { describe, expect, it } from 'vitest';
import { clientDetailsSchema, fieldErrors } from './booking';

const base = { firstName: ' Alice ', lastName: 'Jones', email: ' Alice@Example.com ', phone: '07700 900123', note: '', marketingOptIn: false };

describe('clientDetailsSchema', () => {
  it('cleans and normalises valid details', () => {
    const r = clientDetailsSchema({ requirePhone: true }).parse(base);
    expect(r).toMatchObject({ firstName: 'Alice', email: 'alice@example.com', phone: '+447700900123' });
  });
  it('reports friendly errors per field', () => {
    const r = clientDetailsSchema({ requirePhone: true }).safeParse({ ...base, firstName: '', email: 'nope', phone: '' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const e = fieldErrors(r.error);
      expect(Object.keys(e).sort()).toEqual(['email', 'firstName', 'phone']);
    }
  });
  it('allows a missing phone when the salon does not require one', () => {
    const r = clientDetailsSchema({ requirePhone: false }).parse({ ...base, phone: '' });
    expect(r.phone).toBeNull();
  });
});
