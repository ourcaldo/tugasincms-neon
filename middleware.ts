import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { rateLimitMiddleware } from '@/lib/rate-limit'

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

  // Apply rate limiting to all /api/v1 routes
  if (url.pathname.startsWith('/api/v1')) {
    const rateLimitResponse = await rateLimitMiddleware(request)
    if (rateLimitResponse) return rateLimitResponse
  }

  // Handle trailing slash normalization for non-API routes
  if (!url.pathname.startsWith('/api/')) {
    const normalizedUrl = normalizeUrl(request.url)

    if (normalizedUrl !== request.url) {
      return NextResponse.redirect(normalizedUrl, 301)
    }
  }

  // Handle Clerk authentication
  if (!isPublicRoute(request)) {
    await auth.protect()
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}

