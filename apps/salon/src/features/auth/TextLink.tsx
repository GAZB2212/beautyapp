import { Link, type Href } from 'expo-router';
import { Text } from '@salon/ui';

/** Quiet inline link in small capitals. */
export function TextLink({ href, children, replace }: { href: Href; children: string; replace?: boolean }) {
  return (
    <Link href={href} replace={replace}>
      <Text variant="label" tone="muted" style={{ textDecorationLine: 'underline' }}>
        {children}
      </Text>
    </Link>
  );
}
