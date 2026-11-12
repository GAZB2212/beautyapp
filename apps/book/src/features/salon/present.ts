import { formatMoney, type Storefront, type StorefrontService } from '@salon/core';

/** Presentation helpers shared by the storefront and the booking flow. */

export function formatPrice(pence: number, currency: string, isFrom?: boolean): string {
  const text = formatMoney(pence, currency).replace(/\.00$/, '');
  return isFrom ? `from ${text}` : text;
}

/** Services grouped under their category, in the salon's order. Uncategorised ones come last. */
export function groupServices(salon: Storefront): { name: string; services: StorefrontService[] }[] {
  const groups = salon.categories
    .map((c) => ({ name: c.name, services: salon.services.filter((s) => s.category_id === c.id) }))
    .filter((g) => g.services.length > 0);
  const known = new Set(salon.categories.map((c) => c.id));
  const rest = salon.services.filter((s) => !s.category_id || !known.has(s.category_id));
  if (rest.length > 0) groups.push({ name: groups.length > 0 ? 'More' : 'Services', services: rest });
  return groups;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const clock = (t: string) => t.replace(/^0/, '');

/** Monday-first week with opening times as text, or undefined when closed. */
export function hoursByDay(salon: Storefront): { day: string; text?: string }[] {
  return [1, 2, 3, 4, 5, 6, 0].map((wd) => {
    const spans = salon.hours.filter((h) => h.weekday === wd);
    return {
      day: DAYS[wd]!,
      text: spans.length ? spans.map((h) => `${clock(h.opens_at)} – ${clock(h.closes_at)}`).join(', ') : undefined,
    };
  });
}
