import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/public(.*)',
  '/api/v1(.*)',
])

// Helper function to normalize URLs with trailing slash
function normalizeUrl(url: string): string {
  const urlObj = new URL(url)
  
  // Don't add trailing slash to:
  // 1. Root path (already has /)
  // 2. Paths with file extensions
  // 3. API routes (handled separately)
  // 4. Paths with query parameters or fragments
  if (
    urlObj.pathname === '/' ||
    /\.[a-zA-Z0-9]+$/.test(urlObj.pathname) ||
    urlObj.pathname.startsWith('/api/') ||
    urlObj.search ||
    urlObj.hash
  ) {
    return url
  }
  
  // Add trailing slash if not present
  if (!urlObj.pathname.endsWith('/')) {
    urlObj.pathname += '/'
    return urlObj.toString()
  }
  
  return url
}

export default clerkMiddleware(async (auth, request: NextRequest) => {
  const url = request.nextUrl.clone()
  
  // Handle trailing slash normalization for non-API routes
  if (!url.pathname.startsWith('/api/')) {
    const normalizedUrl = normalizeUrl(request.url)
    
    if (normalizedUrl !== request.url) {
      // Redirect to normalized URL with trailing slash
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
