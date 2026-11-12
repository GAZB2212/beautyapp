import {
  addDays,
  weekdayOf,
  zonedTimeToInstant,
  type AvailabilitySlot,
  type Storefront,
} from '@salon/core';

/**
 * Sample salon used when no Supabase project is configured (design previews and local UI
 * work). It has the exact shape the database returns, so screens cannot tell the difference.
 */
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const CUT = id(101);
const COLOUR = id(102);
const TREAT = id(103);
const SARAH = id(201);
const AMELIA = id(202);
const FREYA = id(203);

export const sampleStorefront: Storefront = {
  salon: {
    id: id(1),
    slug: 'sarahs-hair',
    name: 'Sarah’s Hair',
    timezone: 'Europe/London',
    currency: 'GBP',
    address_line1: '14 Market Street',
    address_line2: null,
    city: 'Hoylake',
    postcode: 'CH47 2AE',
    country: 'GB',
    phone: '0151 555 0142',
    email: 'hello@sarahshair.example',
    online_payments: false,
  },
  branding: {
    logo_path: null,
    cover_path: null,
    palette: 'champagne',
    primary_color: null,
    accent_color: null,
    font_style: 'classic',
    layout: 'classic',
    tagline: 'Colour, cut and care in the heart of Hoylake',
    about:
      'A calm, independent studio specialising in lived-in colour and effortless cuts. Every appointment begins with a consultation, and ends with hair you can style at home.',
    booking_message: null,
    instagram: 'sarahshair',
    facebook: null,
    tiktok: null,
    website: null,
    whatsapp: null,
  },
  booking_rules: {
    deposit_type: 'fixed',
    deposit_value: 1500,
    cancellation_window_hours: 24,
    no_show_fee_type: 'none',
    no_show_fee_value: 0,
    min_notice_hours: 2,
    max_advance_days: 60,
    allow_staff_choice: true,
    require_phone: true,
  },
  hours: [
    { weekday: 2, opens_at: '09:00', closes_at: '17:30' },
    { weekday: 3, opens_at: '09:00', closes_at: '17:30' },
    { weekday: 4, opens_at: '10:00', closes_at: '20:00' },
    { weekday: 5, opens_at: '09:00', closes_at: '18:00' },
    { weekday: 6, opens_at: '08:30', closes_at: '16:00' },
  ],
  categories: [
    { id: CUT, name: 'Cut & Style' },
    { id: COLOUR, name: 'Colour' },
    { id: TREAT, name: 'Treatments' },
  ],
  services: [
    svc(301, CUT, 'Cut & Blow Dry', 'Consultation, wash, precision cut and finish.', 60, 4800, [SARAH, AMELIA, FREYA]),
    svc(302, CUT, 'Restyle', 'A complete change of shape, with extra time to plan it.', 75, 5800, [SARAH, AMELIA]),
    svc(303, CUT, 'Blow Dry', null, 40, 2800, [SARAH, AMELIA, FREYA]),
    { ...svc(304, COLOUR, 'Balayage', 'Hand-painted, soft and low maintenance. Includes toner and finish.', 180, 14500, [SARAH]), price_is_from: true, deposit_override_pence: 3000 },
    svc(305, COLOUR, 'Half Head Highlights', null, 120, 8900, [SARAH, AMELIA]),
    svc(306, COLOUR, 'Root Colour', null, 90, 5600, [SARAH, AMELIA, FREYA]),
    svc(307, COLOUR, 'Gloss & Tone', 'Refresh shine and tone between colour appointments.', 45, 3400, [SARAH, AMELIA, FREYA]),
    svc(308, TREAT, 'Bond Repair Ritual', 'Strengthening treatment with scalp massage.', 30, 2500, [AMELIA, FREYA]),
  ],
  staff: [
    { id: SARAH, name: 'Sarah Whitmore', title: 'Owner & Colour Director', bio: null, avatar_path: null },
    { id: AMELIA, name: 'Amelia Reyes', title: 'Senior Stylist', bio: null, avatar_path: null },
    { id: FREYA, name: 'Freya Lindqvist', title: 'Stylist', bio: null, avatar_path: null },
  ],
  gallery: [],
};

function svc(n: number, category: string, name: string, description: string | null, duration: number, price: number, staff: string[]) {
  return {
    id: id(n),
    category_id: category,
    name,
    description,
    duration_min: duration,
    price_pence: price,
    price_is_from: false,
    image_path: null,
    deposit_override_pence: null,
    staff_ids: staff,
  };
}

/** Deterministic pseudo-random 0..1 from a string, so the sample diary is stable between renders. */
function noise(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

/** Sample free slots that follow the sample salon's opening hours, with some already "taken". */
export function sampleAvailability(q: { serviceId: string; from: string; days: number; staffId?: string }): AvailabilitySlot[] {
  const sf = sampleStorefront;
  const service = sf.services.find((s) => s.id === q.serviceId);
  if (!service) return [];
  const staff = q.staffId ? service.staff_ids.filter((s) => s === q.staffId) : service.staff_ids;
  const earliest = Date.now() + sf.booking_rules.min_notice_hours * 3600_000;
  const out: AvailabilitySlot[] = [];
  for (let d = 0; d < q.days; d++) {
    const day = addDays(q.from, d);
    for (const h of sf.hours.filter((x) => x.weekday === weekdayOf(day))) {
      const [oh, om] = h.opens_at.split(':').map(Number) as [number, number];
      const [ch, cm] = h.closes_at.split(':').map(Number) as [number, number];
      for (let m = oh * 60 + om; m + service.duration_min <= ch * 60 + cm; m += 30) {
        const time = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
        const instant = zonedTimeToInstant(day, time, sf.salon.timezone);
        if (instant.getTime() < earliest) continue;
        for (const s of staff) {
          if (noise(`${s}${day}${time}`) < 0.55) continue; // taken
          out.push({ staff_id: s, starts_at: instant.toISOString() });
        }
      }
    }
  }
  return out.sort((a, b) => a.starts_at.localeCompare(b.starts_at) || a.staff_id.localeCompare(b.staff_id));
}
