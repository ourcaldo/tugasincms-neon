import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/response'
import { mapPageFromDB } from '@/lib/page-mapper'
import { getCachedData, setCachedData } from '@/lib/cache'
import { verifyApiToken, extractBearerToken } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { setCorsHeaders, handleCorsPreflightRequest } from '@/lib/cors'

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  return handleCorsPreflightRequest(origin)
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const origin = request.headers.get('origin')
  
  try {
    const token = extractBearerToken(request)
    
    const validToken = await verifyApiToken(token || '')
    
    if (!validToken) {
      return setCorsHeaders(unauthorizedResponse('Invalid or expired API token'), origin)
    }
    
    const rateLimitResult = await checkRateLimit(`api_token:${validToken.id}`)
    if (!rateLimitResult.success) {
      return setCorsHeaders(
        errorResponse('Rate limit exceeded. Please try again later.', 429),
        origin
      )
    }
    
    const { id } = params
    
    const cacheKey = `api:v1:pages:${id}`
    
    const cachedData = await getCachedData(cacheKey)
    if (cachedData) {
      return setCorsHeaders(successResponse(cachedData, true), origin)
    }
    
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    
    const pageQuery = isUuid 
      ? sql`
          SELECT 
            p.*,
            COALESCE(
              json_agg(DISTINCT jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug, 'description', c.description)) 
              FILTER (WHERE c.id IS NOT NULL),
              '[]'::json
            ) as categories,
            COALESCE(
              json_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug))
              FILTER (WHERE t.id IS NOT NULL),
              '[]'::json
            ) as tags
          FROM pages p
          LEFT JOIN page_categories pc ON p.id = pc.page_id
          LEFT JOIN categories c ON pc.category_id = c.id
          LEFT JOIN page_tags pt ON p.id = pt.page_id
          LEFT JOIN tags t ON pt.tag_id = t.id
          WHERE p.id = ${id} AND p.status = 'published'
          GROUP BY p.id
        `
      : sql`
          SELECT 
            p.*,
            COALESCE(
              json_agg(DISTINCT jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug, 'description', c.description)) 
              FILTER (WHERE c.id IS NOT NULL),
              '[]'::json
            ) as categories,
            COALESCE(
              json_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug))
              FILTER (WHERE t.id IS NOT NULL),
              '[]'::json
            ) as tags
          FROM pages p
          LEFT JOIN page_categories pc ON p.id = pc.page_id
          LEFT JOIN categories c ON pc.category_id = c.id
          LEFT JOIN page_tags pt ON p.id = pt.page_id
          LEFT JOIN tags t ON pt.tag_id = t.id
          WHERE p.slug = ${id} AND p.status = 'published'
          GROUP BY p.id
        `
    
    const pageResult = await pageQuery
    
    if (pageResult.length === 0) {
      return setCorsHeaders(errorResponse('Page not found', 404), origin)
    }
    
    const page = mapPageFromDB(pageResult[0] as any)
    
    await setCachedData(cacheKey, page, 3600)
    
    return setCorsHeaders(successResponse(page, false), origin)
  } catch (error) {
    console.error('Error fetching page:', error)
    return setCorsHeaders(errorResponse('Failed to fetch page'), origin)
  }
}
