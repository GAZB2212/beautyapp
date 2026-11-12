import { describe, expect, it } from 'vitest';
import { addDays, dateKeyOf, formatDuration, formatTime, hourOf, weekdayOf, zonedTimeToInstant } from './time';

const LONDON = 'Europe/London';

describe('salon-local time', () => {
  it('converts local clock time to an instant in winter and summer', () => {
    expect(zonedTimeToInstant('2026-12-01', '09:30', LONDON).toISOString()).toBe('2026-12-01T09:30:00.000Z');
    expect(zonedTimeToInstant('2026-07-01', '09:30', LONDON).toISOString()).toBe('2026-07-01T08:30:00.000Z');
  });
  it('handles the days the clocks change', () => {
    // 29 March 2026: clocks go forward at 01:00. 09:00 local is 08:00 UTC.
    expect(zonedTimeToInstant('2026-03-29', '09:00', LONDON).toISOString()).toBe('2026-03-29T08:00:00.000Z');
    // 25 October 2026: clocks go back. 09:00 local is 09:00 UTC.
    expect(zonedTimeToInstant('2026-10-25', '09:00', LONDON).toISOString()).toBe('2026-10-25T09:00:00.000Z');
  });
  it('works for other zones', () => {
    expect(zonedTimeToInstant('2026-12-01', '09:00', 'America/New_York').toISOString()).toBe('2026-12-01T14:00:00.000Z');
  });
  it('finds the local day of an instant', () => {
    expect(dateKeyOf('2026-07-01T23:30:00Z', LONDON)).toBe('2026-07-02');
    expect(dateKeyOf('2026-12-01T23:30:00Z', LONDON)).toBe('2026-12-01');
    expect(hourOf('2026-07-01T08:30:00Z', LONDON)).toBe(9);
  });
  it('does calendar arithmetic', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(weekdayOf('2026-11-16')).toBe(1); // Monday
  });
  it('formats for people', () => {
    expect(formatTime('2026-07-01T08:30:00Z', LONDON)).toBe('9:30 am');
    expect(formatTime('2026-12-01T14:00:00Z', LONDON)).toBe('2:00 pm');
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(60)).toBe('1 hr');
    expect(formatDuration(195)).toBe('3 hr 15 min');
  });
});
