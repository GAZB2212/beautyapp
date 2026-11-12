/** Reserved paths that can never be a salon slug (they are app routes). */
export const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'app',
  'b',
  'book',
  'dashboard',
  'login',
  'signup',
  'privacy',
  'terms',
  'manage',
  'salon',
  'salons',
  'settings',
  'support',
  'www',
]);

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/; // 3–40 chars

/** Turn free text ("Sarah's Hair & Beauty") into a URL slug ("sarahs-hair-beauty"). */
export function toSlug(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
}

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug) && !RESERVED_SLUGS.has(slug);
}
