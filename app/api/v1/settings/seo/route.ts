import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { verifyApiToken, extractBearerToken, getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/response'
import { setCorsHeaders, handleCorsPreflightRequest } from '@/lib/cors'
import { z } from 'zod'

const robotsSettingsSchema = z.object({
  robots_txt: z.string().min(1, "Robots.txt content is required"),
})

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  return handleCorsPreflightRequest(origin)
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin')
  
  try {
    // Check if request is from dashboard (Clerk auth) or external API (Bearer token)
    const token = extractBearerToken(request)

    // If token provided, verify it (external API access)
    if (token) {
      const validToken = await verifyApiToken(token)

      if (!validToken) {
        return setCorsHeaders(unauthorizedResponse('Invalid or expired API token'), origin)
      }
    } else {
      // If no token, check Clerk auth (dashboard access)
      try {
        const userId = await getUserIdFromClerk()

        if (!userId) {
          return setCorsHeaders(unauthorizedResponse('Authentication required'), origin)
        }
      } catch (authError) {
        console.error('Clerk authentication error:', authError)
        return setCorsHeaders(unauthorizedResponse('Authentication failed'), origin)
      }
    }
    
    // Fetch robots.txt settings
    const settings = await sql`
      SELECT * FROM robots_settings 
      ORDER BY created_at DESC 
      LIMIT 1
    `
    
    if (settings.length === 0) {
      // Return default settings if none exist
      const defaultSettings = {
        robots_txt: `User-agent: *
Allow: /

# Allow important pages for SEO
Allow: /lowongan-kerja/
Allow: /artikel/

# Sitemaps (served via Nexjob middleware)
Sitemap: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://nexjob.tech'}/sitemap.xml

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
      
      return setCorsHeaders(successResponse(defaultSettings, false), origin)
    }
    
    const setting = settings[0]
    
    // Transform database format to API format
    const responseData = {
      robots_txt: setting.robots_txt,
      updated_at: setting.updated_at
    }
    
    return setCorsHeaders(successResponse(responseData, false), origin)
  } catch (error) {
    console.error('Error fetching robots.txt settings:', error)
    return setCorsHeaders(errorResponse('Failed to fetch robots.txt settings'), origin)
  }
}

export async function PUT(request: NextRequest) {
  const origin = request.headers.get('origin')
  
  try {
    // Check if request is from dashboard (Clerk auth) or external API (Bearer token)
    const token = extractBearerToken(request)

    // If token provided, verify it (external API access)
    if (token) {
      const validToken = await verifyApiToken(token)

      if (!validToken) {
        return setCorsHeaders(unauthorizedResponse('Invalid or expired API token'), origin)
      }
    } else {
      // If no token, check Clerk auth (dashboard access)
      try {
        const userId = await getUserIdFromClerk()

        if (!userId) {
          return setCorsHeaders(unauthorizedResponse('Authentication required'), origin)
        }
      } catch (authError) {
        console.error('Clerk authentication error:', authError)
        return setCorsHeaders(unauthorizedResponse('Authentication failed'), origin)
      }
    }
    
    const body = await request.json()
    const validation = robotsSettingsSchema.safeParse(body)
    
    if (!validation.success) {
      const errors = validation.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code
      }))
      
      return setCorsHeaders(
        validationErrorResponse(`Validation failed: ${errors[0].field} - ${errors[0].message}`),
        origin
      )
    }
    
    const { robots_txt } = validation.data
    
    // Check if settings exist
    const existingSettings = await sql`
      SELECT id FROM robots_settings 
      ORDER BY created_at DESC 
      LIMIT 1
    `
    
    let result
    
    if (existingSettings.length === 0) {
      // Insert new settings
      result = await sql`
        INSERT INTO robots_settings (robots_txt)
        VALUES (${robots_txt})
        RETURNING *
      `
    } else {
      // Update existing settings
      const settingId = existingSettings[0].id
      result = await sql`
        UPDATE robots_settings 
        SET 
          robots_txt = ${robots_txt},
          updated_at = now()
        WHERE id = ${settingId}
        RETURNING *
      `
    }
    
    // H-12: Invalidate robots.txt cache when settings are updated
    try {
      const { deleteCachedData } = await import('@/lib/cache')
      await deleteCachedData('robots:txt')
    } catch (e) {
      console.warn('Failed to clear robots.txt cache:', e)
    }
    
    return setCorsHeaders(successResponse(result[0], false), origin)
  } catch (error: unknown) {
    console.error('Error updating robots.txt settings:', error)
    return setCorsHeaders(errorResponse('Failed to update robots.txt settings'), origin)
  }
}