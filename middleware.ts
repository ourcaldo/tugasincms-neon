import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { rateLimitMiddleware } from '@/lib/rate-limit'
import { randomUUID } from 'crypto'

// Force Node.js runtime because ioredis doesn't work in Edge Runtime
export const runtime = 'nodejs'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/public(.*)',
  '/api/v1(.*)',
])

// Helper function to normalize URLs with trailing slash
function normalizeUrl(url: string): string {
  const urlObj = new URL(url)

  if (
    urlObj.pathname === '/' ||
    /\.[a-zA-Z0-9]+$/.test(urlObj.pathname) ||
    urlObj.pathname.startsWith('/api/') ||
    urlObj.search ||
    urlObj.hash
  ) {
    return url
  }

  if (!urlObj.pathname.endsWith('/')) {
    urlObj.pathname += '/'
    return urlObj.toString()
  }

  return url
}

export default clerkMiddleware(async (auth, request: NextRequest) => {
  const url = request.nextUrl.clone()
  const requestId = request.headers.get('x-request-id') || randomUUID()
  const start = Date.now()

  // Apply rate limiting to all /api/v1 routes
  if (url.pathname.startsWith('/api/v1')) {
    const rateLimitResponse = await rateLimitMiddleware(request)
    if (rateLimitResponse) {
      rateLimitResponse.headers.set('X-Request-ID', requestId)
      return rateLimitResponse
    }

    // Sampled request logging (~10% of v1 API requests)
    if (Math.random() < 0.1) {
      console.log(JSON.stringify({
        type: 'api_request',
        requestId,
        method: request.method,
        path: url.pathname,
        query: url.search || undefined,
        ip: request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent')?.slice(0, 100),
        ts: new Date().toISOString(),
      }))
    }
  }

  // Handle trailing slash normalization for non-API routes
  if (!url.pathname.startsWith('/api/')) {
    const normalizedUrl = normalizeUrl(request.url)

    if (normalizedUrl !== request.url) {
      const redirect = NextResponse.redirect(normalizedUrl, 301)
      redirect.headers.set('X-Request-ID', requestId)
      return redirect
    }
  }

  // Handle Clerk authentication
  if (!isPublicRoute(request)) {
    await auth.protect()
  }

  const response = NextResponse.next({
    request: { headers: new Headers(request.headers) },
  })
  response.headers.set('X-Request-ID', requestId)
  return response
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}

