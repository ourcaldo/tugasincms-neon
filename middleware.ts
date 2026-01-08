import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/public(.*)',
  '/api/v1(.*)',
])

// Initialize rate limiter if Upstash is configured
let ratelimit: Ratelimit | null = null
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
    analytics: true,
    prefix: 'nexjob-cms-api',
  })
}

// Get client IP from request
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  if (forwarded) return forwarded.split(',')[0].trim()
  if (realIp) return realIp
  return 'anonymous'
}

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
  if (url.pathname.startsWith('/api/v1') && ratelimit) {
    const ip = getClientIP(request)
    const { success, limit, remaining, reset } = await ratelimit.limit(ip)

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((reset - Date.now()) / 1000)
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
            'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
          }
        }
      )
    }
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

