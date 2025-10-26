import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getCachedData, setCachedData } from '@/lib/cache'
import { verifyApiToken, extractBearerToken } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse } from '@/lib/response'
import { mapPostsFromDB, MappedPost } from '@/lib/post-mapper'
import { checkRateLimit } from '@/lib/rate-limit'
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
    
    const rateLimitResult = await checkRateLimit(`api_token:${validToken.id}`)
    if (!rateLimitResult.success) {
      return setCorsHeaders(
        errorResponse('Rate limit exceeded. Please try again later.', 429),
        origin
      )
    }
    
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    
    const offset = (page - 1) * limit
    
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    const cacheKey = `api:v1:tags:${isUUID ? 'id' : 'slug'}:${id}:${page}:${limit}`
    
    const cachedData = await getCachedData(cacheKey)
    if (cachedData) {
      return setCorsHeaders(successResponse(cachedData, true), origin)
    }
    
    const tag = await sql`
      SELECT * FROM tags
      WHERE ${isUUID ? sql`id = ${id}` : sql`slug = ${id}`}
    `
    
    if (!tag || tag.length === 0) {
      return setCorsHeaders(notFoundResponse('Tag not found'), origin)
    }
    
    const countResult = await sql`
      SELECT COUNT(*)::int as count FROM post_tags WHERE tag_id = ${tag[0].id}
    `
    const count = countResult[0].count
    
    const postTags = await sql`
      SELECT post_id FROM post_tags WHERE tag_id = ${tag[0].id}
    `
    
    const postIds = (postTags || []).map((pt: any) => pt.post_id)
    
    let postsData: MappedPost[] = []
    if (postIds.length > 0) {
      const posts = await sql`
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
        WHERE p.id = ANY(${postIds}) AND p.status = 'published'
        GROUP BY p.id
        ORDER BY p.publish_date DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      
      postsData = mapPostsFromDB((posts || []) as any)
    }
    
    const totalPages = Math.ceil(count / limit)
    
    const responseData = {
      tag: {
        id: tag[0].id,
        name: tag[0].name,
        slug: tag[0].slug,
        postCount: count,
        createdAt: tag[0].created_at,
        updatedAt: tag[0].updated_at,
      },
      posts: postsData,
      pagination: {
        page,
        limit,
        total: count,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    }
    
    await setCachedData(cacheKey, responseData, 3600)
    
    return setCorsHeaders(successResponse(responseData, false), origin)
  } catch (error) {
    console.error('Error fetching tag:', error)
    return setCorsHeaders(errorResponse('Failed to fetch tag'), origin)
  }
}
