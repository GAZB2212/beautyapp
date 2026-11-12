import { formatMoney } from '@salon/core';

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

export function formatPrice(pence: number, isFrom?: boolean): string {
  const whole = pence % 100 === 0;
  const text = whole ? formatMoney(pence).replace(/\.00$/, '') : formatMoney(pence);
  return isFrom ? `from ${text}` : text;
}
