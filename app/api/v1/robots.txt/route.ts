import { NextRequest, NextResponse } from 'next/server'
import { getCachedData, setCachedData } from '@/lib/cache'

export async function GET(request: NextRequest) {
  try {
    const cacheKey = 'robots:txt'
    
    // Try to get cached robots.txt
    let robotsTxt = await getCachedData(cacheKey)
    
    if (!robotsTxt) {
      // Generate robots.txt content for Nexjob frontend
      // The sitemap URL should point to nexjob.tech, not the CMS
      robotsTxt = `User-agent: *
Allow: /

# Allow important pages for SEO
Allow: /lowongan-kerja/
Allow: /artikel/

# Sitemaps (served via Nexjob middleware)
Sitemap: https://nexjob.tech/sitemap.xml

# Disallow admin and private areas
Disallow: /admin/
Disallow: /dashboard/
Disallow: /sign-in
Disallow: /sign-up
Disallow: /_next/

# SEO optimizations
Disallow: /*?*
Disallow: /*#*
Disallow: /search?

# Crawl delay for politeness
Crawl-delay: 1`

      // Cache for 1 hour
      try {
        await setCachedData(cacheKey, robotsTxt, 3600)
      } catch (e) {
        console.warn('Failed to cache robots.txt:', e)
      }
    }
    
    return new NextResponse(robotsTxt as string, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=3600', // 1 hour cache
      },
    })
  } catch (error) {
    console.error('Error serving robots.txt:', error)
    
    // Fallback robots.txt
    const fallbackRobots = `User-agent: *
Allow: /

# Allow important pages
Allow: /lowongan-kerja/
Allow: /artikel/

# Sitemaps
Sitemap: https://nexjob.tech/sitemap.xml

# Basic restrictions
Disallow: /admin/
Disallow: /dashboard/`
    
    return new NextResponse(fallbackRobots, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=300', // 5 minutes cache for fallback
      },
    })
  }
}