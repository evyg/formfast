import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; timestamp: number }>();

// Rate limiting configuration
const RATE_LIMITS = {
  '/api/upload': { requests: 5, window: 60000 }, // 5 requests per minute
  '/api/ocr': { requests: 10, window: 60000 }, // 10 requests per minute
  '/api/classify': { requests: 15, window: 60000 }, // 15 requests per minute
  '/api/autofill': { requests: 15, window: 60000 }, // 15 requests per minute
  '/api/render-pdf': { requests: 3, window: 60000 }, // 3 requests per minute
};

// Protected routes that require authentication
const PROTECTED_ROUTES = [
  '/api/upload',
  '/api/ocr',
  '/api/classify',
  '/api/autofill',
  '/api/render-pdf',
  '/dashboard',
  '/profile',
  '/billing',
];

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/auth',
  '/auth/callback',
  '/auth/sign-up',
  '/auth/sign-in',
  '/auth/reset-password',
  '/api/auth',
  '/api/webhook',
];

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.pathname;
  const origin = request.nextUrl.origin;

  // Apply security headers to all responses
  const response = NextResponse.next();
  
  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://api.openai.com https://api.stripe.com",
    "frame-src https://js.stripe.com",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);

  // Check if route is public
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    url === route || url.startsWith(route + '/')
  );

  // Skip auth checks for public routes
  if (isPublicRoute) {
    return response;
  }

  // Apply rate limiting for API routes
  if (url.startsWith('/api/')) {
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateLimit = Object.entries(RATE_LIMITS).find(([route]) => url.startsWith(route))?.[1];
    
    if (rateLimit) {
      const key = `${clientIP}:${url}`;
      const now = Date.now();
      const stored = rateLimitStore.get(key);
      
      if (stored) {
        // Reset counter if window has passed
        if (now - stored.timestamp > rateLimit.window) {
          rateLimitStore.set(key, { count: 1, timestamp: now });
        } else if (stored.count >= rateLimit.requests) {
          // Rate limit exceeded
          return new NextResponse(
            JSON.stringify({ 
              error: 'Rate limit exceeded',
              message: `Too many requests. Limit: ${rateLimit.requests} per ${rateLimit.window / 1000}s`
            }),
            { 
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'Retry-After': String(Math.ceil(rateLimit.window / 1000)),
              }
            }
          );
        } else {
          // Increment counter
          rateLimitStore.set(key, { count: stored.count + 1, timestamp: stored.timestamp });
        }
      } else {
        // First request
        rateLimitStore.set(key, { count: 1, timestamp: now });
      }
    }
  }

  // Check if route requires authentication
  const isProtectedRoute = PROTECTED_ROUTES.some(route => 
    url === route || url.startsWith(route + '/')
  );

  if (isProtectedRoute) {
    // Create Supabase client
    const supabase = createMiddlewareClient({ req: request, res: response });

    // Check authentication
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      // Redirect to sign-in for page routes
      if (!url.startsWith('/api/')) {
        const redirectUrl = new URL('/auth/sign-in', origin);
        redirectUrl.searchParams.set('redirectTo', url);
        return NextResponse.redirect(redirectUrl);
      }

      // Return 401 for API routes
      return new NextResponse(
        JSON.stringify({ 
          error: 'Unauthorized',
          message: 'Authentication required'
        }),
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }

    // Add user information to request headers for API routes
    if (url.startsWith('/api/') && session.user) {
      response.headers.set('x-user-id', session.user.id);
      response.headers.set('x-user-email', session.user.email || '');
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};