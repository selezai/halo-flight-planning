import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse, type NextRequest } from 'next/server';
import { isClerkConfigured } from '@/lib/auth/accountAuth';

const fallbackMiddleware = (_request: NextRequest) => NextResponse.next();

export default isClerkConfigured()
  ? clerkMiddleware()
  : fallbackMiddleware;

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api)(.*)',
  ],
};
