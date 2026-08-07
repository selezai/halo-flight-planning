import { ClerkProvider } from '@clerk/nextjs';
import { getConfiguredEnvValue } from '@/lib/auth/accountAuth';

export default function HaloClerkProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const publishableKey = getConfiguredEnvValue(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  if (!publishableKey) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      {children}
    </ClerkProvider>
  );
}
