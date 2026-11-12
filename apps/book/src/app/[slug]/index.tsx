import { useRouter } from 'expo-router';
import { useSalon } from '@/features/salon/SalonContext';
import { StorefrontClassic } from '@/features/storefront/StorefrontClassic';

/** Salon storefront at /<slug>. */
export default function SalonPage() {
  const salon = useSalon();
  const router = useRouter();
  const slug = salon.salon.slug;
  return (
    <StorefrontClassic
      salon={salon}
      onBook={(serviceId) =>
        serviceId
          ? router.push({ pathname: '/[slug]/book/stylist', params: { slug, service: serviceId } })
          : router.push({ pathname: '/[slug]/book', params: { slug } })
      }
    />
  );
}
