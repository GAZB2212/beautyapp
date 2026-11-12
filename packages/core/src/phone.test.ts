import { describe, expect, it } from 'vitest';
import { isUkMobile, normalisePhone } from './phone';

describe('normalisePhone', () => {
  it('reads UK numbers in the ways people type them', () => {
    expect(normalisePhone('07700 900123')).toBe('+447700900123');
    expect(normalisePhone('+44 7700 900123')).toBe('+447700900123');
    expect(normalisePhone('0044 7700 900123')).toBe('+447700900123');
    expect(normalisePhone('+44 (0)7700 900123')).toBe('+447700900123');
    expect(normalisePhone('0151 555 0142')).toBe('+441515550142');
  });
  it('keeps international numbers', () => {
    expect(normalisePhone('+353 86 123 4567')).toBe('+353861234567');
  });
  it('rejects things that are not phone numbers', () => {
    expect(normalisePhone('')).toBeNull();
    expect(normalisePhone('hello')).toBeNull();
    expect(normalisePhone('07700')).toBeNull();
    expect(normalisePhone('7700900123')).toBeNull();
  });
  it('recognises UK mobiles', () => {
    expect(isUkMobile('+447700900123')).toBe(true);
    expect(isUkMobile('+441515550142')).toBe(false);
  });
});
