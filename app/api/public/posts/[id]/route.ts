import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getCachedData, setCachedData } from '@/lib/cache'
import { verifyApiToken, extractBearerToken } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse } from '@/lib/response'
import { mapPostFromDB } from '@/lib/post-mapper'
import { setCorsHeaders, handleCorsPreflightRequest } from '@/lib/cors'

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  return handleCorsPreflightRequest(origin)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const origin = request.headers.get('origin')
  
  try {
    const token = extractBearerToken(request)
    
    const validToken = await verifyApiToken(token || '')
    
    if (!validToken) {
      return setCorsHeaders(unauthorizedResponse('Invalid or expired API token'), origin)
    }
    
    const { id } = await params
    
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    const cacheKey = `api:public:posts:${isUUID ? 'id' : 'slug'}:${id}`
    
    const cachedPost = await getCachedData(cacheKey)
    if (cachedPost) {
      return setCorsHeaders(successResponse(cachedPost, true), origin)
    }
    
    const post = await sql`
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
      FROM posts p
      LEFT JOIN post_categories pc ON p.id = pc.post_id
      LEFT JOIN categories c ON pc.category_id = c.id
      LEFT JOIN post_tags pt ON p.id = pt.post_id
      LEFT JOIN tags t ON pt.tag_id = t.id
      WHERE p.status = 'published' AND ${isUUID ? sql`p.id = ${id}` : sql`p.slug = ${id}`}
      GROUP BY p.id
    `
    
    if (!post || post.length === 0) {
      return setCorsHeaders(notFoundResponse('Post not found'), origin)
    }
    
    const postWithRelations = mapPostFromDB(post[0] as any)
    
    await setCachedData(cacheKey, postWithRelations, 3600)
    
    return setCorsHeaders(successResponse(postWithRelations, false), origin)
  } catch (error) {
    console.error('Error fetching post:', error)
    return setCorsHeaders(errorResponse('Failed to fetch post'), origin)
  }
}
