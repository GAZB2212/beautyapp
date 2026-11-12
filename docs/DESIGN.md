# Salon App — Design direction

Audience: salon clients, mostly women, arriving on a phone from Instagram, Google or WhatsApp,
and the salon owners who want a page they are proud to share. The product must look like it
belongs to a high-end salon, never like booking software.

Previews: [booking flow](design/booking-flow.png) · [palettes](design/storefront-palettes.png) ·
[full phone page](design/storefront-phone-full.png) · [desktop](design/storefront-desktop.png)

## Principles

1. **Quiet luxury.** Warm neutrals, generous whitespace, fine hairlines. Nothing shouts.
2. **Photography leads.** The salon's own images carry the page; the interface steps back.
   A page with no photos still looks finished (tonal cover wash, monogram avatars).
3. **Type does the styling.** An elegant display face for names and headings, a light
   geometric sans for everything else, and small letter-spaced capitals for labels.
4. **One clear action.** A single dark pill button per screen. On phones the booking button
   stays pinned to the bottom of the storefront.
5. **Colour is an accent.** The brand colour decorates (rules, chips, highlights). It never
   carries body text, so every palette stays readable and accessible.
6. **Calm motion.** Short fades and gentle slides only. No bounces, no confetti.
7. **Every salon looks designed.** Salons choose from curated options that are designed as a
   whole, so no combination can look cheap.

## What a salon can customise

| Choice | Options |
|---|---|
| Palette | Champagne (default), Blush, Sage, Mocha, Lilac, Noir. Optional custom accent on top. |
| Type pairing | Classic (Cormorant Garamond), Modern (Jost light), Editorial (Playfair Display). Body text is always Jost. |
| Layout | Classic (centred, serif-led; built), Editorial and Minimal (to come in step 4). |
| Content | Logo, cover photo, gallery, tagline, about, services, team, hours, contact and social links. |

## Rules for anything we build

- Use the primitives in `packages/ui` (`Text`, `Button`, `Container`, `Card`, `Chip`, `Divider`,
  `Monogram`, `SectionHeading`). No hard-coded colours or fonts in screens.
- Text sizes: body 16, small 14, labels 11 in capitals with wide tracking. Body text never
  below 14.
- Touch targets at least 48px high. Primary buttons 56px on phones.
- Reading column capped at 640px; dashboard column at 1120px.
- Body and label text must meet WCAG AA contrast on its background in all six palettes.
- Prices and times are set in the medium sans weight so they scan quickly.
- The dashboard uses the same language in the house (Champagne, Classic) theme, tuned for
  density: it should feel like the same brand, not a different product.
