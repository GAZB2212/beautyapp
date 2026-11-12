import type { Storefront } from './types';

/**
 * Sample content for design previews only. Replaced by live data from Supabase in step 4.
 * Any slug renders this sample until then.
 */
export const sampleStorefront: Storefront = {
  slug: 'sarahs-hair',
  name: 'Sarah’s Hair',
  tagline: 'Colour, cut and care in the heart of Hoylake',
  about:
    'A calm, independent studio specialising in lived-in colour and effortless cuts. Every appointment begins with a consultation, and ends with hair you can style at home.',
  city: 'Hoylake, Wirral',
  addressLine: '14 Market Street, Hoylake CH47 2AE',
  phone: '0151 555 0142',
  instagram: 'sarahshair',
  branding: { palette: 'champagne', fontStyle: 'classic' },
  categories: [
    {
      name: 'Cut & Style',
      services: [
        { id: 's1', name: 'Cut & Blow Dry', description: 'Consultation, wash, precision cut and finish.', durationMin: 60, pricePence: 4800 },
        { id: 's2', name: 'Restyle', description: 'A complete change of shape, with extra time to plan it.', durationMin: 75, pricePence: 5800 },
        { id: 's3', name: 'Blow Dry', durationMin: 40, pricePence: 2800 },
      ],
    },
    {
      name: 'Colour',
      services: [
        { id: 's4', name: 'Balayage', description: 'Hand-painted, soft and low maintenance. Includes toner and finish.', durationMin: 180, pricePence: 14500, priceIsFrom: true },
        { id: 's5', name: 'Half Head Highlights', durationMin: 120, pricePence: 8900 },
        { id: 's6', name: 'Root Colour', durationMin: 90, pricePence: 5600 },
        { id: 's7', name: 'Gloss & Tone', description: 'Refresh shine and tone between colour appointments.', durationMin: 45, pricePence: 3400 },
      ],
    },
    {
      name: 'Treatments',
      services: [
        { id: 's8', name: 'Bond Repair Ritual', description: 'Strengthening treatment with scalp massage.', durationMin: 30, pricePence: 2500 },
      ],
    },
  ],
  team: [
    { id: 't1', name: 'Sarah Whitmore', role: 'Owner & Colour Director' },
    { id: 't2', name: 'Amelia Reyes', role: 'Senior Stylist' },
    { id: 't3', name: 'Freya Lindqvist', role: 'Stylist' },
  ],
  hours: [
    { day: 'Monday' },
    { day: 'Tuesday', open: '9:00', close: '17:30' },
    { day: 'Wednesday', open: '9:00', close: '17:30' },
    { day: 'Thursday', open: '10:00', close: '20:00' },
    { day: 'Friday', open: '9:00', close: '18:00' },
    { day: 'Saturday', open: '8:30', close: '16:00' },
    { day: 'Sunday' },
  ],
};
