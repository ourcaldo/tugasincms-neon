import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database'
import { getCachedData, setCachedData } from '@/lib/cache'

export async function GET(request: NextRequest) {
  try {
    const cacheKey = 'robots:txt'
    
    // Try to get cached robots.txt
    let robotsTxt = await getCachedData(cacheKey)
    
    if (!robotsTxt) {
      // Try to get robots.txt from database
      try {
        const settings = await sql`
          SELECT robots_txt FROM robots_settings 
          ORDER BY created_at DESC 
          LIMIT 1
        `
        
        if (settings.length > 0 && settings[0].robots_txt) {
          robotsTxt = settings[0].robots_txt
        }
      } catch (dbError) {
        console.warn('Failed to fetch robots.txt from database:', dbError)
      }
      
      // Fallback to default robots.txt if database fails
      if (!robotsTxt) {
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
      }

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
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'X-Robots-Tag': 'noindex'
      }
    })
  } catch (error) {
    console.error('Error serving robots.txt:', error)
    
    // Fallback robots.txt with shorter cache
    const fallbackRobots = `User-agent: *
Allow: /
Sitemap: https://nexjob.tech/sitemap.xml
Crawl-delay: 1`
    
    return new NextResponse(fallbackRobots, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=300, s-maxage=300',
        'X-Robots-Tag': 'noindex'
      }
    })
  }
}