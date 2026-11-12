/**
 * Normalise a phone number typed by a client into E.164 ("+447700900123"), the format the
 * database and SMS provider expect. Numbers without a country code are read as UK numbers.
 * Returns null when it cannot be a valid number.
 */
export function normalisePhone(input: string, defaultCountryCode = '44'): string | null {
  let s = input.trim().replace(/[\s().-]/g, '');
  if (s.startsWith('00')) s = `+${s.slice(2)}`;
  if (s.startsWith('+')) {
    s = `+${s.slice(1).replace(/^(\d{1,3}?)0(?=7\d{9}$)/, '$1')}`; // "+44 07…" typed with the extra 0
  } else if (s.startsWith('0')) {
    s = `+${defaultCountryCode}${s.slice(1)}`;
  } else {
    return null;
  }
  if (!/^\+[1-9]\d{6,14}$/.test(s)) return null;
  // UK numbers: 10 digits after +44
  if (s.startsWith('+44') && s.length !== 13) return null;
  return s;
}

/** True for UK mobile numbers, the only ones that can receive our SMS reminders. */
export function isUkMobile(e164: string): boolean {
  return /^\+447\d{9}$/.test(e164);
}
