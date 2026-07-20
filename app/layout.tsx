import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Inter } from 'next/font/google';
import HaloClerkProvider from '@/components/auth/HaloClerkProvider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Halo Flight Planning',
  description: 'Professional flight planning for pilots',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <HaloClerkProvider>
          {children}
          <Analytics />
          <SpeedInsights />
        </HaloClerkProvider>
      </body>
    </html>
  );
}
