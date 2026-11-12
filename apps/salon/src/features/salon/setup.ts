import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toApiError } from '@salon/api';
import { supabase } from '@/lib/supabase';

export type SetupState = {
  hours: { weekday: number; opens_at: string; closes_at: string }[];
  staff: { id: string; name: string; title: string | null }[];
  services: { id: string; name: string; duration_min: number; price_pence: number }[];
  /** Number of stylist-to-service links: a service nobody offers cannot be booked */
  links: number;
};

/** What the salon has set up so far, for the getting-started checklist. */
export function useSetup(salonId: string) {
  return useQuery({
    queryKey: ['setup', salonId],
    queryFn: async (): Promise<SetupState> => {
      const db = supabase();
      const [hours, staff, services, links] = await Promise.all([
        db.from('salon_hours').select('weekday, opens_at, closes_at').eq('salon_id', salonId).order('weekday'),
        db.from('staff').select('id, name, title').eq('salon_id', salonId).order('sort_order'),
        db.from('services').select('id, name, duration_min, price_pence').eq('salon_id', salonId).order('sort_order'),
        db.from('staff_services').select('staff_id').eq('salon_id', salonId),
      ]);
      for (const r of [hours, staff, services, links]) if (r.error) throw toApiError(r.error);
      return { hours: hours.data!, staff: staff.data!, services: services.data!, links: links.data!.length };
    },
  });
}

export function useRefreshSetup(salonId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['setup', salonId] });
}

/** Make sure every stylist is linked to every service (the simple default while getting started). */
export async function linkEveryoneToEverything(salonId: string) {
  const db = supabase();
  const [staff, services, links] = await Promise.all([
    db.from('staff').select('id').eq('salon_id', salonId),
    db.from('services').select('id').eq('salon_id', salonId),
    db.from('staff_services').select('staff_id, service_id').eq('salon_id', salonId),
  ]);
  for (const r of [staff, services, links]) if (r.error) throw toApiError(r.error);
  const have = new Set(links.data!.map((l) => `${l.staff_id}:${l.service_id}`));
  const missing = staff.data!.flatMap((f) =>
    services.data!.filter((v) => !have.has(`${f.id}:${v.id}`)).map((v) => ({ salon_id: salonId, staff_id: f.id, service_id: v.id })),
  );
  if (missing.length === 0) return;
  const { error } = await db.from('staff_services').insert(missing);
  if (error) throw toApiError(error);
}
