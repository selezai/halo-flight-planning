import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { isClerkConfigured } from '@/lib/auth/accountAuth';
import GpsLabClient from './GpsLabClient';

export const metadata: Metadata = {
  title: 'Halo GPS Lab',
  description: 'Browser geolocation diagnostics for Halo Flight Planning.',
};

export default async function GpsLabPage() {
  if (isClerkConfigured()) {
    const { userId, redirectToSignIn } = await auth();

    if (!userId) {
      return redirectToSignIn({ returnBackUrl: '/gps-lab' });
    }
  }

  return <GpsLabClient />;
}
