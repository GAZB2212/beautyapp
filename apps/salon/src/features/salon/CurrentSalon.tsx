import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext } from 'react';
import { acceptInvites, listMemberships, type Membership } from '@salon/api';
import { supabase } from '@/lib/supabase';

const CurrentSalonContext = createContext<Membership | null>(null);
export const CurrentSalonProvider = CurrentSalonContext.Provider;

/** The salon the dashboard is showing, and the signed-in user's role in it. */
export function useCurrentSalon(): Membership {
  const m = useContext(CurrentSalonContext);
  if (!m) throw new Error('useCurrentSalon must be used inside the signed-in area');
  return m;
}

/** Salons the signed-in user belongs to. Pending invites for their email are accepted first. */
export function useMemberships(userId: string | undefined) {
  return useQuery({
    queryKey: ['memberships', userId],
    enabled: !!userId,
    queryFn: async () => {
      await acceptInvites(supabase()).catch(() => 0); // joining is a bonus, never a blocker
      return listMemberships(supabase(), userId!);
    },
  });
}

export function useRefreshMemberships() {
  const queryClient = useQueryClient();
  // Refetch even when no screen is currently showing the list (e.g. from the welcome screen),
  // so the dashboard never opens on a stale "no salons yet" answer.
  return () => queryClient.refetchQueries({ queryKey: ['memberships'], type: 'all' });
}
