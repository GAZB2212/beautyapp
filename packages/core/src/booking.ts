import { z } from 'zod';
import { normalisePhone } from './phone';

/** What a client types to make a booking. Validated here and again on the server. */
export function clientDetailsSchema(opts: { requirePhone: boolean }) {
  const phone = z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === '') {
        if (opts.requirePhone) ctx.addIssue({ code: 'custom', message: 'Please enter your mobile number' });
        return null;
      }
      const e164 = normalisePhone(v);
      if (!e164) ctx.addIssue({ code: 'custom', message: 'That doesn’t look like a valid phone number' });
      return e164;
    });

  return z.object({
    firstName: z.string().trim().min(1, 'Please enter your first name').max(60),
    lastName: z.string().trim().max(60),
    email: z.string().trim().toLowerCase().pipe(z.email('Please enter a valid email address')),
    phone,
    note: z.string().trim().max(500, 'Please keep notes under 500 characters'),
    marketingOptIn: z.boolean(),
  });
}

export type ClientDetailsInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  note: string;
  marketingOptIn: boolean;
};
export type ClientDetails = z.infer<ReturnType<typeof clientDetailsSchema>>;

/** Field name → first error message, for showing under each input. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '');
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}
